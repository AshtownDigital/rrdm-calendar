/**
 * Catch-all handler for Vercel serverless environment
 * This file handles all paths in the Vercel serverless environment
 */
const app = require('../server');

// Export the handler function for Vercel
module.exports = (req, res) => {
  console.log(`[Vercel Catch-All] Request received: ${req.method} ${req.url}`);
  
  // Set environment variables for serverless environment
  process.env.VERCEL = '1';
  
  // Handle the request using the Express app
  try {
    return app(req, res);
  } catch (error) {
    console.error('[Vercel Catch-All] Error handling request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing your request.',
      path: req.url
    });
  }
};
