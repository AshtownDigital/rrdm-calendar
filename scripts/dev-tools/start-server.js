/**
 * Unified server starter script for RRDM development
 * 
 * This script provides a single entry point for starting the RRDM server
 * in various development configurations.
 * 
 * Usage:
 * node scripts/dev-tools/start-server.js [options]
 * 
 * Options:
 *  --real-db       Use real MongoDB instead of mock data
 *  --port=<port>   Specify port to use (default: 3000)
 *  --mock-data     Force using mock data (default in dev mode)
 */

const { exec, spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

// Get the root directory of the project
const rootDir = path.resolve(__dirname, '../..');

// Function to execute shell commands
function runCommand(command) {
  return new Promise((resolve) => {
    // Log commands being executed
    exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
      if (stdout) {
        // Process stdout if needed
      }
      if (stderr) {
        // Process stderr if needed
      }
      
      // We don't reject on error since some commands like kill might "fail" if no process exists
      resolve();
    });
  });
}

// Main function to start the server
async function startServer() {
  try {
    const port = args.port || '3000';
    const useRealDb = args['real-db'] || false;
    const useMockData = args['mock-data'] || false;
    
    console.log('RRDM Server Starter');
    console.log('==================');
    console.log(`Port: ${port}`);
    console.log(`Database: ${useRealDb ? 'Real MongoDB' : 'Default configuration'}`);
    
    // Step 1: Find and kill any processes using the specified port
    console.log(`\nChecking for processes using port ${port}...`);
    await runCommand(`lsof -ti:${port} | xargs kill -9 || true`);
    
    // Step 2: Kill any existing node processes to be safe
    console.log('Killing any existing node processes...');
    await runCommand('pkill -f "node.*rrdm" || true');
    
    // Step 3: Wait a moment for processes to terminate
    console.log('Waiting for processes to terminate...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Start the server with the appropriate configuration
    console.log('\nStarting RRDM server...');
    
    // Set up environment variables based on options
    const env = {
      ...process.env,
      PORT: port
    };
    
    if (useRealDb) {
      // Use real MongoDB connection by setting NODE_ENV to staging
      // This bypasses the mock data setup in development mode
      env.NODE_ENV = 'staging';
      env.MONGODB_URI = 'mongodb://localhost:27017/rrdm';
      env.BYPASS_MOCK = 'true';
      console.log('Using real MongoDB at mongodb://localhost:27017/rrdm');
    } else if (useMockData) {
      // Force mock data setup
      env.NODE_ENV = 'development';
      env.ENABLE_MOCK_DATA = 'true';
      console.log('Using mock MongoDB data');
    } else {
      // Use default NODE_ENV setting
      env.NODE_ENV = process.env.NODE_ENV || 'development';
      console.log(`Using default environment (${env.NODE_ENV})`);
    }

    // Add a session secret for development
    env.SESSION_SECRET = process.env.SESSION_SECRET || 'local-dev-secret';
    
    // Start the server
    const child = spawn('node', ['server-start.js'], {
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
    
    console.log(`\nServer started on port ${port}`);
    console.log(`Access the application at http://localhost:${port}`);
    
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

// Run the main function
startServer();
