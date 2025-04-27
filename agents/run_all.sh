#!/bin/bash

# Kill any existing processes on the ports
echo "Cleaning up any existing processes..."
lsof -ti:8001,8002 | xargs kill -9 2>/dev/null || true

# Start pattern miner
echo "Starting pattern miner..."
python pattern_miner.py

# Wait for workflow file to be written
sleep 2

# Start executor agent
echo "Starting executor agent..."
python executor_agent.py &
EXECUTOR_PID=$!

# Wait for executor to start
sleep 3

# Start trainer agent
echo "Starting trainer agent..."
python trainer_agent.py

# Cleanup
echo "Cleaning up..."
kill $EXECUTOR_PID 2>/dev/null || true
lsof -ti:8001,8002 | xargs kill -9 2>/dev/null || true 