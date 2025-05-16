import { UserEvent } from './types';

let isCollecting = true;
let serverStatus = 'checking';

// Update UI based on collection state
function updateStatus(collecting: boolean) {
  const status = document.getElementById('status')!;
  const toggleButton = document.getElementById('toggleCollection')!;
  
  isCollecting = collecting;
  status.textContent = collecting ? 'Collecting events...' : 'Collection paused';
  status.className = `status ${collecting ? 'active' : 'inactive'}`;
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
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:3000/api/events');
    if (response.ok) {
      serverStatus = 'connected';
      document.getElementById('serverStatus')!.textContent = 'Server: Connected';
      document.getElementById('serverStatus')!.className = 'server-status connected';
    } else {
      throw new Error('Server responded with error');
    }
  } catch (error) {
    serverStatus = 'disconnected';
    document.getElementById('serverStatus')!.textContent = 'Server: Disconnected';
    document.getElementById('serverStatus')!.className = 'server-status disconnected';
    console.error('Server connection error:', error);
  }
}

// Fetch events from API
async function fetchEvents() {
  if (serverStatus !== 'connected') {
    await checkServerStatus();
    if (serverStatus !== 'connected') return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/events');
    const data = await response.json();
    
    const eventsDiv = document.getElementById('events')!;
    eventsDiv.innerHTML = '';
    
    data.events.forEach((event: UserEvent) => addEvent(event));
  } catch (error) {
    console.error('Error fetching events:', error);
    serverStatus = 'disconnected';
    document.getElementById('serverStatus')!.textContent = 'Server: Disconnected';
    document.getElementById('serverStatus')!.className = 'server-status disconnected';
  }
}

// Clear events
async function clearEvents() {
  if (serverStatus !== 'connected') {
    await checkServerStatus();
    if (serverStatus !== 'connected') {
      alert('Cannot clear events: Server is not connected');
      return;
    }
  }

  try {
    const response = await fetch('http://localhost:3000/api/events', { 
      method: 'DELETE' 
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear events');
    }
    
    const eventsDiv = document.getElementById('events')!;
    eventsDiv.innerHTML = '';
  } catch (error) {
    console.error('Error clearing events:', error);
    alert('Failed to clear events. Please try again.');
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Add server status element
  const statusDiv = document.createElement('div');
  statusDiv.id = 'serverStatus';
  statusDiv.className = 'server-status checking';
  statusDiv.textContent = 'Server: Checking...';
  document.body.insertBefore(statusDiv, document.body.firstChild);

  // Set up event listeners
  document.getElementById('toggleCollection')!.addEventListener('click', () => {
    const newState = !isCollecting;
    updateStatus(newState);
    
    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'TOGGLE_COLLECTION', 
          enabled: newState 
        });
      }
    });
  });
  
  document.getElementById('clearEvents')!.addEventListener('click', clearEvents);
  
  // Initial server check and fetch
  checkServerStatus();
  fetchEvents();
  
  // Refresh events every 5 seconds
  setInterval(fetchEvents, 5000);
});
