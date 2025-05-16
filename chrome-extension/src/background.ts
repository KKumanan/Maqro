import { UserEvent, Message } from './types';

// Configuration
const config = {
  apiEndpoint: 'http://localhost:3000/api/events',
  isCollecting: true
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('Maqro: Extension installed');
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
  }
});

// Handle user events
async function handleUserEvent(event: UserEvent) {
  if (!config.isCollecting) {
    console.log('Maqro: Event collection is paused');
    return;
  }

  try {
    console.log('Maqro: Sending event to API', event);
    
    // Send event directly to API
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: [event] }),
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Maqro: Event sent successfully', result);
  } catch (error: any) {
    console.error('Maqro: Error sending event', error);
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
  