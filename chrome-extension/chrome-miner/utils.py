import json
import itertools
from datetime import datetime, timedelta

def stream_json_events(filepath):
    """
    A generator that yields one JSON object (event) at a time.
    Useful for large files to avoid loading entire file into memory.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        buffer = ""
        # Assumes the file is a JSON array: [ {...}, {...}, ... ]
        # We strip the leading "[" and trailing "]" and commas.
        for line in f:
            buffer += line.strip()
            # If buffer ends with "}," or "}":
            if buffer.endswith("},") or buffer.endswith("}"):
                chunk = buffer.rstrip(",")
                try:
                    ev = json.loads(chunk)
                    yield ev
                except json.JSONDecodeError:
                    # Incomplete object; continue accumulating
                    pass
                buffer = ""

def parse_timestamp(ts_str):
    """
    Convert ISO‐format timestamp to Python datetime.
    If milliseconds are present, pandas can handle it, but here we use datetime.fromisoformat.
    """
    try:
        # Python 3.11+: fromisoformat can parse RFC3339 with 'Z'
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        return datetime.fromisoformat(ts_str)
    except Exception:
        raise ValueError(f"Invalid timestamp format: {ts_str}")

def sessionize_events(event_generator, gap_minutes=5):
    """
    Takes a generator of event‐dicts (must contain 'timestamp' and 'event_type'),
    returns a list of sessions, each a list of event dicts (in chronological order).
    
    Splits into a new session whenever the gap between consecutive timestamps > gap_minutes.
    """
    sessions = []
    current_session = []
    prev_ts = None
    threshold = timedelta(minutes=gap_minutes)

    for ev in event_generator:
        ts = parse_timestamp(ev["timestamp"])
        ev["_parsed_ts"] = ts  # cache parsed datetime
        if prev_ts is None:
            # first event
            current_session = [ev]
            prev_ts = ts
            continue

        if ts - prev_ts > threshold:
            # close current session and start a new one
            sessions.append(current_session)
            current_session = [ev]
        else:
            current_session.append(ev)

        prev_ts = ts

    # append the last session if non‐empty
    if current_session:
        sessions.append(current_session)

    return sessions

def extract_event_sequence(session, encode_fn):
    """
    Given a single session (list of event dicts in chronological order),
    produce a list of “tokens” (encoded events). 
    encode_fn: a callback that accepts an event‐dict and returns a string or integer token.
    """
    return [encode_fn(ev) for ev in session]

def default_encode(ev):
    """
    Basic encoding: map each event to a string token.
    You can expand this to include selectors, URL‐domain hashing, action flags, etc.
    """
    etype = ev.get("event_type", "unknown")
    # If keyboard, include key or modifier info:
    if etype == "keyboard":
        # e.g. "keyboard:Meta" or "keyboard:v"
        return f"kb:{ev.get('key', '?')}"
    if etype == "tab_switch":
        # include action (“activated” vs “removed”) to distinguish
        action = ev.get("action", "")
        return f"tab_{action}"
    if etype == "form_input":
        # group all form_input into one token, or differentiate by inputType
        input_type = ev.get("inputType", "")
        return f"form_{input_type}"
    # default: just use event_type
    return etype
