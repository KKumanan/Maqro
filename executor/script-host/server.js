const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 