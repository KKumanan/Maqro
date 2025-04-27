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

app = Flask(__name__)

def load_config():
    with open('config.yaml', 'r') as f:
        return yaml.safe_load(f)

config = load_config()
EXECUTOR_SEED = config['executor']['seed']
EXECUTOR_PORT = config['executor']['port']

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def kill_process_on_port(port):
    if os.name == 'nt':  # Windows
        os.system(f'netstat -ano | findstr :{port}')
        os.system(f'taskkill /F /PID {port}')
    else:  # Unix/Linux/MacOS
        os.system(f'lsof -ti:{port} | xargs kill -9')

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
    app = step['app']
    action = step['action']
    args = step['args']
    
    if app == "Code":
        if action == "open_file":
            os.system(f"code {args['path']}")
            time.sleep(1)  # Wait for file to open
        elif action == "type":
            pyautogui.write(args['text'])
        elif action == "save_file":
            pyautogui.hotkey('command', 's')
            time.sleep(0.5)
    else:
        raise ValueError(f"Unknown app: {app}")

@app.route('/macro', methods=['POST'])
def handle_macro():
    try:
        macro = request.json
        for step in macro['steps']:
            execute_step(step)
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

def run_flask():
    # Check if port is in use and kill the process if it is
    if is_port_in_use(EXECUTOR_PORT):
        print(f"Port {EXECUTOR_PORT} is in use. Attempting to free it...")
        kill_process_on_port(EXECUTOR_PORT)
        time.sleep(1)  # Wait for port to be freed
    
    app.run(host='0.0.0.0', port=EXECUTOR_PORT)

if __name__ == "__main__":
    # Start Flask in a separate thread
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.daemon = True
    flask_thread.start()
    
    # Run the uAgent
    executor.run() 