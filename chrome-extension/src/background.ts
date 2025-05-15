import { Message } from './messages';
import { UserEvent } from './types';

/**
 * Background script - handles incoming messages and uploads events
 */

console.log('Background script initialized');


class EventStore {
    private static MAX_EVENTS = 1000; 

    // Save events to local storage  
    static async saveEvent(event: UserEvent): Promise<void>{
        try {
            const data = await chrome.storage.local.get('userEvents');
            const events: UserEvent[] = data.userEvents || [];

            // Adding new event into the local storage
            events.push(event);

            // Limit the number of events
            if (events.length > this.MAX_EVENTS) {
                events.splice(0, events.length - this.MAX_EVENTS);
            }

            // Save the updated events
            await chrome.storage.local.set({ userEvents: events});
            console.log(`Event saved: ${event.type}`);
        }catch (error) {
            console.error('Failed to save event:', error);
        }
    }

    // Get all events from local storage
    static async getEvents(): Promise<UserEvent[]> {
        try {
            const data = await chrome.storage.local.get("userEvents");
            return data.userEvents || [];
        } catch {
            console.error("There was an error fetching events from local storage")
            return [];
        }
    }
}


// Handle incoming messages from content scripts or the popup
chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
    if (msg.channel === 'USER_EVENT') {
      EventStore.saveEvent(msg.payload)
        .then(() => sendResponse({ status: 'ok' }))
        .catch(err => sendResponse({ status: 'error', error: err.message }));
      // return true to indicate you’ll call sendResponse asynchronously
      return true;
    }
  });
  