import { UserEvent, EventType, ClickEvent, ScrollEvent, FocusEvent, PageViewEvent, Message } from './types';

/**
 * Content script - runs in the context of web pages
 * Responsible for tracking user interactions and sending them to the background script
 */

// Configuration for event collection
const config = {
  scrollThrottle: 100, // ms
  lastScrollTime: 0,
  isCollecting: true,
  pageLoadTime: Date.now()
};

// Helper to get element selector
function getElementSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.classList.length > 0) {
    return `.${Array.from(element.classList).join('.')}`;
  }
  
  if (element.getAttribute('href')) {
    return `[href*="${element.getAttribute('href')}"]`;
  }
  
  return element.tagName.toLowerCase();
}

// Helper to create event object
function createEvent<T extends UserEvent>(event: T): T {
  return {
    ...event,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
}

// Helper to send event to background script
function sendEvent(event: UserEvent) {
  if (!config.isCollecting) {
    console.log('Maqro: Event collection is paused');
    return;
  }
  
  console.log('Maqro: Sending event', event);
  chrome.runtime.sendMessage({ type: 'USER_EVENT', event }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Maqro: Error sending event', chrome.runtime.lastError);
    } else {
      console.log('Maqro: Event sent successfully', response);
    }
  });
}

// Page view tracking
function trackPageView() {
  console.log('Maqro: Tracking page view');
  const event: PageViewEvent = {
    event_type: EventType.PAGE_VIEW,
    url: window.location.href,
    title: document.title,
    duration: 0,
    timestamp: new Date().toISOString()
  };
  
  sendEvent(event);
  
  // Update duration when page is unloaded
  window.addEventListener('beforeunload', () => {
    const duration = Math.floor((Date.now() - config.pageLoadTime) / 1000);
    event.duration = duration;
    sendEvent(event);
  });
}

// Click event listener
document.addEventListener('click', (e: MouseEvent) => {
  const target = e.target as Element;
  const event: ClickEvent = {
    event_type: EventType.CLICK,
    url: window.location.href,
    selector: getElementSelector(target),
    x: e.clientX,
    y: e.clientY,
    timestamp: new Date().toISOString()
  };
  
  sendEvent(event);
});

// Scroll event listener (throttled)
document.addEventListener('scroll', (e: Event) => {
  const now = Date.now();
  if (now - config.lastScrollTime < config.scrollThrottle) return;
  config.lastScrollTime = now;
  
  const event: ScrollEvent = {
    event_type: EventType.SCROLL,
    url: window.location.href,
    scrollY: window.scrollY,
    timestamp: new Date().toISOString()
  };
  
  sendEvent(event);
});

// Focus/blur listeners
window.addEventListener('focus', () => {
  const event: FocusEvent = {
    event_type: EventType.FOCUS,
    url: window.location.href,
    state: 'focus',
    timestamp: new Date().toISOString()
  };
  
  sendEvent(event);
});

window.addEventListener('blur', () => {
  const event: FocusEvent = {
    event_type: EventType.FOCUS,
    url: window.location.href,
    state: 'blur',
    timestamp: new Date().toISOString()
  };
  
  sendEvent(event);
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message: Message, sender: any, sendResponse: (response: any) => void) => {
  console.log('Maqro: Received message', message);
  
  if (message.type === 'TOGGLE_COLLECTION') {
    config.isCollecting = message.enabled ?? false;
    console.log('Maqro: Collection state changed to', config.isCollecting);
    sendResponse({ success: true });
  }
});

// Initialize
console.log('Maqro: Content script loaded');
trackPageView();
