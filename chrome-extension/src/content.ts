import { UserEvent, EventType, ClickEvent, ScrollEvent, FocusEvent, PageViewEvent, Message } from './types';


// ==================== INITIALIZATION GUARD ====================

// Prevent multiple script injections
if (window.maqroContentScriptLoaded) {
  throw new Error('Maqro content script already loaded');
}
window.maqroContentScriptLoaded = true;

// ==================== CONFIGURATION ====================

const PERFORMANCE_CONFIG = {
  // Increased throttling to reduce performance impact
  scrollThrottleMs: 500, // Reduced from 100ms
  resizeThrottleMs: 1000,
  
  // Sampling rates to reduce data volume
  scrollSampleRate: 0.1, // Only capture 10% of scroll events
  clickSampleRate: 1.0,   // Capture all clicks
  
  // Event batching
  localBatchSize: 10, // Batch events locally before sending
  maxRetries: 3,
  retryDelay: 1000,
  
  // Performance monitoring
  enablePerformanceLogging: false,
  
  // Context validation
  contextCheckInterval: 5000, // Check context every 5 seconds
  initializationTimeout: 10000, // Wait max 10 seconds for initialization
} as const;

// ==================== STATE MANAGEMENT ====================

interface ContentState {
  isCollecting: boolean;
  isHealthy: boolean;
  isInitialized: boolean;
  pageLoadTime: number;
  lastScrollTime: number;
  eventsSent: number;
  eventsDropped: number;
  connectionFailures: number;
  localEventQueue: UserEvent[];
  lastContextCheck: number;
}

const state: ContentState = {
  isCollecting: true,
  isHealthy: false,
  isInitialized: false,
  pageLoadTime: Date.now(),
  lastScrollTime: 0,
  eventsSent: 0,
  eventsDropped: 0,
  connectionFailures: 0,
  localEventQueue: [],
  lastContextCheck: 0,
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Enhanced logging with performance mode
 */
function log(level: 'info' | 'warn' | 'error', message: string, ...args: any[]) {
  if (level === 'error' || PERFORMANCE_CONFIG.enablePerformanceLogging) {
    console[level]('Maqro:', message, ...args);
  }
}

/**
 * Check if extension context is valid
 */
function isContextValid(): boolean {
  try {
    return !!(chrome?.runtime?.id);
  } catch (error) {
    return false;
  }
}

/**
 * Sampling function to reduce event volume
 */
function shouldSampleEvent(eventType: EventType): boolean {
  switch (eventType) {
    case EventType.SCROLL:
      return Math.random() < PERFORMANCE_CONFIG.scrollSampleRate;
    case EventType.CLICK:
      return Math.random() < PERFORMANCE_CONFIG.clickSampleRate;
    default:
      return true;
  }
}

/**
 * Optimized element selector with caching
 */
const selectorCache = new WeakMap<Element, string>();

function getElementSelector(element: Element): string {
  // Check cache first
  if (selectorCache.has(element)) {
    return selectorCache.get(element)!;
  }
  
  let selector: string;
  
  // Priority order for selector generation
  if (element.id) {
    selector = `#${element.id}`;
  } else if (element.classList.length > 0) {
    // Limit to first 3 classes to avoid overly long selectors
    const classes = Array.from(element.classList).slice(0, 3);
    selector = `.${classes.join('.')}`;
  } else if (element.getAttribute('data-testid')) {
    selector = `[data-testid="${element.getAttribute('data-testid')}"]`;
  } else if (element.getAttribute('href')) {
    const href = element.getAttribute('href')!;
    selector = `[href*="${href.substring(0, 20)}"]`; // Limit href length
  } else {
    selector = element.tagName.toLowerCase();
  }
  
  // Cache the result
  selectorCache.set(element, selector);
  return selector;
}

// ==================== EVENT HANDLING ====================

/**
 * Enhanced event sending with local queueing and batching
 */
function queueEvent(event: UserEvent): void {
  // Enhanced validation before queueing
  if (!state.isInitialized || !state.isCollecting || !state.isHealthy) {
    state.eventsDropped++;
    if (PERFORMANCE_CONFIG.enablePerformanceLogging) {
      log('warn', `Event dropped - initialized: ${state.isInitialized}, collecting: ${state.isCollecting}, healthy: ${state.isHealthy}`);
    }
    return;
  }
  
  // Quick context check before queueing
  if (!isContextValid()) {
    state.isHealthy = false;
    state.eventsDropped++;
    log('warn', 'Context invalid, dropping event');
    return;
  }
  
  // Add to local queue
  state.localEventQueue.push(event);
  
  // Send batch when queue is full
  if (state.localEventQueue.length >= PERFORMANCE_CONFIG.localBatchSize) {
    flushEventQueue();
  }
}

/**
 * Flush local event queue to background script
 */
function flushEventQueue(): void {
  if (state.localEventQueue.length === 0 || !state.isHealthy || !state.isInitialized) {
    return;
  }
  
  const eventsToSend = [...state.localEventQueue];
  state.localEventQueue = [];
  
  sendEventsWithRetry(eventsToSend);
}

/**
 * Send events with retry logic and enhanced error handling
 */
async function sendEventsWithRetry(events: UserEvent[], retryCount = 0): Promise<void> {
  // Enhanced context validation
  if (!isContextValid()) {
    log('warn', 'Extension context invalidated, dropping events');
    state.eventsDropped += events.length;
    state.isHealthy = false;
    state.isInitialized = false;
    return;
  }
  
  try {
    // Send events one by one with individual error handling
    for (const event of events) {
      await sendSingleEvent(event);
    }
    
    state.eventsSent += events.length;
    state.connectionFailures = 0; // Reset on success
    
  } catch (error: any) {
    if (retryCount < PERFORMANCE_CONFIG.maxRetries) {
      log('warn', `Retry ${retryCount + 1} for ${events.length} events:`, error.message);
      
      // Wait before retry with exponential backoff
      setTimeout(() => {
        sendEventsWithRetry(events, retryCount + 1);
      }, PERFORMANCE_CONFIG.retryDelay * (retryCount + 1));
    } else {
      log('error', `Failed to send ${events.length} events after ${PERFORMANCE_CONFIG.maxRetries} retries`);
      state.eventsDropped += events.length;
    }
  }
}

/**
 * Send a single event with enhanced error handling
 */
function sendSingleEvent(event: UserEvent): Promise<void> {
  return new Promise((resolve, reject) => {
    // Final context check before sending
    if (!isContextValid()) {
      reject(new Error('Context invalidated before send'));
      return;
    }
    
    try {
      chrome.runtime.sendMessage({ type: 'USER_EVENT', event }, (response) => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError.message || 'Unknown error';
          
          if (error.includes('Extension context invalidated') || 
              error.includes('message port closed') ||
              error.includes('receiving end does not exist') ||
              error.includes('Could not establish connection')) {
            state.isHealthy = false;
            state.isInitialized = false;
            state.connectionFailures++;
            reject(new Error('Connection lost: ' + error));
          } else {
            reject(new Error(error));
          }
        } else {
          resolve();
        }
      });
    } catch (error: any) {
      reject(new Error('Send exception: ' + error.message));
    }
  });
}

