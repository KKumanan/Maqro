# Keylogger Data API

This is a Flask backend API that provides access to the keylogger data collected by the keylogger.py script.

## Setup

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Run the Flask application:
```bash
python app.py
```

The server will start on http://localhost:5000

## API Endpoints

### Get All Events
- **GET** `/api/events`
- Returns all keylogger events

### Get Recent Events
- **GET** `/api/events/recent`
- Optional query parameter: `limit` (default: 50)
- Returns the most recent events

### Filter Events by Type
- **GET** `/api/events/filter`
- Required query parameter: `type` (either 'key_press' or 'mouse_click')
- Returns events filtered by the specified type

### Get Statistics
- **GET** `/api/events/stats`
- Returns statistics about the keylogger events including:
  - Total number of events
  - Number of key presses
  - Number of mouse clicks
  - Number of unique keys pressed
  - Number of unique applications used

## Example Usage

```bash
# Get all events
curl http://localhost:5000/api/events

# Get recent 10 events
curl http://localhost:5000/api/events/recent?limit=10

# Get only key press events
curl http://localhost:5000/api/events/filter?type=key_press

# Get statistics
curl http://localhost:5000/api/events/stats
``` 