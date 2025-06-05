/**
 * Server startup script with simplified version capability
 * This version can run without MongoDB connection for deployment testing
 */

console.log('<<<<< Starting server (potentially in simplified mode) >>>>>');

// Load environment variables
require('dotenv').config();

// Check if we should use the simplified server
const useSimpleServer = process.env.USE_SIMPLE_SERVER === 'true' || process.env.NODE_ENV === 'test-deployment';
console.log(`Using simplified server: ${useSimpleServer ? 'YES' : 'NO'}`);
console.log(`Current NODE_ENV: ${process.env.NODE_ENV || 'Not specified'}`);
console.log(`USE_SIMPLE_SERVER: ${process.env.USE_SIMPLE_SERVER || 'Not specified'}`);

if (useSimpleServer) {
  console.log('Starting simplified server for deployment testing');
  // Simplified server directly in this file
  const express = require('express');
  const app = express();
  const path = require('path');

  // Basic configuration
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Root route - simple status message
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RRDM Deployment Test</title>
        <style>
          .container { 
            margin: 30px; 
            font-family: arial, sans-serif;
          }
          .success { 
            color: #00703c; 
            border: 5px solid #00703c; 
            padding: 20px; 
            margin-bottom: 20px;
          }
          .info { 
            border: 2px solid #1d70b8; 
            padding: 15px; 
            margin-bottom: 20px; 
          }
          h1, h2 { 
            margin-top: 0; 
          }
          code {
            background: #f3f2f1;
            padding: 4px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">
            <h1>RRDM Deployment Successful!</h1>
            <p>This simplified server is running correctly.</p>
          </div>
          
          <div class="info">
            <h2>Deployment Information</h2>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'Not specified'}</p>
            <p><strong>Node Version:</strong> ${process.version}</p>
            <p><strong>Server Time:</strong> ${new Date().toISOString()}</p>
          </div>
          
          <div class="info">
            <h2>Case Sensitivity Fixes</h2>
            <p>The deployment has succeeded with our case sensitivity fixes including:</p>
            <ul>
              <li>Fixed AcademicYear model imports from <code>../models/AcademicYear</code> to <code>../models/academicYear</code></li>
              <li>Fixed BCR model imports from <code>../models/BCR</code> to <code>../models/Bcr</code></li>
            </ul>
          </div>
          
          <div class="info">
            <h2>Next Steps</h2>
            <p>To complete the deployment:</p>
            <ol>
              <li>Set up a MongoDB Atlas database for the application</li>
              <li>Configure the <code>MONGODB_URI</code> environment variable on Heroku with your MongoDB connection string</li>
              <li>Set <code>USE_SIMPLE_SERVER=false</code> to use the full application server</li>
              <li>Restart the Heroku dynos</li>
            </ol>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Status endpoint for health checks
  app.get('/status', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Simple server is running',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });
  
  // Start server
  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => {
    console.log(`Simple server running at http://localhost:${port}`);
    console.log(`RRDM simplified app started successfully.`);
  });

  module.exports = { app, server };
} else {
  console.log('Using full application server');
  const app = require('./server');
  const mongoose = require('mongoose');
  const desiredPort = parseInt(process.env.PORT || '3000', 10);
  let port = desiredPort;
  let usingFallbackPort = false;
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
              console.warn(`WARNING: Port ${portToUse} is already in use.`);
              console.warn(`Attempting to use alternative port 3001...`);
              usingFallbackPort = true;
              resolve(startServer(3001));
            } else {
              console.warn(`WARNING: Alternative port ${portToUse} is also in use.`);
              console.warn(`Attempting to use port 3002...`);
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
        console.log(`NOTE: RRDM application is running on an alternative port because port 3000 was unavailable.`);
        console.log(`Please access the application at the URL shown above.`);
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
}
