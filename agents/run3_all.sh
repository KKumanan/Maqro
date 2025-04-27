#!/bin/bash

# Kill any existing processes on the ports
echo "Cleaning up any existing processes..."
lsof -ti:8001,8002 | xargs kill -9 2>/dev/null || true

# Function to play a Spotify playlist
play_spotify_playlist() {
    local playlist_url=$1
    
    # Convert Spotify URI format to web URL format if needed
    if [[ $playlist_url == spotify:playlist:* ]]; then
        playlist_id=${playlist_url#spotify:playlist:}
        playlist_url="https://open.spotify.com/playlist/$playlist_id"
        echo "Converted Spotify URI to web URL: $playlist_url"
    fi
    
    echo "Playing Spotify playlist: $playlist_url"
    
    # Send request to executor agent
    curl -X POST http://127.0.0.1:8002/macro \
         -H "Content-Type: application/json" \
         -d "{\"steps\": [{\"app\": \"Spotify\", \"action\": \"play_playlist\", \"args\": {\"url\": \"$playlist_url\"}}]}"
    
    # Wait for the request to be processed
    sleep 2
}

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

# Ask if user wants to play a Spotify playlist
read -p "Do you want to play a Spotify playlist? (y/n): " play_spotify
if [[ $play_spotify == "y" || $play_spotify == "Y" ]]; then
    read -p "Enter Spotify playlist URL (or press Enter for default): " playlist_url
    if [[ -z $playlist_url ]]; then
        playlist_url="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
    fi
    play_spotify_playlist "$playlist_url"
fi

# Start trainer agent
echo "Starting trainer agent..."
python trainer_agent.py

# Cleanup
echo "Cleaning up..."
kill $EXECUTOR_PID 2>/dev/null || true
lsof -ti:8001,8002 | xargs kill -9 2>/dev/null || true 