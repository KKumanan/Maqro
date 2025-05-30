import { UserEvent, Message } from './types';

// ==================== CONFIGURATION ====================

// API Configuration
const API_CONFIG = {
  endpoint: 'http://localhost:3000/api/events',
  timeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
} as const;

// Performance Configuration  
const PERFORMANCE_CONFIG = {
  maxBatchSize: 50, // MAX 50 events per batch to prevent 413 errors
  maxBatchSizeBytes: 100 * 1024, // 100KB max payload
  batchIntervalMinutes: 2, // Send every 2 minutes (reduced from 5)
  maxStoredEvents: 1000, // Prevent infinite accumulation
  storageCleanupThreshold: 0.7, // Clean up at 70%
  keepaliveIntervalMinutes: 1, // Reduced service worker overhead
} as const;

// Storage Keys
const STORAGE_KEYS = {
  events: 'maqroUserEvents',
  stats: 'maqroStats',
} as const;

// Alarm Names
const ALARM_NAMES = {
  batchSend: 'maqroBatchSendAlarm',
  keepalive: 'maqroKeepaliveAlarm',
} as const;

// Feature Flags
const FEATURE_FLAGS = {
  enablePerformanceLogging: false, // Reduce console spam
  enableRetryLogic: true,
  enableChunkedSending: true,
} as const;

// ==================== STATE MANAGEMENT ====================

interface ExtensionState {
  isCollecting: boolean;
  userManuallyPaused: boolean;
  isSendingBatch: boolean;
  lastSendAttempt: number;
  sendFailureCount: number;
  totalEventsSent: number;
  totalEventsDropped: number;
}

const state: ExtensionState = {
  isCollecting: true,
  userManuallyPaused: false,
  isSendingBatch: false,
  lastSendAttempt: 0,
  sendFailureCount: 0,
  totalEventsSent: 0,
  totalEventsDropped: 0,
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Enhanced logging with performance mode toggle
 */
function log(level: 'info' | 'warn' | 'error', message: string, ...args: any[]) {
  const prefix = 'Maqro:';
  if (level === 'error' || FEATURE_FLAGS.enablePerformanceLogging) {
    console[level](prefix, message, ...args);
  }
}

/**
 * Calculate size of events array in bytes
 */
function calculateEventsSizeBytes(events: UserEvent[]): number {
  return new TextEncoder().encode(JSON.stringify(events)).length;
}

/**
 * Split events into chunks that respect size limits
 */
function chunkEvents(events: UserEvent[]): UserEvent[][] {
  const chunks: UserEvent[][] = [];
  let currentChunk: UserEvent[] = [];
  let currentSize = 0;
  
  for (const event of events) {
    const eventSize = calculateEventsSizeBytes([event]);
    
    // If adding this event would exceed limits, start new chunk
    if (currentChunk.length >= PERFORMANCE_CONFIG.maxBatchSize || 
        currentSize + eventSize > PERFORMANCE_CONFIG.maxBatchSizeBytes) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentSize = 0;
      }
    }
    
    currentChunk.push(event);
    currentSize += eventSize;
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// ==================== CORE FUNCTIONS ====================

/**
 * Enhanced batch sending with chunking and retry logic
 */
async function sendBatchToServer(): Promise<void> {
  if (state.isSendingBatch) {
    log('info', 'Batch send already in progress. Skipping.');
    return;
  }
  
  state.isSendingBatch = true;
  state.lastSendAttempt = Date.now();
  
  try {
    // Get events from storage
    const result = await chrome.storage.local.get(STORAGE_KEYS.events);
    const allEvents: UserEvent[] = result[STORAGE_KEYS.events] || [];
    
    if (allEvents.length === 0) {
      log('info', 'No events to send.');
      return;
    }
    
    // Implement chunking to prevent 413 errors
    const chunks = chunkEvents(allEvents);
    log('info', `Sending ${allEvents.length} events in ${chunks.length} chunks`);
    
    let successfulChunks = 0;
    let failedChunks = 0;
    
    // Send each chunk with retry logic
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const success = await sendChunkWithRetry(chunk, i + 1, chunks.length);
      
      if (success) {
        successfulChunks++;
        state.totalEventsSent += chunk.length;
      } else {
        failedChunks++;
        state.totalEventsDropped += chunk.length;
      }
    }
    
    // Only clear storage if all chunks sent successfully
    if (failedChunks === 0) {
      await chrome.storage.local.remove(STORAGE_KEYS.events);
      log('info', `All ${successfulChunks} chunks sent successfully. Storage cleared.`);
      state.sendFailureCount = 0;
    } else {
      log('error', `${failedChunks}/${chunks.length} chunks failed. Keeping events in storage.`);
      state.sendFailureCount++;
    }
    
  } catch (error: any) {
    log('error', 'Error in batch send process:', error);
    state.sendFailureCount++;
  } finally {
    state.isSendingBatch = false;
  }
}

