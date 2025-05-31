import { UserEvent } from './types';

// Chrome Extension Conifguration
const CONFIG = {
  serverUrl: 'http://localhost:3000/api/events',
  batchSize: 20, // Send when we have 20+ events
  sendInterval: 60000, // Send every minute
};

// State Management
let isCollecting = true;
let isSending = false;

// Logging
function log(message: string) {
  console.log('Maqro Background:', message);
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'USER_EVENTS':
      if (message.events && Array.isArray(message.events)) {
        handleEvents(message.events);
        sendResponse({ success: true });
      }
      break;
      
    case 'TOGGLE_COLLECTION':
      isCollecting = message.enabled;
      log(`Collection ${isCollecting ? 'enabled' : 'disabled'}`);
      broadcastToTabs({ type: 'TOGGLE_COLLECTION', enabled: isCollecting });
      if (!isCollecting) sendEventsToServer(); // Send remaining events
      sendResponse({ success: true, isCollecting });
      break;
      
    case 'GET_STATE':
      sendResponse({ success: true, isCollecting });
      break;
  }
});

// Store events and trigger send if needed
async function handleEvents(newEvents: UserEvent[]) {
  try {
    log(`Received ${newEvents.length} events`);
    
    // Get existing events
    const result = await chrome.storage.local.get('events');
    const existingEvents: UserEvent[] = result.events || [];
    
    // Add new events
    const allEvents = [...existingEvents, ...newEvents];
    
    // Limit total events to prevent memory issues
    if (allEvents.length > 1000) {
      allEvents.splice(0, allEvents.length - 1000); // Keep only last 1000
      log('Trimmed old events to prevent memory overflow');
    }
    
    // Save back to storage
    await chrome.storage.local.set({ events: allEvents });
    log(`Stored ${allEvents.length} total events`);
    
    // Send if we have enough events
    if (allEvents.length >= CONFIG.batchSize) {
      sendEventsToServer();
    }
  } catch (error) {
    log(`Error handling events: ${error}`);
  }
}

// Send events to server
async function sendEventsToServer() {
  if (isSending) {
    log('Already sending, skipping...');
    return;
  }
  
  isSending = true;
  
  try {
    // Get events from storage
    const result = await chrome.storage.local.get('events');
    const events: UserEvent[] = result.events || [];
    
    if (events.length === 0) {
      log('No events to send');
      return;
    }
    
    log(`Sending ${events.length} events to server`);
    
    // Send to server
    const response = await fetch(CONFIG.serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    
    if (response.ok) {
      // Clear events from storage on success
      await chrome.storage.local.remove('events');
      log(`Successfully sent ${events.length} events`);
    } else {
      throw new Error(`Server responded with ${response.status}`);
    }
  } catch (error) {
    log(`Failed to send events: ${error}`);
  } finally {
    isSending = false;
  }
}

// Broadcast message to all tabs
async function broadcastToTabs(message: any) {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignore connection errors - they're common
        });
      }
    }
  } catch (error) {
    log(`Error broadcasting to tabs: ${error}`);
  }
}

// Inject content script into new tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url?.startsWith('http') && 
      !tab.url.includes('chrome://') &&
      !tab.url.includes('chrome-extension://')) {
    
    // Inject content script
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    }).then(() => {
      log(`Injected content script into tab ${tabId}`);
      
      // Send current collection state
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { 
          type: 'TOGGLE_COLLECTION', 
          enabled: isCollecting 
        }).catch(() => {
          // Ignore errors
        });
      }, 500);
    }).catch(() => {
      // Ignore injection errors
    });
  }
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  log('Extension installed');
  isCollecting = true;
});

chrome.runtime.onStartup.addListener(() => {
  log('Extension started');
  isCollecting = true;
});

// Send events periodically
setInterval(sendEventsToServer, CONFIG.sendInterval);

log('Background script initialized');
  