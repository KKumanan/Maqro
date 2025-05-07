#!/usr/bin/env python3
import json
import uuid
import threading
import time
import subprocess
from datetime import datetime

from pynput import keyboard, mouse
from AppKit import NSWorkspace

# ——— CONFIG ———
LOG_FILE = "usage_log.jsonl"
APP_SNAPSHOT_INTERVAL = 10.0  # seconds

# ——— UTILITIES ———
def now_iso():
    return datetime.now().isoformat()

def active_app():
    """Return the name of the frontmost (active) application."""
    ws = NSWorkspace.sharedWorkspace()
    front = ws.frontmostApplication()
    return front.localizedName() or "Unknown"

def running_apps_list():
    """Return list of all visible (non-background-only) running applications."""
    apps = []
    for app in NSWorkspace.sharedWorkspace().runningApplications():
        # activationPolicy 0 = regular, 1 = accessory, 2 = background-only
        if not app.isHidden() and app.activationPolicy() != 2:
            name = app.localizedName()
            if name:
                apps.append(name)
    return apps

def get_chrome_url():
    """Return the URL of the active tab in Google Chrome, or None on error."""
    try:
        script = 'tell application "Google Chrome" to get URL of active tab of front window'
        res = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True, check=True
        )
        return res.stdout.strip()
    except subprocess.CalledProcessError:
        return None

def log_event(event: dict):
    """Append a single JSON object to the log file, adding URL if Chrome."""
    if event.get("active_app") == "Google Chrome":
        url = get_chrome_url()
        if url:
            event["url"] = url
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(event) + "\n")

# ——— APP SNAPSHOT THREAD ———
def snapshot_running_apps():
    while True:
        event = {
            "id": str(uuid.uuid4()),
            "timestamp": now_iso(),
            "event_type": "running_apps_snapshot",
            "running_apps": running_apps_list(),
            "active_app": active_app()
        }
        log_event(event)
        time.sleep(APP_SNAPSHOT_INTERVAL)

# ——— KEYBOARD LISTENER ———
pressed_keys = set()

def on_key_press(key):
    pressed_keys.add(key)
    event = {
        "id": str(uuid.uuid4()),
        "timestamp": now_iso(),
        "event_type": "key_press",
        "key": str(key),
        "modifiers": [str(k) for k in pressed_keys if hasattr(k, 'name')],
        "active_app": active_app()
    }
    log_event(event)

def on_key_release(key):
    event = {
        "id": str(uuid.uuid4()),
        "timestamp": now_iso(),
        "event_type": "key_release",
        "key": str(key),
        "modifiers": [str(k) for k in pressed_keys if hasattr(k, 'name')],
        "active_app": active_app()
    }
    log_event(event)
    pressed_keys.discard(key)

# ——— MOUSE LISTENER ———
def on_click(x, y, button, pressed):
    event = {
        "id": str(uuid.uuid4()),
        "timestamp": now_iso(),
        "event_type": "mouse_click",
        "button": str(button),
        "action": "down" if pressed else "up",
        "position": {"x": x, "y": y},
        "active_app": active_app()
    }
    log_event(event)

def on_move(x, y):
    event = {
        "id": str(uuid.uuid4()),
        "timestamp": now_iso(),
        "event_type": "mouse_move",
        "position": {"x": x, "y": y},
        "active_app": active_app()
    }
    log_event(event)

# ——— MAIN ———
if __name__ == "__main__":
    # Start background thread to snapshot running apps
    threading.Thread(target=snapshot_running_apps, daemon=True).start()

    # Start keyboard and mouse listeners
    with keyboard.Listener(on_press=on_key_press, on_release=on_key_release), \
         mouse.Listener(on_click=on_click, on_move=on_move):
        print(f"Logging to {LOG_FILE}. Press ⌃C to quit.")
        threading.Event().wait()  # keep the script alive
