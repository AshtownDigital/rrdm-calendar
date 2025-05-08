/**
 * API v1 Router
 * 
 * This is the main entry point for the v1 API routes.
 * It implements versioning and standardized response formats.
 */
const express = require('express');
const router = express.Router();

// Import controllers
const itemsController = require('../../controllers/api/itemsController');

// Import route modules
const healthRoutes = require('./health');
const vercelHealthRoutes = require('./vercel-health');

// Health check routes
router.use('/health', healthRoutes);

// Vercel health check routes (for serverless functions)
router.use('/_vercel/health', vercelHealthRoutes);

// Simple health check endpoint
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API v1 is running',
    version: 'v1',
    timestamp: new Date().toISOString()
  });
});

// Reference Data Items endpoints
router.get('/items', itemsController.getItems);
router.get('/items/:id', itemsController.getItemById);
router.get('/items/:id/values', itemsController.getItemValues);

// BCR endpoints
// These will be implemented in the future

// Funding endpoints
// These will be implemented in the future

// Error handling for this router
router.use((err, req, res, next) => {
  console.error('API v1 Error:', err);
  
  // Format the error response
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode
    }
  };
  
  // Add error details if available
  if (err.details) {
    response.error.details = err.details;
  }
  
  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
});

module.exports = router;