/**
 * Send a single chunk with retry logic
 */
async function sendChunkWithRetry(events: UserEvent[], chunkNum: number, totalChunks: number): Promise<boolean> {
  let retryCount = 0;
  
  while (retryCount < API_CONFIG.maxRetries) {
    try {
      const payload = JSON.stringify({ events });
      
      log('info', `Sending chunk ${chunkNum}/${totalChunks} (${events.length} events, ${payload.length} bytes)`);
      
      const response = await fetch(API_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
        signal: AbortSignal.timeout(API_CONFIG.timeout),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      log('info', `Chunk ${chunkNum}/${totalChunks} sent successfully`);
      return true;
      
    } catch (error: any) {
      retryCount++;
      
      if (error.name === 'AbortError') {
        log('error', `Chunk ${chunkNum} timeout (attempt ${retryCount})`);
      } else if (error.message.includes('413')) {
        log('error', `Chunk ${chunkNum} too large (413 error). This chunk will be dropped.`);
        return false; // Don't retry 413 errors
      } else {
        log('error', `Chunk ${chunkNum} failed (attempt ${retryCount}):`, error.message);
      }
      
      if (retryCount < API_CONFIG.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay * retryCount));
      }
    }
  }
  
  log('error', `Chunk ${chunkNum} failed after ${API_CONFIG.maxRetries} attempts`);
  return false;
}

/**
 * Enhanced event storage with size management
 */
async function handleUserEvent(event: UserEvent): Promise<void> {
  if (!state.isCollecting) {
    return;
  }
  
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.events);
    let events: UserEvent[] = result[STORAGE_KEYS.events] || [];
    
    // Prevent memory bloat - remove oldest events if we hit the limit
    if (events.length >= PERFORMANCE_CONFIG.maxStoredEvents) {
      const eventsToRemove = events.length - PERFORMANCE_CONFIG.maxStoredEvents + 1;
      events = events.slice(eventsToRemove);
      state.totalEventsDropped += eventsToRemove;
      log('warn', `Dropped ${eventsToRemove} old events to prevent memory bloat`);
    }
    
    events.push(event);
    await chrome.storage.local.set({ [STORAGE_KEYS.events]: events });
    
    // Check if we need to send early
    checkStorageAndTriggerSend(events);
    
  } catch (error: any) {
    log('error', 'Error storing event:', error);
  }
}

/**
 * Optimized storage check with better thresholds
 */
function checkStorageAndTriggerSend(events: UserEvent[]): void {
  // Trigger send based on event count or storage usage
  if (events.length >= PERFORMANCE_CONFIG.maxBatchSize) {
    log('info', 'Event count threshold reached. Triggering send.');
    sendBatchToServer();
    return;
  }
  
  // Check storage size
  chrome.storage.local.getBytesInUse([STORAGE_KEYS.events], (bytesInUse) => {
    if (chrome.runtime.lastError) {
      log('error', 'Error checking storage usage:', chrome.runtime.lastError.message);
      return;
    }
    
    const storageQuota = chrome.storage.local.QUOTA_BYTES || 5 * 1024 * 1024;
    const usagePercent = bytesInUse / storageQuota;
    
    if (usagePercent > PERFORMANCE_CONFIG.storageCleanupThreshold) {
      log('info', `Storage threshold reached (${Math.round(usagePercent * 100)}%). Triggering send.`);
      sendBatchToServer();
    }
  });
}

// ==================== MESSAGE HANDLING ====================

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  // Reduce logging noise
  if (FEATURE_FLAGS.enablePerformanceLogging) {
    log('info', 'Received message', message);
  }
  
  switch (message.type) {
    case 'USER_EVENT':
      if (message.event) {
        handleUserEvent(message.event);
        sendResponse({ success: true });
      }
      break;
      
    case 'TOGGLE_COLLECTION':
      if (typeof message.enabled === 'boolean') {
        state.userManuallyPaused = !message.enabled;
        state.isCollecting = message.enabled;
        
        log('info', `Collection ${state.isCollecting ? 'enabled' : 'disabled'} by user`);
        broadcastCollectionStateToAllTabs(state.isCollecting);
        sendResponse({ success: true, isCollecting: state.isCollecting });
        
        // Send pending events when stopping
        if (!state.isCollecting) {
          sendBatchToServer();
        }
      }
      return true;
      
    case 'GET_OPERATIONAL_STATE':
      sendResponse({ 
        success: true, 
        isCollecting: state.isCollecting,
        stats: {
          totalEventsSent: state.totalEventsSent,
          totalEventsDropped: state.totalEventsDropped,
          sendFailureCount: state.sendFailureCount
        }
      });
      return true;
      
    case 'HEALTH_CHECK':
      sendResponse({ success: true, isAlive: true });
      return true;
  }
});

