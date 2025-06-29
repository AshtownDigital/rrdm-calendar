/**
 * Script to start the server with local MongoDB connection
 * This script will bypass mock data and use a real local MongoDB connection
 */
const { exec, spawn } = require('child_process');
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
    console.log('Starting server with local MongoDB connection...');
    
    // Step 1: Find and kill any processes using port 3000
    console.log('Checking for processes using port 3000...');
    await runCommand('lsof -ti:3000 | xargs kill -9 || true');
    
    // Step 2: Kill any existing node processes to be safe
    console.log('Killing any existing node processes...');
    await runCommand('pkill -f "node.*rrdm" || true');
    
    // Step 3: Wait a moment for processes to terminate
    console.log('Waiting for processes to terminate...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Create a patched version of server-start.js that bypasses mock data setup
    console.log('Patching server to use local MongoDB...');
    
    // This environment setup bypasses the mock data initialization
    // NODE_ENV=staging prevents mock data setup (which is only for development and test)
    // BYPASS_MOCK=true is an extra safeguard
    // MONGODB_URI points to the local MongoDB instance

    // Spawn the process with environment variables to force real MongoDB connection
    const child = spawn('node', ['server-start.js'], {
      cwd: rootDir,
      env: {
        ...process.env,
        NODE_ENV: 'staging',         // Use staging to bypass mock data setup
        PORT: '3000',                // Use port 3000
        MONGODB_URI: 'mongodb://localhost:27017/rrdm', // Point to local MongoDB
        BYPASS_MOCK: 'true',         // Extra safeguard
        SESSION_SECRET: 'local-dev-secret' // Session secret for development
      },
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
    
    console.log('Server started with local MongoDB connection');
    
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

// Run the main function
startServer();
