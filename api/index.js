/**
 * API Router
 * 
 * Main entry point for all API routes with versioning support.
 * Legacy routes are maintained for backward compatibility.
 * Optimized for serverless environments with graceful error handling.
 */
const express = require('express');
const router = express.Router();

// Initialize logger with fallback
let logger;
try {
  const loggerModule = require('../services/logger');
  logger = loggerModule.logger;
} catch (error) {
  console.warn('Warning: Logger not available in API router, using console fallback');
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
}

// Import API versions with error handling
let apiV1;
try {
  apiV1 = require('./v1');
  logger.info('API v1 routes loaded successfully');
} catch (error) {
  logger.error('Failed to load API v1 routes:', error.message);
  // Create a fallback router that returns an error
  apiV1 = express.Router();
  apiV1.use('*', (req, res) => {
    res.status(503).json({
      error: 'API v1 routes unavailable',
      message: 'The API is currently unavailable. Please try again later.'
    });
  });
}

// Import legacy API route modules with error handling
let dashboardRoutes, itemsRoutes, valuesRoutes, releaseNotesRoutes;

// Helper function to safely load a route module
function safelyLoadRoute(path, name) {
  try {
    const module = require(path);
    logger.info(`${name} routes loaded successfully`);
    return module;
  } catch (error) {
    logger.error(`Failed to load ${name} routes:`, error.message);
    // Create a fallback router that returns an error
    const fallbackRouter = express.Router();
    fallbackRouter.use('*', (req, res) => {
      res.status(503).json({
        error: `${name} routes unavailable`,
        message: 'This API endpoint is currently unavailable. Please try again later.'
      });
    });
    return fallbackRouter;
  }
}

// Safely load all legacy routes
dashboardRoutes = safelyLoadRoute('./dashboard', 'Dashboard');
itemsRoutes = safelyLoadRoute('./items', 'Items');
valuesRoutes = safelyLoadRoute('./values', 'Values');
releaseNotesRoutes = safelyLoadRoute('./release-notes', 'Release Notes');

// API version routes
router.use('/v1', apiV1);

// Legacy API routes (maintained for backward compatibility)
router.use('/dashboard', dashboardRoutes);
router.use('/items', itemsRoutes);
router.use('/values', valuesRoutes);
router.use('/release-notes', releaseNotesRoutes);

// API documentation route with error handling
router.get('/docs', (req, res, next) => {
  try {
    res.render('modules/api/documentation', {
      title: 'API Documentation',
      user: req.user
    });
  } catch (error) {
    logger.error('Error rendering API documentation:', error.message);
    // Fallback to JSON response if rendering fails
    res.status(500).json({
      error: 'Documentation unavailable',
      message: 'API documentation is currently unavailable. Please try again later.'
    });
  }
});

// Health check endpoint for monitoring
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    serverless: process.env.VERCEL === '1' ? true : false
  });
});

// Root API route - display version information
router.get('/', (req, res) => {
  try {
    res.json({
      name: 'RRDM API',
      versions: ['v1'],
      currentVersion: 'v1',
      documentation: '/api/docs',
      health: '/api/health',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in root API route:', error.message);
    res.status(200).json({
      name: 'RRDM API',
      status: 'available',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware for API routes
router.use((err, req, res, next) => {
  logger.error('API error:', err.message);
  
  // Always return a JSON response for API errors
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    status: 'error',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
