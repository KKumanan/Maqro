const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

// Configuration
const config = {
  exportInterval: 5 * 60 * 1000, // Export every 5 minutes
  maxEventsPerFile: 1000, // Maximum events per file
  exportsDir: path.join(__dirname, 'exports')
};

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for testing
let events = [];

// Automated export function
async function exportEvents() {
  try {
    console.log('\n=== Starting Export Process ===');
    console.log(`Current events count: ${events.length}`);
    
    if (events.length === 0) {
      console.log('No events to export');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `events_${timestamp}.json`;
    const filepath = path.join(config.exportsDir, filename);

    console.log(`Creating exports directory: ${config.exportsDir}`);
    // Create exports directory if it doesn't exist
    await fs.mkdir(config.exportsDir, { recursive: true });

    console.log(`Writing events to file: ${filepath}`);
    // Write events to file
    await fs.writeFile(filepath, JSON.stringify(events, null, 2));
    
    console.log(`\n=== Export Complete ===`);
    console.log(`Exported ${events.length} events to ${filename}`);
    console.log(`File location: ${filepath}\n`);

    // Clear events after successful export
    const exportedCount = events.length;
    events = [];
    console.log(`Cleared ${exportedCount} events from memory\n`);

    // Verify file was created
    try {
      const stats = await fs.stat(filepath);
      console.log(`Verified file exists: ${filepath}`);
      console.log(`File size: ${stats.size} bytes\n`);
    } catch (error) {
      console.error('Error verifying file:', error);
    }
  } catch (error) {
    console.error('\n=== Export Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    console.error('Current directory:', __dirname);
    console.error('Exports directory:', config.exportsDir);
    console.error('===================\n');
  }
}

// Start automated export
console.log('Setting up automated export...');
setInterval(exportEvents, config.exportInterval);

// API endpoint to receive events
app.post('/api/events', (req, res) => {
  try {
    const { events: newEvents } = req.body;
    if (!Array.isArray(newEvents)) {
      console.error('Received invalid events format:', req.body);
      return res.status(400).json({ success: false, error: 'Invalid events format' });
    }

    events.push(...newEvents);
    console.log('\n=== New Events Received ===');
    console.log(`Received ${newEvents.length} new events`);
    console.log(`Total events in storage: ${events.length}`);
    
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

    // Export if we've reached the maximum events per file
    if (events.length >= config.maxEventsPerFile) {
      console.log('\n=== Maximum Events Reached ===');
      console.log(`Current count: ${events.length}`);
      console.log(`Maximum allowed: ${config.maxEventsPerFile}`);
      console.log('Triggering export...\n');
      exportEvents();
    }

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

// Manual export endpoint
app.post('/api/export', async (req, res) => {
  try {
    console.log('\n=== Manual Export Requested ===');
    await exportEvents();
    res.json({ 
      success: true, 
      message: 'Events exported successfully',
      count: events.length
    });
  } catch (error) {
    console.error('Error in manual export:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`\n=== Server Started ===`);
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Events will be automatically exported every ${config.exportInterval / 60000} minutes`);
  console.log(`Maximum events per file: ${config.maxEventsPerFile}`);
  console.log(`Exports directory: ${config.exportsDir}`);
  console.log('Ready to receive events...\n');
}); 