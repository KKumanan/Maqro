#!/usr/bin/env python3
import json
import uuid
import threading
import time
import subprocess
from datetime import datetime
from collections import deque

from pynput import keyboard, mouse
from pynput.mouse import Controller as MouseController
from AppKit import NSWorkspace

# ——— CONFIG ———
def get_log_filename(base_name):
    """Generate filename with current date."""
    date_str = datetime.now().strftime("%Y-%m-%d")
    return f"{date_str}_{base_name}"

USAGE_LOG_FILE       = get_log_filename("usage_log.jsonl")
RECENT_APPS_FILE     = get_log_filename("recent_apps.jsonl")
OPEN_APPS_FILE       = get_log_filename("open_apps.jsonl")
SNAPSHOT_INTERVAL    = 10.0   # seconds for open-apps snapshot
MAX_RECENT_APPS      = 5

# ——— STATE ———
recent_apps      = deque(maxlen=MAX_RECENT_APPS)
pressed_keys     = set()
mouse_controller = MouseController()
last_recent_apps_state = []  # Keep track of last written state
last_active_app = None  # Track last active app to avoid unnecessary updates

# Special keys we want to track
SPECIAL_KEYS = {
    'cmd', 'shift', 'alt', 'ctrl', 'tab', 'esc', 'f1', 'f2', 'f3', 'f4', 'f5', 
    'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'f13', 'f14', 'f15', 'f16', 
    'f17', 'f18', 'f19', 'f20'
}

def is_special_key(key):
    """Check if a key is one we want to track."""
    key_str = str(key).lower()
    # Remove 'Key.' prefix if present
    if key_str.startswith('key.'):
        key_str = key_str[4:]
    return key_str in SPECIAL_KEYS

def get_key_combination():
    """Get the current combination of pressed special keys."""
    combo = []
    for key in pressed_keys:
        if is_special_key(key):
            key_str = str(key).lower()
            if key_str.startswith('key.'):
                key_str = key_str[4:]
            combo.append(key_str)
    return sorted(combo)  # Sort for consistent ordering

# ——— UTILITIES ———
def now_iso():
    """Get current timestamp in ISO format with microseconds."""
    return datetime.now().isoformat(timespec='microseconds')

def get_active_app():
    """Get the name of the currently active application using AppleScript."""
    try:
        script = '''
        tell application "System Events"
            set frontApp to name of first application process whose frontmost is true
        end tell
        '''
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            check=True
        )
        app_name = result.stdout.strip()
        return app_name
    except subprocess.CalledProcessError as e:
        print(f"Error getting active app: {e}")
        return "Unknown"
    except Exception as e:
        print(f"Unexpected error getting active app: {e}")
        return "Unknown"

def running_apps_list():
    """All visible (non-background-only) running apps."""
    try:
        script = '''
        tell application "System Events"
            set visibleApps to {}
            repeat with proc in (processes where background only is false)
                if visible of proc is true then
                    set end of visibleApps to name of proc
                end if
            end repeat
            return visibleApps
        end tell
        '''
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            check=True
        )
        apps = [app.strip() for app in result.stdout.strip().split(", ") if app.strip()]
        print(f"Currently running apps: {apps}")  # Debug logging
        return apps
    except subprocess.CalledProcessError as e:
        print(f"Error getting running apps: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error getting running apps: {e}")
        return []

def get_chrome_url():
    """AppleScript → URL of Chrome's active tab, or None."""
    try:
        script = 'tell application "Google Chrome" to get URL of active tab of front window'
        res = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True, check=True
        )
        return res.stdout.strip()
    except subprocess.CalledProcessError:
        return None

def append_json(event, filename):
    """Append event to JSON file with timestamp."""
    with open(filename, "a") as f:
        f.write(json.dumps(event) + "\n")

# ——— RECENT-APPS LOGGING ———
def update_recent_apps(app_name):
    if not app_name or app_name == "Unknown":
        return  # Skip unknown apps
        
    # maintain deque
    if app_name in recent_apps:
        recent_apps.remove(app_name)
    recent_apps.appendleft(app_name)
    
    # log snapshot of the deque *on every update*
    event = {
        "id":          str(uuid.uuid4()),
        "timestamp":   now_iso(),
        "event_type":  "recent_apps_update",
        "recent_apps": list(recent_apps)
    }
    append_json(event, RECENT_APPS_FILE)

# ——— OPEN-APPS SNAPSHOT THREAD ———
def snapshot_open_apps():
    while True:
        apps = running_apps_list()
        event = {
            "id":          str(uuid.uuid4()),
            "timestamp":   now_iso(),
            "event_type":  "open_apps_snapshot",
            "open_apps":   apps
        }
        append_json(event, OPEN_APPS_FILE)
        time.sleep(SNAPSHOT_INTERVAL)

# ——— USAGE EVENT LOGGING ———
def log_usage(event):
    # include Chrome URL if relevant
    if event.get("active_app") == "Google Chrome":
        url = get_chrome_url()
        if url:
            event["url"] = url
    append_json(event, USAGE_LOG_FILE)

# ——— EVENT HANDLERS ———
def on_key_press(key):
    global last_active_app
    app = get_active_app()
    
    # Only update recent apps if the active app has changed
    if app != last_active_app:
        update_recent_apps(app)
        last_active_app = app
    
    pressed_keys.add(key)
    
    # Only log if this is a special key or if we have special keys pressed
    if is_special_key(key) or any(is_special_key(k) for k in pressed_keys):
        event = {
            "id":          str(uuid.uuid4()),
            "timestamp":   now_iso(),
            "event_type":  "key_press",
            "key":         str(key),
            "modifiers":   get_key_combination(),
            "position":    {"x": mouse_controller.position[0],
                          "y": mouse_controller.position[1]},
            "active_app":  app
        }
        log_usage(event)

def on_key_release(key):
    global last_active_app
    app = get_active_app()
    
    # Only update recent apps if the active app has changed
    if app != last_active_app:
        update_recent_apps(app)
        last_active_app = app
    
    # Only log if this is a special key or if we have special keys pressed
    if is_special_key(key) or any(is_special_key(k) for k in pressed_keys):
        event = {
            "id":          str(uuid.uuid4()),
            "timestamp":   now_iso(),
            "event_type":  "key_release",
            "key":         str(key),
            "modifiers":   get_key_combination(),
            "position":    {"x": mouse_controller.position[0],
                          "y": mouse_controller.position[1]},
            "active_app":  app
        }
        log_usage(event)
    
    pressed_keys.discard(key)

def on_click(x, y, button, pressed):
    global last_active_app
    app = get_active_app()
    
    # Only update recent apps if the active app has changed
    if app != last_active_app:
        update_recent_apps(app)
        last_active_app = app

    event = {
        "id":          str(uuid.uuid4()),
        "timestamp":   now_iso(),
        "event_type":  "mouse_click",
        "button":      str(button),
        "action":      "down" if pressed else "up",
        "position":    {"x": x, "y": y},
        "active_app":  app
    }
    log_usage(event)

# ——— MAIN ———
if __name__ == "__main__":
    # start the 10 s "all open apps" snapshotter
    threading.Thread(target=snapshot_open_apps, daemon=True).start()

    # listen for keys & clicks (no continuous moves)
    with keyboard.Listener(on_press=on_key_press, on_release=on_key_release), \
         mouse.Listener(on_click=on_click):
        print(f"→ usage events → {USAGE_LOG_FILE}")
        print(f"→ recent-apps updates → {RECENT_APPS_FILE}")
        print(f"→ open-apps snapshots → {OPEN_APPS_FILE}")
        threading.Event().wait()
