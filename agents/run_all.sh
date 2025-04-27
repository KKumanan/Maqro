#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Get the project root directory (one level up from agents)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Path to the virtual environment's Python
VENV_PYTHON="$PROJECT_ROOT/venv/bin/python"

# Kill any existing processes on the ports
echo "Cleaning up any existing processes..."
lsof -ti:8001,8002 | xargs kill -9 2>/dev/null || true

# Start pattern miner
echo "Starting pattern miner..."
$VENV_PYTHON pattern_miner.py

# Wait for workflow file to be written
sleep 2

# Start executor agent
echo "Starting executor agent..."
$VENV_PYTHON executor_agent.py &
EXECUTOR_PID=$!

# Wait for executor to start
sleep 3

# Start trainer agent
echo "Starting trainer agent..."
$VENV_PYTHON trainer_agent.py

# Cleanup
echo "Cleaning up..."
kill $EXECUTOR_PID 2>/dev/null || true
lsof -ti:8001,8002 | xargs kill -9 2>/dev/null || true 