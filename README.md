# Maqro Chrome Extension

A Chrome extension that collects user interactions to recommend macros for repetitive tasks.

## Features

### Event Collection
The extension collects the following user interactions:
- Page views (with duration tracking)
- Scroll events (throttled to prevent excessive events)
- Click events (with element selectors and coordinates)
- Focus/blur events (window state changes)

### Macro Recommender UI
The extension includes a macro recommender interface that:
- Displays suggested macros based on user interactions
- Allows users to approve or reject macro suggestions
- Shows macro details including steps and frequency
- Integrates with the event collection system

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
   - Automatically exports events to JSON files

4. **Popup UI** (`AppPopup.tsx`)
   - Displays macro recommendations
   - Handles user feedback on macros
   - Shows event collection status
   - Provides extension controls

### Automated Export System
The Node.js server includes an automated export system that:
- Exports events every 5 minutes
- Creates timestamped JSON files in `server/exports/` directory
- Triggers export when event count reaches 1000
- Supports manual export via API endpoint
- Clears events from memory after successful export

Export files are named with timestamps: `events_2024-03-15T10-00-51Z.json`

## Setup

### Chrome Extension
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the extension:
   ```bash
   npm run build
   ```
3. Load the extension in Chrome:
   - Open Chrome Extensions (chrome://extensions/)
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select the `dist` directory

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
- `POST /api/export` - Manually trigger event export

## Testing

### Unit Tests
Run the test suite:
```bash
npm test
```

Tests are written using Jest and cover:
- Component rendering
- Event handling
- State management
- API integration

### Manual Testing
1. Start the Node.js server
2. Load the Chrome extension
3. Visit any webpage
4. Perform actions (click, scroll, etc.)
5. Check server logs for incoming events
6. Verify exports in `server/exports/` directory
7. Test macro recommendations in the popup UI

### Debugging
- Use Chrome DevTools to view extension logs
- Check server console for event reception
- Monitor network tab for API calls
- Check `server/exports/` for exported files