// ==================== TAB MANAGEMENT ====================

/**
 * Optimized tab broadcasting with better error handling
 */
async function broadcastCollectionStateToAllTabs(enabled: boolean): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({
      url: ['http://*/*', 'https://*/*'], 
      status: 'complete'
    });
    
    log('info', `Broadcasting collection state (${enabled}) to ${tabs.length} tabs`);
    
    const sendPromises = tabs
      .filter(tab => tab.id)
      .map(tab => 
        chrome.tabs.sendMessage(tab.id!, { type: 'TOGGLE_COLLECTION', enabled })
          .catch(() => {
            // Silently ignore connection errors - they're expected
          })
      );
    
    await Promise.allSettled(sendPromises);
    
  } catch (error: any) {
    log('error', 'Error broadcasting to tabs:', error);
  }
}

// ==================== INITIALIZATION ====================

/**
 * Set up alarms and initial state
 */
async function initializeExtension(): Promise<void> {
  log('info', 'Initializing Maqro extension...');
  
  // Create alarms
  const alarms = [
    { name: ALARM_NAMES.batchSend, periodInMinutes: PERFORMANCE_CONFIG.batchIntervalMinutes },
    { name: ALARM_NAMES.keepalive, periodInMinutes: PERFORMANCE_CONFIG.keepaliveIntervalMinutes },
  ];
  
  for (const alarm of alarms) {
    const existing = await chrome.alarms.get(alarm.name);
    if (!existing) {
      await chrome.alarms.create(alarm.name, { periodInMinutes: alarm.periodInMinutes });
      log('info', `Created ${alarm.name} alarm`);
    }
  }
  
  // Set initial state
  state.isCollecting = true;
  state.userManuallyPaused = false;
  
  // Broadcast initial state
  await broadcastCollectionStateToAllTabs(state.isCollecting);
  
  log('info', 'Extension initialization complete');
}

// ==================== EVENT LISTENERS ====================

chrome.runtime.onInstalled.addListener(initializeExtension);
chrome.runtime.onStartup.addListener(initializeExtension);

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case ALARM_NAMES.batchSend:
      log('info', 'Batch send alarm triggered');
      sendBatchToServer();
      break;
      
    case ALARM_NAMES.keepalive:
      // Minimal action to keep service worker alive
      if (FEATURE_FLAGS.enablePerformanceLogging) {
        log('info', 'Keepalive alarm triggered');
      }
      break;
  }
});

// Enhanced tab injection with better performance
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url?.startsWith('http') && 
      !tab.url.includes('chrome://') &&
      !tab.url.includes('chrome-extension://')) {
    
    // Delay injection to ensure page is fully loaded
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      }).then(() => {
        log('info', `Content script injected into tab ${tabId}`);
        
        // Give content script more time to initialize before sending state
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { 
            type: 'TOGGLE_COLLECTION', 
            enabled: state.isCollecting 
          }).catch((error) => {
            // Only log if it's not a common connection error
            if (!error.message.includes('Could not establish connection') &&
                !error.message.includes('receiving end does not exist')) {
              log('warn', `Failed to send initial state to tab ${tabId}: ${error.message}`);
            }
          });
        }, 500); // Increased delay to allow content script to fully initialize
      }).catch((error) => {
        // Only log injection errors for pages we should be able to inject into
        if (!error.message.includes('Cannot access') && 
            !error.message.includes('The extensions gallery cannot be scripted')) {
          log('warn', `Content script injection failed for tab ${tabId}: ${error.message}`);
        }
      });
    }, 200); // Initial delay to ensure page is stable
  }
});

// Extension icon click handler
chrome.action.onClicked.addListener(() => {
  const newState = !state.isCollecting;
  state.userManuallyPaused = !newState;
  state.isCollecting = newState;
  
  log('info', `Extension toggled: ${newState ? 'ON' : 'OFF'}`);
  broadcastCollectionStateToAllTabs(state.isCollecting);
  
  if (!state.isCollecting) {
    sendBatchToServer();
  }
});

// Idle state management (simplified)
chrome.idle.onStateChanged.addListener((idleState) => {
  if (!state.userManuallyPaused) {
    const shouldCollect = idleState === 'active';
    if (state.isCollecting !== shouldCollect) {
      state.isCollecting = shouldCollect;
      broadcastCollectionStateToAllTabs(state.isCollecting);
    }
  }
});

// Window focus management (simplified)
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (!state.userManuallyPaused) {
    const shouldCollect = windowId !== chrome.windows.WINDOW_ID_NONE;
    if (state.isCollecting !== shouldCollect) {
      state.isCollecting = shouldCollect;
      broadcastCollectionStateToAllTabs(state.isCollecting);
    }
  }
});
  