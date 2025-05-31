/// <reference types="chrome"/>

import { UserEvent } from './types';

let isCollecting = true;
let serverConnected = false;

// Logging
function log(message: string) {
  console.log('Maqro Popup:', message);
}

// Update UI status
function updateStatus(collecting: boolean) {
  const statusEl = document.getElementById('status')!;
  const toggleButton = document.getElementById('toggleCollection')!;
  
  statusEl.textContent = collecting ? 'Collecting events...' : 'Collection Paused';
  statusEl.className = `status ${collecting ? 'active' : 'inactive'}`;
  toggleButton.textContent = collecting ? 'Stop Collection' : 'Start Collection';
}

// Format timestamp
function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString();
}

// Add event to UI
function addEvent(event: UserEvent) {
  const eventsDiv = document.getElementById('events')!;
  const eventDiv = document.createElement('div');
  eventDiv.className = 'event';
  
  eventDiv.innerHTML = `
    <div class="event-type">${event.event_type}</div>
    <div class="event-time">${formatTime(event.timestamp)}</div>
    <div class="event-url">${event.url}</div>
  `;
  
  eventsDiv.insertBefore(eventDiv, eventsDiv.firstChild);
}

// Check server status
async function checkServer() {
  const serverStatusEl = document.getElementById('serverStatus')!;
  try {
    const response = await fetch('http://localhost:3000/api/events');
    serverConnected = response.ok;
    serverStatusEl.textContent = serverConnected ? 'Server: Connected' : 'Server: Error';
    serverStatusEl.className = `server-status ${serverConnected ? 'connected' : 'disconnected'}`;
  } catch (error) {
    serverConnected = false;
    serverStatusEl.textContent = 'Server: Disconnected';
    serverStatusEl.className = 'server-status disconnected';
  }
}

// Fetch and display events
async function loadEvents() {
  const eventsDiv = document.getElementById('events')!;
  
  if (!serverConnected) {
    eventsDiv.textContent = 'Server disconnected. Cannot load events.';
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/events');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    eventsDiv.innerHTML = ''; // Clear existing events
    
    if (data.events && data.events.length > 0) {
      data.events.slice(0, 50).forEach((event: UserEvent) => addEvent(event)); // Show only last 50
    } else {
      eventsDiv.textContent = 'No events to display.';
    }
  } catch (error) {
    log(`Failed to load events: ${error}`);
    eventsDiv.textContent = 'Failed to load events.';
  }
}

// Clear all events
async function clearEvents() {
  if (!serverConnected) {
    alert('Cannot clear events: Server is not connected');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/events', { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    document.getElementById('events')!.innerHTML = 'No events to display.';
    log('Events cleared');
  } catch (error) {
    log(`Failed to clear events: ${error}`);
    alert('Failed to clear events. Please try again.');
  }
}

// Toggle collection
function toggleCollection() {
  const newState = !isCollecting;
  
  chrome.runtime.sendMessage({ 
    type: 'TOGGLE_COLLECTION', 
    enabled: newState 
  }, (response) => {
    if (chrome.runtime.lastError) {
      log(`Toggle failed: ${chrome.runtime.lastError.message}`);
      return;
    }
    
    if (response && response.success && typeof response.isCollecting === 'boolean') {
      isCollecting = response.isCollecting;
      updateStatus(isCollecting);
      log(`Collection ${isCollecting ? 'enabled' : 'disabled'}`);
    } else {
      // Fallback: just update with the state we tried to set
      isCollecting = newState;
      updateStatus(isCollecting);
      log(`Collection ${isCollecting ? 'enabled' : 'disabled'} (fallback)`);
    }
  });
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleCollection')!;
  const clearButton = document.getElementById('clearEvents')!;

  // Get initial state from background
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (response && response.success) {
      isCollecting = response.isCollecting;
      updateStatus(isCollecting);
    }
  });

  // Set up event listeners
  toggleButton.addEventListener('click', toggleCollection);
  clearButton.addEventListener('click', clearEvents);
  
  // Initial load
  checkServer().then(() => {
    if (serverConnected) {
      loadEvents();
    }
  });
  
  // Refresh every 30 seconds (reduced from 10)
  setInterval(() => {
    checkServer().then(() => {
      if (serverConnected) {
        loadEvents();
      }
    });
  }, 30000);
});

log('Popup initialized');