// ==================== EVENT TRACKING ====================

/**
 * Optimized page view tracking
 */
function trackPageView(): void {
  if (!state.isInitialized || !state.isHealthy) {
    log('warn', 'Skipping page view tracking - not ready');
    return;
  }
  
  const event: PageViewEvent = {
    event_type: EventType.PAGE_VIEW,
    url: window.location.href,
    title: document.title,
    duration: 0,
    timestamp: new Date().toISOString()
  };
  
  queueEvent(event);
  
  // Track page duration on unload
  const updateDuration = () => {
    if (state.isInitialized && state.isHealthy) {
      event.duration = Math.floor((Date.now() - state.pageLoadTime) / 1000);
      queueEvent(event);
      flushEventQueue(); // Ensure events are sent before page unloads
    }
  };
  
  // Use multiple unload events for better coverage
  window.addEventListener('beforeunload', updateDuration);
  window.addEventListener('pagehide', updateDuration);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      updateDuration();
    }
  });
}

// ==================== EVENT LISTENERS ====================

// Optimized click tracking with enhanced validation
document.addEventListener('click', (e: MouseEvent) => {
  // Early validation to prevent context errors
  if (!state.isInitialized || !state.isHealthy || !state.isCollecting) {
    return;
  }
  
  if (!shouldSampleEvent(EventType.CLICK)) return;
  
  // Quick context check before processing
  if (!isContextValid()) {
    state.isHealthy = false;
    return;
  }
  
  const target = e.target as Element;
  const event: ClickEvent = {
    event_type: EventType.CLICK,
    url: window.location.href,
    selector: getElementSelector(target),
    x: e.clientX,
    y: e.clientY,
    timestamp: new Date().toISOString()
  };
  
  queueEvent(event);
}, { passive: true }); // Use passive listener for better performance

// Highly optimized scroll tracking with adaptive throttling
let scrollTimeoutId: number | null = null;

document.addEventListener('scroll', () => {
  if (!state.isInitialized || !state.isHealthy || !shouldSampleEvent(EventType.SCROLL)) return;
  
  const now = Date.now();
  if (now - state.lastScrollTime < PERFORMANCE_CONFIG.scrollThrottleMs) return;
  
  state.lastScrollTime = now;
  
  // Use requestAnimationFrame to avoid blocking scroll performance
  if (scrollTimeoutId) {
    cancelAnimationFrame(scrollTimeoutId);
  }
  
  scrollTimeoutId = requestAnimationFrame(() => {
    if (state.isInitialized && state.isHealthy && isContextValid()) {
      const event: ScrollEvent = {
        event_type: EventType.SCROLL,
        url: window.location.href,
        scrollY: window.scrollY,
        timestamp: new Date().toISOString()
      };
      
      queueEvent(event);
    }
  });
}, { passive: true });

