import { UserEvent, EventType } from './types';

// Simple guard against multiple injections
if (window.maqroContentScriptLoaded) {
  console.warn('Maqro content script already loaded');
} else {
  window.maqroContentScriptLoaded = true;
  initializeTracker();
}

function initializeTracker() {
  const events: UserEvent[] = [];
  let isCollecting = true;

  // Logging
  function log(message: string) {
    console.log('Maqro:', message);
  }

  // CSS selector generation
  function getSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.classList.length > 0) {
      return `.${Array.from(element.classList).slice(0, 2).join('.')}`;
    }
    return element.tagName.toLowerCase();
  }

  // Add event to queue
  function addEvent(event: UserEvent) {
    if (!isCollecting) return;
    
    events.push(event);
    log(`Event captured: ${event.event_type} (${events.length} total)`);
    
    // Send events when we have 10 or more
    if (events.length >= 10) {
      sendEvents();
    }
  }

  // Send events to background script
  function sendEvents() {
    if (events.length === 0) return;
    
    const eventsToSend = [...events];
    events.length = 0; // Clear array
    
    chrome.runtime.sendMessage({ 
      type: 'USER_EVENTS', 
      events: eventsToSend 
    }, (response) => {
      if (chrome.runtime.lastError) {
        log(`Failed to send ${eventsToSend.length} events: ${chrome.runtime.lastError.message}`);
        // Put events back if send failed
        events.unshift(...eventsToSend);
      } else {
        log(`Sent ${eventsToSend.length} events successfully`);
      }
    });
  }

  // Track page view
  function trackPageView() {
    addEvent({
      event_type: EventType.PAGE_VIEW,
      url: window.location.href,
      title: document.title,
      duration: 0,
      timestamp: new Date().toISOString()
    });
  }

  // Click tracking
  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as Element;
    addEvent({
      event_type: EventType.CLICK,
      url: window.location.href,
      selector: getSelector(target),
      x: e.clientX,
      y: e.clientY,
      timestamp: new Date().toISOString()
    });
  });

  // Scroll tracking (throttled)
  let lastScrollTime = 0;
  document.addEventListener('scroll', () => {
    const now = Date.now();
    if (now - lastScrollTime < 1000) return; // Throttle to 1 second
    lastScrollTime = now;
    
    addEvent({
      event_type: EventType.SCROLL,
      url: window.location.href,
      scrollY: window.scrollY,
      timestamp: new Date().toISOString()
    });
  });

  // Focus tracking
  window.addEventListener('focus', () => {
    addEvent({
      event_type: EventType.FOCUS,
      url: window.location.href,
      state: 'focus',
      timestamp: new Date().toISOString()
    });
  });

  window.addEventListener('blur', () => {
    addEvent({
      event_type: EventType.FOCUS,
      url: window.location.href,
      state: 'blur',
      timestamp: new Date().toISOString()
    });
    sendEvents(); // Send immediately on blur
  });

  // Listen for collection toggle
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_COLLECTION') {
      isCollecting = message.enabled;
      log(`Collection ${isCollecting ? 'enabled' : 'disabled'}`);
      if (!isCollecting) sendEvents(); // Send remaining events when stopping
      sendResponse({ success: true });
    }
  });

  // Send events periodically and on page unload
  setInterval(sendEvents, 30000); // Every 30 seconds
  window.addEventListener('beforeunload', sendEvents);

  // Start tracking
  trackPageView();
  log('Event tracking initialized');
}
