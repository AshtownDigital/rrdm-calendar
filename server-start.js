/**
 * Server startup script for RRDM application
 * This file handles the startup of the Express server
 */
const app = require('./server');
const mongoose = require('mongoose');

// No serverless environment detection needed

// Default port for local development
// Try port 3000 first, but allow fallback to another port if necessary
const desiredPort = parseInt(process.env.PORT || '3000', 10);
let port = desiredPort;

// Flag to track if we're using the fallback port
let usingFallbackPort = false;

// Server instance (will remain undefined in serverless environments)
let server;

// Function to start the server
const startServer = (portToUse) => {
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(portToUse, () => {
        console.log(`Server running at http://localhost:${portToUse}`);
        resolve(server);
      });
      
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          if (portToUse === desiredPort) {
            console.warn(`\n\nWARNING: Port ${portToUse} is already in use.\nAttempting to use alternative port 3001...\n`);
            usingFallbackPort = true;
            resolve(startServer(3001));
          } else {
            console.warn(`\n\nWARNING: Alternative port ${portToUse} is also in use.\nAttempting to use port 3002...\n`);
            resolve(startServer(3002));
          }
        } else {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Start the server
startServer(port)
  .then(() => {
    if (usingFallbackPort) {
      console.log(`\n\nNOTE: RRDM application is running on an alternative port because port 3000 was unavailable.`);
      console.log(`Please access the application at the URL shown above.\n`);
    }
    console.log(`RRDM application started successfully.`);
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// Handle graceful shutdown
const gracefulShutdown = async () => {
  if (server) {
    console.log('Shutting down server...');
    
    server.close(() => {
      console.log('Server shut down successfully');
    });
  }
  
  try {
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { app, server };
