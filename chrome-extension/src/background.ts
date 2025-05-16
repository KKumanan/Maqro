import { UserEvent, Message } from './types';

// Configuration
const config = {
  apiEndpoint: 'http://localhost:3000/api/events',
  isCollecting: true
};

// Batching and Storage Configuration
const STORAGE_KEY_EVENTS = 'maqroUserEvents';
const ALARM_NAME_BATCH_SEND = 'maqroBatchSendAlarm';
const BATCH_SEND_INTERVAL_MINUTES = 5; // Send batch every 5 minutes
const STORAGE_LIMIT_THRESHOLD_PERCENT = 0.8; // Send if 80% of storage is used
const STORAGE_QUOTA_BYTES = chrome.storage.local.QUOTA_BYTES || 5 * 1024 * 1024; // 5MB

let isSendingBatch = false; // Flag to prevent concurrent batch sends

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('Maqro: Extension installed/updated. Setting up alarm.');
  // Ensure alarm is set up
  chrome.alarms.get(ALARM_NAME_BATCH_SEND, (existingAlarm) => {
    if (!existingAlarm) {
      chrome.alarms.create(ALARM_NAME_BATCH_SEND, {
        periodInMinutes: BATCH_SEND_INTERVAL_MINUTES,
      });
      console.log('Maqro: Batch send alarm created.');
    } else {
      console.log('Maqro: Batch send alarm already exists.');
    }
  });
});

// Ensure alarm exists on service worker startup (alarms persist but good to check)
chrome.alarms.get(ALARM_NAME_BATCH_SEND, (alarm) => {
    if (!alarm) {
        console.log('Maqro: Alarm not found on startup, creating.');
        chrome.alarms.create(ALARM_NAME_BATCH_SEND, { periodInMinutes: BATCH_SEND_INTERVAL_MINUTES });
    }
});

// Listen for the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME_BATCH_SEND) {
    console.log('Maqro: Batch send alarm triggered.');
    sendBatchToServer();
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('Maqro: Received message', message);
  
  if (message.type === 'USER_EVENT' && message.event) {
    handleUserEvent(message.event);
  } else if (message.type === 'TOGGLE_COLLECTION') {
    config.isCollecting = message.enabled ?? false;
    console.log('Maqro: Collection state changed to', config.isCollecting);
    sendResponse({ success: true });
    if (!config.isCollecting) {
        // If collection is stopped, try to send any pending events
        console.log('Maqro: Collection stopped, attempting to send any pending events.');
        sendBatchToServer();
    }
  }
});

// Store user events locally instead of sending immediately
async function handleUserEvent(event: UserEvent) {
  if (!config.isCollecting) {
    console.log('Maqro: Event collection is paused (handleUserEvent)');
    return;
  }

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_EVENTS);
    const existingEvents: UserEvent[] = result[STORAGE_KEY_EVENTS] || [];
    existingEvents.push(event);
    await chrome.storage.local.set({ [STORAGE_KEY_EVENTS]: existingEvents });
    console.log('Maqro: Event stored locally. Total stored:', existingEvents.length);
    checkStorageUsageAndSend(); // Check if we need to send early
  } catch (error: any) {
    console.error('Maqro: Error storing event locally', error);
  }
}

// Check storage usage and trigger early send if needed
function checkStorageUsageAndSend() {
  chrome.storage.local.getBytesInUse([STORAGE_KEY_EVENTS], (bytesInUse) => {
    if (chrome.runtime.lastError) {
      console.error('Maqro: Error getting bytes in use:', chrome.runtime.lastError.message);
      return;
    }
    console.log(`Maqro: Storage used for events: ${bytesInUse} bytes / ${STORAGE_QUOTA_BYTES} bytes`);
    if (bytesInUse / STORAGE_QUOTA_BYTES > STORAGE_LIMIT_THRESHOLD_PERCENT) {
      console.log('Maqro: Storage limit threshold reached. Triggering early batch send.');
      sendBatchToServer();
    }
  });
}

// Send batched events to the server
async function sendBatchToServer() {
  if (isSendingBatch) {
    console.log('Maqro: Batch send already in progress. Skipping.');
    return;
  }
  isSendingBatch = true;

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_EVENTS);
    const eventsToSend: UserEvent[] = result[STORAGE_KEY_EVENTS] || [];

    if (eventsToSend.length === 0) {
      console.log('Maqro: No events to send.');
      isSendingBatch = false;
      return;
    }

    console.log(`Maqro: Attempting to send batch of ${eventsToSend.length} events.`);
    
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: eventsToSend }),
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status} ${await response.text()}`);
    }

    const responseData = await response.json();
    console.log('Maqro: Event batch sent successfully', responseData);

    // Clear the successfully sent events from storage
    await chrome.storage.local.remove(STORAGE_KEY_EVENTS);
    console.log('Maqro: Local events cleared after successful send.');

  } catch (error: any) {
    console.error('Maqro: Error sending event batch:', error.message, error.stack);
    // Events remain in storage for the next attempt
  } finally {
    isSendingBatch = false;
  }
}

// Handle tab updates to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    console.log('Maqro: Injecting content script into tab', tabId);
    
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    }).then(() => {
      console.log('Maqro: Content script injected successfully');
      // Send current collection state to content script
      chrome.tabs.sendMessage(tabId, { 
        type: 'TOGGLE_COLLECTION', 
        enabled: config.isCollecting 
      });
    }).catch(error => {
      console.error('Maqro: Error injecting content script', error);
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_COLLECTION', enabled: !config.isCollecting });
    config.isCollecting = !config.isCollecting;
  }
});

// Handle idle state
chrome.idle.onStateChanged.addListener((state) => {
  console.log('Maqro: Idle state changed to', state);
  if (state === 'idle') {
    config.isCollecting = false;
  } else if (state === 'active') {
    config.isCollecting = true;
  }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  console.log('Maqro: Window focus changed to', windowId);
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    config.isCollecting = false;
  } else {
    config.isCollecting = true;
  }
});
  