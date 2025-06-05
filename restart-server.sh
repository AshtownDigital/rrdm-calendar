#!/bin/bash

echo "Stopping any process on port 3000 and restarting with nodemon..."
cd "$(dirname "$0")" # Ensure we are in the project directory

# Use the dev:clean script from package.json
npm run dev:clean &

echo "Waiting for server to start..."
sleep 5 # You might adjust this sleep duration

echo "Server should now be running on port 3000 with nodemon!"
echo "You can now test the application at http://localhost:3000"
