/**
 * Health Check Service
 * 
 * This service provides health check functionality for the application and its dependencies.
 * It monitors database connectivity, Redis, and other critical services.
 */
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { logger } = require('../logger');
const config = require('../../config/env');
const os = require('os');

// Initialize Prisma client
const prisma = new PrismaClient();

// Health check statuses
const STATUS = {
  UP: 'up',
  DOWN: 'down',
  DEGRADED: 'degraded'
};

/**
 * Check database connectivity
 * @returns {Promise<Object>} - Database health status
 */
async function checkDatabase() {
  try {
    // Execute a simple query to check connectivity
    const startTime = process.hrtime();
    await prisma.$queryRaw`SELECT 1`;
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1e9 + diff[1]) / 1e6; // Convert to milliseconds
    
    return {
      status: STATUS.UP,
      responseTime: `${responseTime.toFixed(2)}ms`,
      message: 'Database connection successful'
    };
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    
    return {
      status: STATUS.DOWN,
      error: error.message,
      message: 'Database connection failed'
    };
  }
}

/**
 * Check Redis connectivity
 * @returns {Promise<Object>} - Redis health status
 */
async function checkRedis() {
  // Skip if Redis is not configured
  if (!config.redis || !config.redis.host) {
    return {
      status: STATUS.UP,
      message: 'Redis not configured, skipping check'
    };
  }
  
  let redisClient;
  
  try {
    // Create a new Redis client for the health check
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port || 6379,
      password: config.redis.password,
      connectTimeout: 5000 // 5 seconds timeout
    });
    
    // Execute a simple command to check connectivity
    const startTime = process.hrtime();
    await redisClient.ping();
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1e9 + diff[1]) / 1e6; // Convert to milliseconds
    
    return {
      status: STATUS.UP,
      responseTime: `${responseTime.toFixed(2)}ms`,
      message: 'Redis connection successful'
    };
  } catch (error) {
    logger.error('Redis health check failed', { error: error.message });
    
    return {
      status: STATUS.DOWN,
      error: error.message,
      message: 'Redis connection failed'
    };
  } finally {
    // Close the Redis client
    if (redisClient) {
      redisClient.disconnect();
    }
  }
}

/**
 * Check system resources
 * @returns {Object} - System health status
 */
function checkSystem() {
  try {
    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemoryPercentage = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    // Get CPU load
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const loadPerCpu = loadAvg[0] / cpuCount;
    
    // Determine status based on resource usage
    let status = STATUS.UP;
    let message = 'System resources are healthy';
    
    if (usedMemoryPercentage > 90 || loadPerCpu > 0.8) {
      status = STATUS.DEGRADED;
      message = 'System resources are under high load';
    }
    
    return {
      status,
      message,
      metrics: {
        memory: {
          total: formatBytes(totalMemory),
          free: formatBytes(freeMemory),
          used: formatBytes(totalMemory - freeMemory),
          usedPercentage: `${usedMemoryPercentage.toFixed(2)}%`
        },
        cpu: {
          count: cpuCount,
          loadAvg: loadAvg.map(load => load.toFixed(2)),
          loadPerCpu: loadPerCpu.toFixed(2)
        },
        uptime: formatUptime(os.uptime())
      }
    };
  } catch (error) {
    logger.error('System health check failed', { error: error.message });
    
    return {
      status: STATUS.DEGRADED,
      error: error.message,
      message: 'System health check failed'
    };
  }
}

/**
 * Check application health
 * @returns {Object} - Application health status
 */
function checkApplication() {
  try {
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    return {
      status: STATUS.UP,
      message: 'Application is running',
      metrics: {
        memory: {
          rss: formatBytes(memoryUsage.rss),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          external: formatBytes(memoryUsage.external)
        },
        uptime: formatUptime(process.uptime()),
        pid: process.pid,
        nodeVersion: process.version,
        environment: config.env
      }
    };
  } catch (error) {
    logger.error('Application health check failed', { error: error.message });
    
    return {
      status: STATUS.DEGRADED,
      error: error.message,
      message: 'Application health check failed'
    };
  }
}

/**
 * Perform a comprehensive health check
 * @returns {Promise<Object>} - Overall health status
 */
async function checkHealth() {
  // Check all components
  const [database, redis, system, application] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkSystem(),
    checkApplication()
  ]);
  
  // Determine overall status
  let status = STATUS.UP;
  
  if (database.status === STATUS.DOWN || redis.status === STATUS.DOWN) {
    status = STATUS.DOWN;
  } else if (
    database.status === STATUS.DEGRADED || 
    redis.status === STATUS.DEGRADED || 
    system.status === STATUS.DEGRADED || 
    application.status === STATUS.DEGRADED
  ) {
    status = STATUS.DEGRADED;
  }
  
  return {
    status,
    timestamp: new Date().toISOString(),
    components: {
      database,
      redis,
      system,
      application
    }
  };
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Bytes to format
 * @returns {string} - Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format uptime to human-readable string
 * @param {number} seconds - Uptime in seconds
 * @returns {string} - Formatted string
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * Create Express middleware for health check endpoint
 * @param {Object} options - Middleware options
 * @param {boolean} options.detailed - Whether to include detailed information
 * @returns {Function} - Express middleware
 */
function healthCheckMiddleware({ detailed = false } = {}) {
  return async (req, res) => {
    try {
      const health = await checkHealth();
      
      // Set status code based on health status
      const statusCode = health.status === STATUS.UP ? 200 :
                        health.status === STATUS.DEGRADED ? 200 : 503;
      
      // Return simplified response if not detailed
      if (!detailed) {
        return res.status(statusCode).json({
          status: health.status,
          timestamp: health.timestamp
        });
      }
      
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check middleware error', { error: error.message });
      
      res.status(500).json({
        status: STATUS.DOWN,
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  };
}

module.exports = {
  checkHealth,
  checkDatabase,
  checkRedis,
  checkSystem,
  checkApplication,
  healthCheckMiddleware,
  STATUS
};
