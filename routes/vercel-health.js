/**
 * Vercel Health Check Route
 * 
 * This route provides a minimal health check endpoint for Vercel serverless functions
 * that doesn't depend on any database connectivity or other services.
 * 
 * IMPORTANT: This endpoint MUST return a 200 status code for Vercel to consider
 * the serverless function healthy.
 */
const express = require('express');
const router = express.Router();

/**
 * GET /_vercel/health
 * 
 * Minimal health check endpoint for Vercel serverless functions.
 * Always returns a 200 status code with basic information.
 */
router.get('/', (req, res) => {
  // Ensure content type is set to application/json
  res.setHeader('Content-Type', 'application/json');
  
  // Return a simple health check response
  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    serverless: process.env.VERCEL === '1' ? 'true' : 'false'
  });
});

module.exports = router;