// Optimized focus tracking
window.addEventListener('focus', () => {
  if (!state.isInitialized || !state.isHealthy) return;
  
  const event: FocusEvent = {
    event_type: EventType.FOCUS,
    url: window.location.href,
    state: 'focus',
    timestamp: new Date().toISOString()
  };
  
  queueEvent(event);
}, { passive: true });

window.addEventListener('blur', () => {
  if (!state.isInitialized || !state.isHealthy) return;
  
  const event: FocusEvent = {
    event_type: EventType.FOCUS,
    url: window.location.href,
    state: 'blur',
    timestamp: new Date().toISOString()
  };
  
  queueEvent(event);
  flushEventQueue(); // Flush on blur to ensure data isn't lost
}, { passive: true });

// ==================== MESSAGE HANDLING ====================

chrome.runtime.onMessage.addListener((message: Message, sender: any, sendResponse: (response: any) => void) => {
  if (message.type === 'TOGGLE_COLLECTION') {
    state.isCollecting = message.enabled ?? false;
    log('info', `Collection ${state.isCollecting ? 'enabled' : 'disabled'}`);
    
    if (!state.isCollecting) {
      flushEventQueue(); // Flush remaining events when stopping
    }
    
    sendResponse({ success: true });
    return true;
  }
});

// ==================== HEALTH MANAGEMENT ====================

/**
 * Enhanced health check with recovery logic
 */
async function performHealthCheck(): Promise<boolean> {
  if (!isContextValid()) {
    state.isHealthy = false;
    state.isInitialized = false;
    return false;
  }
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      state.isHealthy = false;
      resolve(false);
    }, 5000); // 5 second timeout
    
    try {
      chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' }, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          state.isHealthy = false;
          log('warn', 'Health check failed:', chrome.runtime.lastError.message);
          resolve(false);
        } else {
          state.isHealthy = true;
          state.lastContextCheck = Date.now();
          resolve(true);
        }
      });
    } catch (error: any) {
      clearTimeout(timeout);
      state.isHealthy = false;
      log('error', 'Health check exception:', error.message);
      resolve(false);
    }
  });
}

/**
 * Periodic health monitoring with automatic recovery
 */
function startHealthMonitoring(): void {
  const checkInterval = 30000; // Check every 30 seconds
  
  const healthCheckWorker = async () => {
    // Skip if recently checked
    if (Date.now() - state.lastContextCheck < PERFORMANCE_CONFIG.contextCheckInterval) {
      return;
    }
    
    if (!state.isHealthy && state.connectionFailures > 2) {
      log('info', 'Attempting health check recovery...');
      
      const isHealthy = await performHealthCheck();
      if (isHealthy) {
        log('info', 'Health check recovery successful');
        state.connectionFailures = 0;
        state.isInitialized = true;
      }
    } else {
      // Periodic validation even when healthy
      await performHealthCheck();
    }
  };
  
  setInterval(healthCheckWorker, checkInterval);
  
  // Also check on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(healthCheckWorker, 1000); // Delay to allow context to stabilize
    }
  });
}

// ==================== INITIALIZATION ====================

/**
 * Initialize content script with robust startup
 */
async function initializeContentScript(): Promise<void> {
  log('info', 'Maqro content script initializing...');
  
  // Wait a moment to ensure extension context is stable
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Perform initial health check with timeout
  const initTimeout = setTimeout(() => {
    if (!state.isInitialized) {
      log('error', 'Initialization timeout - running in degraded mode');
      state.isHealthy = false;
      state.isInitialized = false;
    }
  }, PERFORMANCE_CONFIG.initializationTimeout);
  
  const isHealthy = await performHealthCheck();
  
  if (isHealthy) {
    state.isInitialized = true;
    clearTimeout(initTimeout);
    
    // Start tracking immediately
    trackPageView();
    log('info', 'Content script initialized successfully');
  } else {
    // Retry initialization after delay
    log('warn', 'Initial health check failed, retrying in 2 seconds...');
    
    setTimeout(async () => {
      const retryHealthy = await performHealthCheck();
      if (retryHealthy) {
        state.isInitialized = true;
        clearTimeout(initTimeout);
        trackPageView();
        log('info', 'Content script initialized on retry');
      } else {
        clearTimeout(initTimeout);
        log('error', 'Content script initialization failed - running in degraded mode');
        state.isInitialized = false;
        state.isHealthy = false;
      }
    }, 2000);
  }
  
  // Start health monitoring
  startHealthMonitoring();
  
  // Flush any remaining events periodically
  setInterval(() => {
    if (state.localEventQueue.length > 0 && state.isHealthy && state.isInitialized) {
      flushEventQueue();
    }
  }, 10000); // Every 10 seconds
}

// ==================== STARTUP ====================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

// Handle page unload to flush remaining events
window.addEventListener('beforeunload', () => {
  if (state.isHealthy && state.isInitialized) {
    flushEventQueue();
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  window.maqroContentScriptLoaded = false;
});
