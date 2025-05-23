/**
 * Serverless function entry point for RRDM application
 * This file handles the serverless function for Vercel deployment
 * Updated for MongoDB integration
 */
const app = require('../server');

// Set environment variables for serverless environment
process.env.VERCEL = '1';

// Export the handler function for Vercel
module.exports = (req, res) => {
  console.log(`[Vercel] Request received: ${req.method} ${req.url}`);
  
  // Handle the request using the Express app
  try {
    return app(req, res);
  } catch (error) {
    console.error('[Vercel] Error handling request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing your request.',
      path: req.url
    });
  }
};
