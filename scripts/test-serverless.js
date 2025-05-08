/**
 * Test Serverless Function
 * 
 * This script simulates a serverless environment locally to test the application
 * before deploying to Vercel.
 */
const app = require('../server');
const http = require('http');

// Set environment variables to simulate Vercel serverless environment
process.env.VERCEL = '1';
process.env.NODE_ENV = 'staging';
// Explicitly override PORT to avoid conflicts
process.env.PORT = '3335';

// Create a simple HTTP server to test the Express app
const PORT = process.env.PORT || 3335; // Use a different port to avoid conflicts
const server = http.createServer(app);

// Track active connections for proper shutdown
const connections = {};
let connectionId = 0;

// Track connections
server.on('connection', (conn) => {
  const id = connectionId++;
  connections[id] = conn;
  
  conn.on('close', () => {
    delete connections[id];
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Serverless test server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
  
  // Log environment information
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Vercel: ${process.env.VERCEL}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set'}`);
  
  // Test endpoints
  console.log('\nTest these endpoints:');
  console.log(`- http://localhost:${PORT}/api/health (API health check)`);
  console.log(`- http://localhost:${PORT}/_vercel/health (Vercel health check)`);
  console.log(`- http://localhost:${PORT}/api (API root)`);
  console.log(`- http://localhost:${PORT}/ (Application root)`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  
  // Close the server
  server.close(() => {
    console.log('Server closed');
    
    // Close all active connections
    Object.values(connections).forEach(conn => {
      conn.destroy();
    });
    
    console.log('All connections closed');
    process.exit(0);
  });
  
  // Force exit after 5 seconds if server doesn't close gracefully
  setTimeout(() => {
    console.error('Forcing server shutdown after timeout');
    process.exit(1);
  }, 5000);
});
