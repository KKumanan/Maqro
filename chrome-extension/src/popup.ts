import { UserEvent } from './types';

// Remove local isCollecting state, will get from background
// let isCollecting = true; 
let serverStatus = 'checking';

// Update UI based on collection state from background
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
  if (!eventsDiv) return;
  const eventDiv = document.createElement('div');
  eventDiv.className = 'event';
  
  eventDiv.innerHTML = `
    <div class="event-type">${event.event_type}</div>
    <div class="event-time">${formatTime(event.timestamp)}</div>
    <div class="event-url">${event.url}</div>
  `;
  
  // Prepend to show newest first, but check if only placeholder is present
  if (eventsDiv.firstChild && eventsDiv.firstChild.textContent === 'No events to display.' || eventsDiv.firstChild?.textContent === 'Could not fetch events.') {
    eventsDiv.innerHTML = ''; // Clear placeholder
  }
  eventsDiv.insertBefore(eventDiv, eventsDiv.firstChild);
}

// Check server status
async function checkServerStatus() {
  const serverStatusEl = document.getElementById('serverStatus')!;
  if (!serverStatusEl) return;
  try {
    const response = await fetch('http://localhost:3000/api/events');
    if (response.ok) {
      serverStatus = 'connected';
      serverStatusEl.textContent = 'Server: Connected';
      serverStatusEl.className = 'server-status connected';
    } else {
      throw new Error('Server responded with error');
    }
  } catch (error) {
    serverStatus = 'disconnected';
    serverStatusEl.textContent = 'Server: Disconnected';
    serverStatusEl.className = 'server-status disconnected';
    console.error('Server connection error:', error);
  }
}

// Fetch events from API
async function fetchEvents() {
  const eventsDiv = document.getElementById('events')!;
  if (!eventsDiv) return;

  if (serverStatus !== 'connected') {
    await checkServerStatus();
    if (serverStatus !== 'connected') {
        eventsDiv.textContent = 'Server disconnected. Cannot fetch events.';
        return;
    }
  }

  try {
    const response = await fetch('http://localhost:3000/api/events');
    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${await response.text()}`);
    }
    const data = await response.json();
    
    eventsDiv.innerHTML = ''; // Clear previous events or placeholder
    
    if (data.events && Array.isArray(data.events) && data.events.length > 0) {
        data.events.forEach((event: UserEvent) => addEvent(event));
    } else {
        eventsDiv.textContent = 'No events to display.';
    }
  } catch (error: any) {
    console.error('Error fetching events:', error.message);
    serverStatus = 'disconnected';
    const serverStatusEl = document.getElementById('serverStatus');
    if (serverStatusEl) {
        serverStatusEl.textContent = 'Server: Disconnected';
        serverStatusEl.className = 'server-status disconnected';
    }
    eventsDiv.textContent = 'Could not fetch events.';
  }
}

// Clear events
async function clearEvents() {
  const eventsDiv = document.getElementById('events')!;
  if (!eventsDiv) return;

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
      throw new Error(`Failed to clear events: ${response.status} ${await response.text()}`);
    }
    
    eventsDiv.innerHTML = 'No events to display.'; // Clear displayed events
    console.log('Events cleared from server and UI');
  } catch (error: any) {
    console.error('Error clearing events:', error.message);
    alert('Failed to clear events. Please try again.');
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleCollection')!;
  const clearButton = document.getElementById('clearEvents')!;
  const serverStatusEl = document.getElementById('serverStatus');

  // Set up server status element if it wasn't hardcoded (it is, but good practice if it could be dynamic)
  if (!serverStatusEl) {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'serverStatus';
    statusDiv.className = 'server-status checking';
    statusDiv.textContent = 'Server: Checking...';
    document.body.insertBefore(statusDiv, document.body.firstChild);
  }

  // Get initial collection state from background script
  chrome.runtime.sendMessage({ type: 'GET_OPERATIONAL_STATE' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting initial operational state:', chrome.runtime.lastError.message);
      updateStatus(true); // Fallback UI to 'Collecting'
      return;
    }
    if (response && typeof response.isCollecting === 'boolean') {
      updateStatus(response.isCollecting);
    } else {
      console.error('Invalid response for GET_OPERATIONAL_STATE:', response);
      updateStatus(true); // Fallback
    }
  });

  toggleButton.addEventListener('click', () => {
    // Get the current state displayed in the UI to determine the new desired state
    const currentUIText = toggleButton.textContent || '';
    const newDesiredState = currentUIText === 'Stop Collection'; // If it says Stop, user wants to stop (new state false)
    const intendedState = !newDesiredState; // So if user wants to stop, enabled is false

    // Optimistically update UI
    updateStatus(intendedState);
    
    // Send message to background to change the collection state
    chrome.runtime.sendMessage({ 
      type: 'TOGGLE_COLLECTION', 
      enabled: intendedState 
    }, (bgResponse) => {
      if (chrome.runtime.lastError) {
        console.error('Error toggling collection state:', chrome.runtime.lastError.message);
        // Revert UI if error communication with background
        updateStatus(!intendedState); 
      } else if (bgResponse && bgResponse.success && typeof bgResponse.isCollecting === 'boolean') {
        console.log('Collection state successfully updated by background to:', bgResponse.isCollecting);
        // Ensure UI matches the confirmed state from background, in case it differs from optimistic update
        updateStatus(bgResponse.isCollecting);
      } else {
          console.error('Background failed to confirm toggle or invalid response:', bgResponse);
          updateStatus(!intendedState); // Revert UI
      }
    });
  });
  
  clearButton.addEventListener('click', clearEvents);
  
  checkServerStatus();
  fetchEvents();
  setInterval(fetchEvents, 5000);
});
