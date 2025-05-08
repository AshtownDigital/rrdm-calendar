/**
 * Health Check API Routes
 * 
 * This module provides API endpoints for health checking the application.
 * It includes endpoints for overall health and individual component health.
 */
const express = require('express');
const router = express.Router();
const { 
  healthCheckMiddleware, 
  checkDatabase, 
  checkRedis, 
  checkSystem, 
  checkApplication 
} = require('../../services/monitoring/healthCheck');
const { cache } = require('../../middleware/cacheMiddleware');
const { cacheTTL } = require('../../config/redis');

/**
 * @api {get} /api/v1/health Get application health status
 * @apiName GetHealth
 * @apiGroup Health
 * @apiDescription Get the overall health status of the application
 * 
 * @apiParam {Boolean} [detailed=false] Whether to include detailed information
 * 
 * @apiSuccess {String} status Health status (up, down, degraded)
 * @apiSuccess {String} timestamp ISO timestamp of the health check
 * @apiSuccess {Object} [components] Component health statuses (if detailed=true)
 */
router.get('/', 
  // Cache health check for 30 seconds
  cache(cacheTTL.SHORT),
  // Health check middleware
  (req, res, next) => {
    const detailed = req.query.detailed === 'true';
    healthCheckMiddleware({ detailed })(req, res, next);
  }
);

/**
 * @api {get} /api/v1/health/database Get database health status
 * @apiName GetDatabaseHealth
 * @apiGroup Health
 * @apiDescription Get the health status of the database connection
 * 
 * @apiSuccess {String} status Health status (up, down)
 * @apiSuccess {String} [responseTime] Response time of the database query
 * @apiSuccess {String} message Status message
 * @apiSuccess {String} [error] Error message if status is down
 */
router.get('/database', async (req, res) => {
  try {
    const health = await checkDatabase();
    
    const statusCode = health.status === 'up' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'down',
      error: error.message,
      message: 'Database health check failed'
    });
  }
});

/**
 * @api {get} /api/v1/health/redis Get Redis health status
 * @apiName GetRedisHealth
 * @apiGroup Health
 * @apiDescription Get the health status of the Redis connection
 * 
 * @apiSuccess {String} status Health status (up, down)
 * @apiSuccess {String} [responseTime] Response time of the Redis command
 * @apiSuccess {String} message Status message
 * @apiSuccess {String} [error] Error message if status is down
 */
router.get('/redis', async (req, res) => {
  try {
    const health = await checkRedis();
    
    const statusCode = health.status === 'up' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'down',
      error: error.message,
      message: 'Redis health check failed'
    });
  }
});

/**
 * @api {get} /api/v1/health/system Get system health status
 * @apiName GetSystemHealth
 * @apiGroup Health
 * @apiDescription Get the health status of the system resources
 * 
 * @apiSuccess {String} status Health status (up, degraded)
 * @apiSuccess {String} message Status message
 * @apiSuccess {Object} [metrics] System metrics
 * @apiSuccess {Object} [metrics.memory] Memory usage metrics
 * @apiSuccess {Object} [metrics.cpu] CPU usage metrics
 * @apiSuccess {String} [metrics.uptime] System uptime
 */
router.get('/system', (req, res) => {
  try {
    const health = checkSystem();
    
    const statusCode = health.status === 'up' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'degraded',
      error: error.message,
      message: 'System health check failed'
    });
  }
});

/**
 * @api {get} /api/v1/health/application Get application health status
 * @apiName GetApplicationHealth
 * @apiGroup Health
 * @apiDescription Get the health status of the application itself
 * 
 * @apiSuccess {String} status Health status (up, degraded)
 * @apiSuccess {String} message Status message
 * @apiSuccess {Object} [metrics] Application metrics
 * @apiSuccess {Object} [metrics.memory] Memory usage metrics
 * @apiSuccess {String} [metrics.uptime] Application uptime
 * @apiSuccess {Number} [metrics.pid] Process ID
 * @apiSuccess {String} [metrics.nodeVersion] Node.js version
 * @apiSuccess {String} [metrics.environment] Application environment
 */
router.get('/application', (req, res) => {
  try {
    const health = checkApplication();
    
    const statusCode = health.status === 'up' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'degraded',
      error: error.message,
      message: 'Application health check failed'
    });
  }
});

module.exports = router;
