# Maqro Chrome Extension

A Chrome extension that collects user interactions to recommend macros for repetitive tasks.

## Features

### Event Collection
The extension collects the following user interactions:
- Page views (with duration tracking)
- Scroll events (throttled to prevent excessive events)
- Click events (with element selectors and coordinates)
- Focus/blur events (window state changes)

### Event Format
Events are collected in a standardized JSON format:
```json
{
    "event_type": "page_view",
    "url": "https://example.com",
    "title": "Example Page",
    "timestamp": "2024-03-15T10:00:51Z",
    "duration": 120
}
```

### Architecture
1. **Content Script** (`content.ts`)
   - Runs in the context of web pages
   - Captures user interactions
   - Sends events to background script

2. **Background Script** (`background.ts`)
   - Manages event collection state
   - Forwards events to Node.js server
   - Handles extension lifecycle

3. **Node.js Server** (`server/index.js`)
   - Receives events via HTTP POST
   - Stores events for pattern mining
   - Provides API endpoints for event management

## Setup

### Chrome Extension
1. Build the extension:
   ```bash
   cd chrome-extension
   npm install
   npm run build
   ```
2. Load the extension in Chrome:
   - Open Chrome Extensions (chrome://extensions/)
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select the `chrome-extension` directory - dist

### Node.js Server
1. Start the server:
   ```bash
   cd server
   npm install
   npm start
   ```
2. Server runs on `http://localhost:3000`

## API Endpoints

- `POST /api/events` - Receive events from extension
- `GET /api/events` - Retrieve collected events
- `DELETE /api/events` - Clear collected events

## Development Notes

### Testing
1. Start the Node.js server
2. Load the Chrome extension
3. Visit any webpage
4. Perform actions (click, scroll, etc.)
5. Check server logs for incoming events

### Debugging
- Use Chrome DevTools to view extension logs
- Check server console for event reception
- Monitor network tab for API calls