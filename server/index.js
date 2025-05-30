const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

// Configuration
const config = {
  exportInterval: 5 * 60 * 1000,  // Export every 5 minutes 
  maxEventsPerFile: 1000,         // Maximum events per file 
  maxBatchSize: 50,               // Maximum events per batch 
  exportsDir: path.join(__dirname, 'exports')
};

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for testing
let events = [];
let patterns = []; // Store patterns received from miner

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

// API endpoint to receive patterns from miner
app.post('/api/patterns', (req, res) => {
  try {
    const { patterns: newPatterns } = req.body;
    if (!Array.isArray(newPatterns)) {
      console.error('Received invalid patterns format:', req.body);
      return res.status(400).json({ success: false, error: 'Invalid patterns format' });
    }

    patterns.push(...newPatterns);
    console.log('\n=== New Patterns Received from Miner ===');
    console.log(`Received ${newPatterns.length} new patterns`);
    console.log(`Total patterns in storage: ${patterns.length}`);
    
    newPatterns.forEach((pattern, index) => {
      console.log(`Pattern ${index + 1}:`);
      console.log(`  Type: ${pattern.type || 'unknown'}`);
      console.log(`  Confidence: ${pattern.confidence || 'N/A'}`);
      console.log(`  Description: ${pattern.description || 'No description'}`);
      console.log(`  Created: ${new Date(pattern.timestamp || Date.now()).toLocaleString()}`);
      console.log('------------------------');
    });

    res.json({ 
      success: true, 
      count: newPatterns.length,
      message: 'Patterns received and ready for recommendation'
    });
  } catch (error) {
    console.error('Error storing patterns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get patterns for recommender
app.get('/api/patterns', (req, res) => {
  console.log(`\n=== Request for patterns ===`);
  console.log(`Total patterns: ${patterns.length}\n`);
  res.json({ patterns });
});

// API endpoint to clear patterns
app.delete('/api/patterns', (req, res) => {
  console.log('\n=== Clearing all patterns ===');
  console.log(`Cleared ${patterns.length} patterns\n`);
  patterns = [];
  res.json({ success: true });
});



///////////////////////////////////////////////////////////////////////////
// API endpoint to get macro scripts //////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

const MACROS_FILE = path.join(__dirname, 'saved-macro-list.json');
const MACRO_SCRIPTS_DIR = path.join(__dirname, 'macro-scripts');

// Helper function to read macros
async function readMacros() {
    try {
        const data = await fs.readFile(MACROS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading macros:', error);
        return { macros: [] };
    }
}

// Helper function to write macros
async function writeMacros(macros) {
    try {
        await fs.writeFile(MACROS_FILE, JSON.stringify(macros, null, 2));
    } catch (error) {
        console.error('Error writing macros:', error);
        throw error;
    }
}

// Get all macros
app.get('/api/macros', async (req, res) => {
    try {
        const data = await readMacros();
        res.json(data.macros);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch macros' });
    }
});

// Get macro by ID
app.get('/api/macros/:id', async (req, res) => {
    try {
        const data = await readMacros();
        const macro = data.macros.find(m => m.id === req.params.id);
        if (!macro) {
            return res.status(404).json({ error: 'Macro not found' });
        }
        res.json(macro);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch macro' });
    }
});

// Get macro script by ID
app.get('/api/macro-scripts/:id', async (req, res) => {
    try {
        const scriptPath = path.join(MACRO_SCRIPTS_DIR, `${req.params.id}.js`);
        console.log('Attempting to read script from:', scriptPath);
        
        // Check if file exists first
        try {
            await fs.access(scriptPath);
        } catch (error) {
            console.error('Script file not found:', scriptPath);
            return res.status(404).json({ error: 'Macro script not found', path: scriptPath });
        }

        const scriptContent = await fs.readFile(scriptPath, 'utf8');
        console.log('Successfully read script:', req.params.id);
        
        res.setHeader('Content-Type', 'application/javascript');
        res.send(scriptContent);
    } catch (error) {
        console.error('Error reading macro script:', error);
        res.status(500).json({ 
            error: 'Failed to read macro script',
            details: error.message,
            path: path.join(MACRO_SCRIPTS_DIR, `${req.params.id}.js`)
        });
    }
});

// Create new macro
app.post('/api/macros', async (req, res) => {
    try {
        const data = await readMacros();
        const newMacro = {
            id: `macro_${String(data.macros.length + 1).padStart(3, '0')}`,
            ...req.body,
            date_created: new Date().toISOString(),
            date_modified: new Date().toISOString()
        };
        data.macros.push(newMacro);
        await writeMacros(data);
        res.status(201).json(newMacro);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create macro' });
    }
});

// Update macro
app.put('/api/macros/:id', async (req, res) => {
    try {
        const data = await readMacros();
        const index = data.macros.findIndex(m => m.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Macro not found' });
        }
        data.macros[index] = {
            ...data.macros[index],
            ...req.body,
            date_modified: new Date().toISOString()
        };
        await writeMacros(data);
        res.json(data.macros[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update macro' });
    }
});

// Delete macro
app.delete('/api/macros/:id', async (req, res) => {
    try {
        const data = await readMacros();
        const index = data.macros.findIndex(m => m.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Macro not found' });
        }
        data.macros.splice(index, 1);
        await writeMacros(data);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete macro' });
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