from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Path to the keylogger data file
KEYLOGGER_DATA_PATH = "../data-collection/input_events_backup.jsonl"

def read_keylogger_data():
    """Read and parse the keylogger data file"""
    if not os.path.exists(KEYLOGGER_DATA_PATH):
        return []
    
    events = []
    with open(KEYLOGGER_DATA_PATH, 'r') as f:
        for line in f:
            try:
                event = json.loads(line.strip())
                events.append(event)
            except json.JSONDecodeError:
                continue
    return events

@app.route('/api/events', methods=['GET'])
def get_events():
    """Get all keylogger events"""
    events = read_keylogger_data()
    return jsonify(events)

@app.route('/api/events/recent', methods=['GET'])
def get_recent_events():
    """Get recent keylogger events with optional limit"""
    limit = request.args.get('limit', default=50, type=int)
    events = read_keylogger_data()
    return jsonify(events[-limit:])

@app.route('/api/events/filter', methods=['GET'])
def filter_events():
    """Filter events by type (key_press or mouse_click)"""
    event_type = request.args.get('type')
    if not event_type:
        return jsonify({"error": "Type parameter is required"}), 400
    
    events = read_keylogger_data()
    filtered_events = [event for event in events if event.get('event_type') == event_type]
    return jsonify(filtered_events)

@app.route('/api/events/stats', methods=['GET'])
def get_stats():
    """Get statistics about the keylogger events"""
    events = read_keylogger_data()
    
    stats = {
        "total_events": len(events),
        "key_presses": len([e for e in events if e.get('event_type') == 'key_press']),
        "mouse_clicks": len([e for e in events if e.get('event_type') == 'mouse_click']),
        "unique_keys": len(set(e.get('key_or_button') for e in events if e.get('event_type') == 'key_press')),
        "unique_apps": len(set(e.get('active_app') for e in events))
    }
    
    return jsonify(stats)

if __name__ == '__main__':
    app.run(debug=True, port=5000) 