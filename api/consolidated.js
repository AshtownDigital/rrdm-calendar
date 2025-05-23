/**
 * Consolidated API handler for Vercel serverless environment
 * This file handles multiple API routes to stay within Vercel's Hobby plan limits
 * Updated for MongoDB integration with enhanced error handling
 */

// Set serverless environment flag
process.env.VERCEL = '1';

// Import required modules
const serverless = require('serverless-http');
const app = require('../server');

// Create a simple serverless handler using the serverless-http package
const handler = serverless(app, {
  provider: {
    type: 'vercel'
  }
});

// Export the handler function for Vercel
module.exports = handler;

// Export the app for testing
module.exports.app = app;
