/**
 * API Health Check Route
 */
const express = require('express');
const router = express.Router();
const { version } = require('../../package.json');

/**
 * GET /api/health
 * Health check endpoint for the API
 */
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version
  });
};

// Define routes
router.get('/', healthCheck);

// Export both the router and the handler function for testing
module.exports = {
  router,
  healthCheck
};
