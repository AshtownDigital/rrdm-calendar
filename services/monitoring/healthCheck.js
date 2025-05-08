/**
 * Health Check Service
 * 
 * This service provides health check functionality for the application and its dependencies.
 * It monitors database connectivity, Redis, and other critical services.
 * Optimized for serverless environments with graceful fallbacks.
 * 
 * Enhanced with robust Redis management for better reliability and development experience.
 */
const config = require('../../config/env');
const os = require('os');
const { createRedisClient } = require('../../utils/redis-manager');

// Initialize logger with fallback
let logger;
try {
  const loggerModule = require('../logger');
  logger = loggerModule.logger;
} catch (error) {
  console.warn('Warning: Logger not available, using console fallback');
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
}

// Initialize Prisma client lazily to avoid connection issues in serverless
let prisma;
function getPrismaClient() {
  if (!prisma) {
    try {
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
    } catch (error) {
      logger.error('Failed to initialize Prisma client', { error: error.message });
      return null;
    }
  }
  return prisma;
}

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
    // Get Prisma client
    const client = getPrismaClient();
    if (!client) {
      return {
        status: STATUS.DOWN,
        error: 'Prisma client initialization failed',
        message: 'Database connection failed'
      };
    }
    
    // Execute a simple query to check connectivity
    const startTime = process.hrtime();
    await client.$queryRaw`SELECT 1`;
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
  // Check if Redis is enabled from environment variables
  const redisEnabled = process.env.REDIS_ENABLED !== 'false';
  const redisMock = process.env.REDIS_MOCK === 'true';
  
  // Skip if Redis is not enabled
  if (!redisEnabled) {
    return {
      status: STATUS.UP,
      message: redisMock ? 'Using Redis mock implementation' : 'Redis not enabled, skipping check'
    };
  }
  
  // Skip if Redis is not configured
  if (!process.env.REDIS_HOST && !config.redis?.host) {
    return {
      status: STATUS.UP,
      message: 'Redis not configured, skipping check'
    };
  }
  
  let redisClient;
  
  try {
    // Create a Redis client specifically for health checks using the enhanced Redis manager
    redisClient = createRedisClient({
      keyPrefix: 'rrdm:health:',
      connectTimeout: 3000, // 3 seconds timeout for health checks
      maxRetriesPerRequest: 1, // Only retry once for health checks
      retryStrategy: (times) => {
        // Don't retry in health check
        return null;
      }
    });
    
    // Execute a simple command to check connectivity
    const startTime = process.hrtime();
    await redisClient.ping();
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1e9 + diff[1]) / 1e6; // Convert to milliseconds
    
    return {
      status: STATUS.UP,
      responseTime: `${responseTime.toFixed(2)}ms`,
      message: 'Redis connection successful',
      implementation: redisMock ? 'mock' : 'real'
    };
  } catch (error) {
    logger.error('Redis health check failed', { 
      service: 'rrdm-app',
      component: 'health-check',
      error: error.message 
    });
    
    // If Redis is not critical, return degraded instead of down
    return {
      status: STATUS.DEGRADED,
      error: error.message,
      message: 'Redis connection failed',
      implementation: redisMock ? 'mock' : 'real'
    };
  } finally {
    // Close the Redis client if it was created
    // Note: The enhanced Redis manager handles connection cleanup automatically
    // but we'll explicitly quit for health checks to avoid lingering connections
    if (redisClient && typeof redisClient.quit === 'function') {
      try {
        await redisClient.quit();
      } catch (error) {
        logger.error('Error closing Redis client', { 
          service: 'rrdm-app',
          component: 'health-check',
          error: error.message 
        });
      }
    }
  }
}

/**
 * Check system resources
 * @returns {Object} - System health status
 */
function checkSystem() {
  // For serverless environments, system checks are less relevant
  // but we still provide basic information when possible
  try {
    // Check if we're in a serverless environment
    const isServerless = process.env.VERCEL === '1';
    
    if (isServerless) {
      // In serverless, just return basic info without resource checks
      return {
        status: STATUS.UP,
        message: 'Running in serverless environment',
        metrics: {
          environment: process.env.NODE_ENV || 'unknown',
          platform: 'Vercel',
          region: process.env.VERCEL_REGION || 'unknown'
        }
      };
    }
    
    // For non-serverless, perform normal checks
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
    
    // Return a basic response for serverless environments
    return {
      status: STATUS.UP, // Don't mark as degraded in serverless
      message: 'System information limited in serverless environment',
      error: error.message
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
  try {
    // Check all components with individual try/catch blocks
    let database, redis, system, application;
    
    try {
      database = await checkDatabase();
    } catch (error) {
      logger.error('Database health check error', { error: error.message });
      database = {
        status: STATUS.DOWN,
        error: error.message,
        message: 'Database health check failed with exception'
      };
    }
    
    try {
      redis = await checkRedis();
    } catch (error) {
      logger.error('Redis health check error', { error: error.message });
      redis = {
        status: STATUS.DEGRADED, // Redis is not critical
        error: error.message,
        message: 'Redis health check failed with exception'
      };
    }
    
    try {
      system = checkSystem();
    } catch (error) {
      logger.error('System health check error', { error: error.message });
      system = {
        status: STATUS.UP, // System is not critical in serverless
        error: error.message,
        message: 'System health check failed with exception'
      };
    }
    
    try {
      application = checkApplication();
    } catch (error) {
      logger.error('Application health check error', { error: error.message });
      application = {
        status: STATUS.DEGRADED,
        error: error.message,
        message: 'Application health check failed with exception'
      };
    }
    
    // Determine overall status
    let status = STATUS.UP;
    
    // In serverless, only database is critical
    if (database.status === STATUS.DOWN) {
      status = STATUS.DOWN;
    } else if (
      database.status === STATUS.DEGRADED || 
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
  } catch (error) {
    // Fallback for any unexpected errors
    logger.error('Health check failed completely', { error: error.message });
    return {
      status: STATUS.DEGRADED,
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Health check failed with unexpected error'
    };
  }
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
      // For Vercel serverless, provide a simpler health check if needed
      if (process.env.VERCEL === '1' && !detailed) {
        return res.status(200).json({
          status: STATUS.UP,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'production',
          platform: 'Vercel',
          region: process.env.VERCEL_REGION || 'unknown'
        });
      }
      
      const health = await checkHealth();
      
      // Set status code based on health status
      // In serverless, always return 200 to avoid function termination
      const statusCode = process.env.VERCEL === '1' ? 200 : (
        health.status === STATUS.UP ? 200 :
        health.status === STATUS.DEGRADED ? 200 : 503
      );
      
      // Return simplified response if not detailed
      if (!detailed) {
        return res.status(statusCode).json({
          status: health.status,
          timestamp: health.timestamp,
          environment: process.env.NODE_ENV || 'production'
        });
      }
      
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check middleware error', { error: error.message });
      
      // In serverless, always return 200 to avoid function termination
      const statusCode = process.env.VERCEL === '1' ? 200 : 500;
      
      res.status(statusCode).json({
        status: STATUS.DEGRADED, // Use degraded instead of down in serverless
        timestamp: new Date().toISOString(),
        error: error.message,
        environment: process.env.NODE_ENV || 'production'
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
