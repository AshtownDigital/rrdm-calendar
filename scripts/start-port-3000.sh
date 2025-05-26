#!/bin/bash

# Kill any processes using port 3000
echo "Killing any processes using port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill all node processes
echo "Killing all node processes..."
killall -9 node 2>/dev/null || true
pkill -f nodemon 2>/dev/null || true

# Wait for processes to fully terminate
echo "Waiting for processes to terminate..."
sleep 2

# Start the server on port 3000
echo "Starting server on port 3000..."
cd "$(dirname "$0")/.."
PORT=3000 MONGODB_URI=mongodb://localhost:27017/rrdm NODE_ENV=development node server-start.js
