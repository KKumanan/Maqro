import json
import yaml
import time
import os
import pyautogui
import socket
from flask import Flask, request, jsonify
from uagents import Agent, Context, Protocol
from uagents.setup import fund_agent_if_low
import threading
import sys
import subprocess

app = Flask(__name__)

def load_config():
    with open('config.yaml', 'r') as f:
        return yaml.safe_load(f)

config = load_config()
EXECUTOR_SEED = config['executor']['seed']
EXECUTOR_PORT = config['executor']['port']

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return False
        except socket.error:
            return True

def kill_process_on_port(port):
    try:
        if os.name == 'nt':  # Windows
            os.system(f'netstat -ano | findstr :{port}')
            os.system(f'taskkill /F /PID {port}')
        else:  # Unix/Linux/MacOS
            os.system(f'lsof -ti:{port} | xargs kill -9')
        time.sleep(2)  # Give more time for the port to be freed
    except Exception as e:
        print(f"Warning: Failed to kill process on port {port}: {str(e)}")

executor = Agent(
    name="macro_executor",
    port=EXECUTOR_PORT,
    seed=EXECUTOR_SEED,
)

@executor.on_event("startup")
async def startup(ctx: Context):
    try:
        fund_agent_if_low(ctx.wallet.address())
    except AttributeError:
        print("Warning: Could not fund agent wallet. Continuing without funding.")

def execute_step(step):
    app = step['app'].lower()  # Convert app name to lowercase
    action = step['action'].lower()  # Convert action to lowercase
    args = step['args']
    
    print(f"DEBUG: Processing step with app='{app}' (original: '{step['app']}'), action='{action}'")

    try:
        if app in ["code", "vscode"]:
            print(f"DEBUG: Matched app: {app}")
            if action == "open_file":
                # Replace timestamp placeholder with actual timestamp
                file_path = args['path'].replace('${timestamp}', time.strftime('%Y%m%d_%H%M%S'))
                file_path = os.path.abspath(file_path)
                print(f"Opening file: {file_path}")
                
                # Create the file if it doesn't exist
                with open(file_path, 'w') as f:
                    f.write('')
                os.system(f"code {file_path}")
                time.sleep(2)  # Wait for file to open
                
                # Ensure VSCode is in focus and the file is active
                os.system("osascript -e 'tell application \"Visual Studio Code\" to activate'")
                time.sleep(1)
                # Use keyboard shortcut to focus editor (Cmd+1)
                pyautogui.hotkey('command', '1')
                pyautogui.press('backspace')
                time.sleep(0.5)
            elif action == "type":
                print(f"Typing text: {args['text']}")
                # Ensure VSCode is in focus
                os.system("osascript -e 'tell application \"Visual Studio Code\" to activate'")
                time.sleep(1)
                # Use keyboard shortcut to focus editor (Cmd+1)
                pyautogui.hotkey('command', '1')
                pyautogui.press('backspace')
                time.sleep(0.5)
                # Type the text
                pyautogui.write(args['text'])
                time.sleep(1)  # Wait for typing to complete
            elif action == "save_file":
                print("Saving file...")
                # Ensure VSCode is in focus
                os.system("osascript -e 'tell application \"Visual Studio Code\" to activate'")
                time.sleep(0.5)
                # Save the file
                pyautogui.hotkey('command', 's')
                time.sleep(1)  # Wait for save to complete
            else:
                raise ValueError(f"Unknown action for {app}: {action}")
        elif app == "spotify":
            print(f"DEBUG: Matched app: {app}")
            if action == "play_playlist":
                playlist_url = args.get('url', "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")
                
                # Convert Spotify URI format to web URL format if needed
                if playlist_url.startswith('spotify:playlist:'):
                    playlist_id = playlist_url.replace('spotify:playlist:', '')
                    playlist_url = f"https://open.spotify.com/playlist/{playlist_id}"
                    print(f"Converted Spotify URI to web URL: {playlist_url}")
                
                print(f"Opening Spotify playlist: {playlist_url}")
                
                # On macOS: force-open in Chrome
                if sys.platform == "darwin":
                    subprocess.Popen(["open", "-a", "Google Chrome", playlist_url])
                # On Windows:
                elif sys.platform.startswith("win"):
                    subprocess.Popen(["cmd", "/c", "start", "chrome", playlist_url], shell=True)
                # On Linux:
                else:
                    subprocess.Popen(["google-chrome", playlist_url])
                time.sleep(2)  # wait for page to load
                
                # Toggle play/pause
                pyautogui.press("space")
            else:
                raise ValueError(f"Unknown action for {app}: {action}")
        else:
            print(f"DEBUG: No match for app: '{app}'")
            raise ValueError(f"Unknown app: {app}")
    except Exception as e:
        print(f"Error executing step: {str(e)}")
        raise

@app.route('/macro', methods=['POST'])
def handle_macro():
    try:
        macro = request.json
        print(f"Received macro: {json.dumps(macro, indent=2)}")
        
        for step in macro['steps']:
            print(f"\nExecuting step: {json.dumps(step, indent=2)}")
            execute_step(step)
            time.sleep(1)  # Add delay between steps
            
        return jsonify({"status": "ok", "message": "Macro executed successfully"})
    except Exception as e:
        error_msg = f"Error executing macro: {str(e)}"
        print(error_msg)
        return jsonify({"status": "error", "message": error_msg}), 500

def run_flask():
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        if is_port_in_use(EXECUTOR_PORT):
            print(f"Port {EXECUTOR_PORT} is in use. Attempting to free it...")
            kill_process_on_port(EXECUTOR_PORT)
            time.sleep(2)  # Wait for port to be freed
            retry_count += 1
        else:
            break
    
    if retry_count == max_retries:
        print(f"Error: Could not free port {EXECUTOR_PORT} after {max_retries} attempts")
        return
    
    try:
        print(f"Starting Flask server on port {EXECUTOR_PORT}...")
        app.run(host='127.0.0.1', port=EXECUTOR_PORT, debug=False)
    except Exception as e:
        print(f"Error starting Flask server: {str(e)}")
