/**
 * Vercel Health Check API
 * 
 * This API provides a health check endpoint for Vercel serverless functions
 * to ensure the application is running correctly in the serverless environment.
 */
const express = require('express');
const router = express.Router();
const { prisma } = require('../../config/database');

/**
 * GET /_vercel/health
 * 
 * Health check endpoint for Vercel serverless functions.
 * Returns a JSON response with the status of the application.
 */
router.get('/', async (req, res) => {
  try {
    // Ensure content type is set to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // Check database connection
    let dbStatus = 'unknown';
    try {
      // Simple database query to check connection
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (dbError) {
      dbStatus = 'disconnected';
      console.error('Database health check failed:', dbError.message);
    }
    
    // Return health check response
    res.status(200).json({
      status: 'up',
      environment: process.env.NODE_ENV,
      region: process.env.VERCEL_REGION || 'unknown',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      serverless: process.env.VERCEL === '1' ? 'true' : 'false'
    });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
