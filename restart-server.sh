#!/bin/bash

echo "Stopping any running Node.js processes..."
pkill -f node || echo "No Node.js processes found to kill"

echo "Waiting for processes to terminate..."
sleep 2

echo "Starting the server..."
cd "$(dirname "$0")"
npm start &

echo "Waiting for server to start..."
sleep 5

echo "Server should now be running!"
echo "You can now test the application at http://localhost:3001"
