#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Navigate to that directory
cd "$SCRIPT_DIR" || exit

echo "--- Starting Jukebox Docker Container ---"

# Check if Docker is running (basic check)
if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker does not seem to be running. Please start Docker Desktop and try again."
  exit 1
fi

# Build and start the container using docker-compose in detached mode
docker-compose up --build -d

# Check if docker-compose succeeded (basic check based on exit code)
if [ $? -ne 0 ]; then
    echo "ERROR: docker-compose failed. Please check the output above."
    exit 1
fi

echo ""
echo "--- Jukebox should be running ---"
echo "Opening browser windows..."

# Wait a few seconds for the server inside the container to be ready
sleep 5

# Open the Jukebox UI and Player windows in the default browser
open http://localhost:8000
sleep 1 # Small delay between opening windows
open http://localhost:8000/player.html

echo ""
echo "Access Jukebox at: http://localhost:8000"
echo "Access Player at:  http://localhost:8000/player.html"
echo "To stop the jukebox, run 'docker-compose down' in this directory: $SCRIPT_DIR"
echo "(Press Enter to close this terminal window)"
read -r