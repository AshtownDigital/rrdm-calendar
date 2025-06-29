/**
 * Script to start the server on port 3000 with nodemon
 * This script will:
 * 1. Find and kill any processes using port 3000
 * 2. Start the server on port 3000 with nodemon
 */
const { exec } = require('child_process');
const path = require('path');

// Get the root directory of the project
const rootDir = path.resolve(__dirname, '..');

// Function to execute shell commands
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Running command: ${command}`);
    exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      // We don't reject on error since some commands like kill might "fail" if no process exists
      resolve();
    });
  });
}

// Main function to start the server
async function startServer() {
  try {
    console.log('Starting server on port 3000 with nodemon...');
    
    // Step 1: Find and kill any processes using port 3000
    console.log('Checking for processes using port 3000...');
    await runCommand('lsof -ti:3000 | xargs kill -9 || true');
    
    // Step 2: Kill any existing node processes to be safe
    console.log('Killing any existing node processes...');
    await runCommand('pkill -f "node.*rrdm" || true');
    
    // Step 3: Wait a moment for processes to terminate
    console.log('Waiting for processes to terminate...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Start the server on port 3000 with nodemon
    console.log('Starting server on port 3000 with nodemon...');
    const startCommand = 'PORT=3000 MONGODB_URI=mongodb://localhost:27017/rrdm cross-env NODE_ENV=development nodemon server-start.js';
    
    // Execute the command directly instead of using exec
    const { spawn } = require('child_process');
    const parts = startCommand.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    // Set environment variables
    const env = { ...process.env };
    for (let i = 0; i < args.length; i++) {
      if (args[i].includes('=')) {
        const [key, value] = args[i].split('=');
        env[key] = value;
        args.splice(i, 1);
        i--;
      }
    }
    
    // Spawn the process
    const child = spawn('npx', ['cross-env', 'PORT=3000', 'MONGODB_URI=mongodb://localhost:27017/rrdm', 'NODE_ENV=development', 'nodemon', 'server-start.js'], {
      cwd: rootDir,
      env,
      stdio: 'inherit'
    });
    
    // Handle process events
    child.on('error', (error) => {
      console.error('Failed to start server:', error);
    });
    
    // Keep the script running until the child process exits
    child.on('exit', (code, signal) => {
      console.log(`Server process exited with code ${code} and signal ${signal}`);
    });
    
    console.log('Server started successfully on port 3000');
    
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

// Run the main function
startServer();
