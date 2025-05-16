const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for testing
let events = [];

// API endpoint to receive events
app.post('/api/events', (req, res) => {
  try {
    const { events: newEvents } = req.body;
    events.push(...newEvents);
    console.log('\n=== New Events Received ===');
    newEvents.forEach(event => {
      console.log(`Type: ${event.event_type}`);
      console.log(`URL: ${event.url}`);
      console.log(`Time: ${new Date(event.timestamp).toLocaleString()}`);
      if (event.event_type === 'click') {
        console.log(`Clicked element: ${event.selector}`);
      } else if (event.event_type === 'scroll') {
        console.log(`Scroll position: ${event.scrollY}`);
      }
      console.log('------------------------');
    });
    console.log(`Total events in storage: ${events.length}\n`);
    res.json({ success: true, count: newEvents.length });
  } catch (error) {
    console.error('Error storing events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get all events
app.get('/api/events', (req, res) => {
  console.log(`\n=== Request for all events ===`);
  console.log(`Total events: ${events.length}\n`);
  res.json({ events });
});

// API endpoint to clear events
app.delete('/api/events', (req, res) => {
  console.log('\n=== Clearing all events ===');
  console.log(`Cleared ${events.length} events\n`);
  events = [];
  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log('Ready to receive events...\n');
}); 