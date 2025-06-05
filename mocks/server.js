/**
 * Mock server.js for API integration tests
 */
const express = require('express');
const app = express();

// Mock middleware for authentication in tests
app.use((req, res, next) => {
  // Add a mock authenticated user to all requests
  // This can be overridden in specific tests
  if (!req.isAuthenticated) {
    req.isAuthenticated = () => true;
    req.user = {
      id: 'mock-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    };
  }
  next();
});

// Authentication middleware for protected routes
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
};

// Mock API routes for testing
app.get('/api', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'RRDM API',
    environment: 'test'
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// Protected route requiring authentication
app.get('/api/v1/items', requireAuth, (req, res) => {
  res.json({
    items: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' }
    ]
  });
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Export the Express app
module.exports = app;
