/**
 * Server startup script for RRDM application
 * This file handles the startup of the Express server in both
 * standard and serverless environments
 */
const app = require('./server');
const mongoose = require('mongoose');

// Detect if we're running in a serverless environment (Vercel, AWS Lambda)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Default port for local development
const port = parseInt(process.env.PORT || '3000', 10);

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
          console.warn(`Port ${portToUse} is already in use, trying ${portToUse + 1}`);
          // Try the next port
          resolve(startServer(portToUse + 1));
        } else {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Only start the server if we're not in a serverless environment
if (!isServerless) {
  startServer(port)
    .then(() => {
      console.log(`RRDM application started in standard mode on port ${port}`);
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
} else {
  console.log('RRDM application running in serverless mode');
}

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
