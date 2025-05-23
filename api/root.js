/**
 * Root API handler for Vercel serverless environment
 * This file handles the root path (/) in the Vercel serverless environment
 */
const app = require('../server');

// Export the handler function for Vercel
module.exports = (req, res) => {
  console.log(`[Vercel Root] Request received: ${req.method} ${req.url}`);
  
  // Handle the request using the Express app
  try {
    return app(req, res);
  } catch (error) {
    console.error('[Vercel Root] Error handling request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing your request.',
      path: req.url
    });
  }
};
