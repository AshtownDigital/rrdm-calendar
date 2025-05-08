/**
 * Vercel Health Check Route
 * 
 * This route provides a health check endpoint for Vercel serverless functions
 * to ensure the application is running correctly in the serverless environment.
 * It's accessible without authentication.
 */
const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');

// Initialize logger with fallback
let logger;
try {
  const loggerModule = require('../services/logger');
  logger = loggerModule.logger;
} catch (error) {
  console.warn('Warning: Logger not available in health check, using console fallback');
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
}

/**
 * GET /_vercel/health
 * 
 * Health check endpoint for Vercel serverless functions.
 * Returns a JSON response with the status of the application.
 * This endpoint is accessible without authentication.
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
      logger.error('Database health check failed:', { error: dbError.message });
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
    logger.error('Health check error:', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
