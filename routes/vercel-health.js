/**
 * Vercel Health Check Route
 * 
 * This route provides a health check endpoint for Vercel serverless functions
 * to ensure the application is running correctly in the serverless environment.
 * It's accessible without authentication.
 * 
 * IMPORTANT: This endpoint MUST return a 200 status code for Vercel to consider
 * the serverless function healthy, even if the database is not available.
 */
const express = require('express');
const router = express.Router();

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

// Import database conditionally to prevent the health check from failing
// if there are database connection issues
let prisma = null;
let dbAvailable = false;
try {
  const db = require('../config/database');
  prisma = db.prisma;
  dbAvailable = true;
} catch (error) {
  logger.warn('Database module could not be loaded in health check:', { error: error.message });
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
    
    // Basic response object that will always be returned
    const healthResponse = {
      status: 'up',  // Always report as up for Vercel
      environment: process.env.NODE_ENV || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown',
      timestamp: new Date().toISOString(),
      serverless: process.env.VERCEL === '1' ? 'true' : 'false'
    };
    
    // Check database connection only if database module was loaded successfully
    if (dbAvailable && prisma) {
      try {
        // Simple database query with a short timeout
        const queryPromise = prisma.$queryRaw`SELECT 1`;
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 2000)
        );
        
        await Promise.race([queryPromise, timeoutPromise]);
        healthResponse.database = 'connected';
      } catch (dbError) {
        healthResponse.database = 'disconnected';
        healthResponse.databaseError = dbError.message;
        logger.warn('Database health check failed:', { error: dbError.message });
      }
    } else {
      healthResponse.database = 'unavailable';
      healthResponse.databaseError = 'Database module could not be loaded';
    }
    
    // Always return 200 status code for Vercel health checks
    res.status(200).json(healthResponse);
  } catch (error) {
    logger.error('Health check error:', { error: error.message });
    
    // Even on error, return 200 status code with error details
    // This ensures Vercel considers the function healthy
    res.status(200).json({
      status: 'degraded',
      message: 'Health check encountered an error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
