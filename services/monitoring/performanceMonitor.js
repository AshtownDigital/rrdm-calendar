/**
 * Performance Monitoring Service
 * 
 * This service provides performance monitoring for the application.
 * It tracks metrics such as response times, memory usage, database query times,
 * and security configurations such as CSRF protection.
 */
const { logger } = require('../logger');
const os = require('os');
const { PrismaClient } = require('@prisma/client');
const { testCsrfConfiguration } = require('../../tests/csrf-config.test');

// Initialize Prisma client with query logging
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query'
    }
  ]
});

// Track query durations
let queryMetrics = {
  count: 0,
  totalDuration: 0,
  slowQueries: []
};

// Configure slow query threshold (in milliseconds)
const SLOW_QUERY_THRESHOLD = 100;

// Listen for query events
prisma.$on('query', (e) => {
  const duration = e.duration;
  
  // Update metrics
  queryMetrics.count++;
  queryMetrics.totalDuration += duration;
  
  // Track slow queries
  if (duration > SLOW_QUERY_THRESHOLD) {
    queryMetrics.slowQueries.push({
      query: e.query,
      params: e.params,
      duration,
      timestamp: new Date()
    });
    
    // Keep only the last 100 slow queries
    if (queryMetrics.slowQueries.length > 100) {
      queryMetrics.slowQueries.shift();
    }
    
    // Log slow query
    logger.warn('Slow database query detected', {
      query: e.query,
      params: e.params,
      duration,
      threshold: SLOW_QUERY_THRESHOLD
    });
  }
});

/**
 * Get system metrics
 * @returns {Object} - System metrics
 */
function getSystemMetrics() {
  return {
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usagePercentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
    },
    cpu: {
      loadAvg: os.loadavg(),
      cpus: os.cpus().length
    },
    uptime: os.uptime()
  };
}

/**
 * Get application metrics
 * @returns {Object} - Application metrics
 */
function getApplicationMetrics() {
  const memoryUsage = process.memoryUsage();
  
  return {
    memory: {
      rss: memoryUsage.rss, // Resident Set Size - total memory allocated
      heapTotal: memoryUsage.heapTotal, // Total size of the allocated heap
      heapUsed: memoryUsage.heapUsed, // Actual memory used during execution
      external: memoryUsage.external // Memory used by C++ objects bound to JavaScript
    },
    uptime: process.uptime(),
    pid: process.pid
  };
}

/**
 * Get database metrics
 * @returns {Object} - Database metrics
 */
function getDatabaseMetrics() {
  return {
    queries: {
      count: queryMetrics.count,
      totalDuration: queryMetrics.totalDuration,
      averageDuration: queryMetrics.count > 0 ? 
        (queryMetrics.totalDuration / queryMetrics.count).toFixed(2) : 0,
      slowQueriesCount: queryMetrics.slowQueries.length
    }
  };
}

/**
 * Reset metrics
 */
function resetMetrics() {
  queryMetrics = {
    count: 0,
    totalDuration: 0,
    slowQueries: []
  };
}

/**
 * Get security configuration metrics
 * @returns {Object} - Security configuration metrics
 */
async function getSecurityMetrics() {
  // Test CSRF configuration
  const csrfResult = await testCsrfConfiguration();
  
  return {
    csrf: {
      status: csrfResult.status,
      message: csrfResult.message,
      details: csrfResult.details,
      timestamp: new Date()
    }
  };
}

// Cache for security metrics to avoid frequent testing
let securityMetricsCache = null;
let securityMetricsTimestamp = null;

/**
 * Get all metrics
 * @returns {Object} - All metrics
 */
async function getAllMetrics() {
  // Check if we need to refresh security metrics (every 5 minutes)
  if (!securityMetricsCache || 
      !securityMetricsTimestamp || 
      (new Date() - securityMetricsTimestamp) > 5 * 60 * 1000) {
    try {
      securityMetricsCache = await getSecurityMetrics();
      securityMetricsTimestamp = new Date();
    } catch (error) {
      logger.error('Error getting security metrics', { error });
      securityMetricsCache = {
        csrf: {
          status: 'error',
          message: 'Error testing CSRF configuration',
          details: error.message,
          timestamp: new Date()
        }
      };
    }
  }
  
  return {
    timestamp: new Date(),
    system: getSystemMetrics(),
    application: getApplicationMetrics(),
    database: getDatabaseMetrics(),
    security: securityMetricsCache
  };
}

/**
 * Log metrics at regular intervals
 * @param {number} interval - Interval in milliseconds
 */
function startMetricsLogging(interval = 300000) { // Default: 5 minutes
  setInterval(() => {
    const metrics = getAllMetrics();
    
    logger.info('Application metrics', { metrics });
    
    // Reset certain metrics after logging
    resetMetrics();
  }, interval);
  
  logger.info('Metrics logging started', { interval });
}

/**
 * Create middleware for request performance monitoring
 * @returns {Function} - Express middleware
 */
function performanceMiddleware() {
  return (req, res, next) => {
    // Record start time
    const start = process.hrtime();
    
    // Add response listener
    res.on('finish', () => {
      // Calculate duration
      const diff = process.hrtime(start);
      const duration = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds
      
      // Log request performance for slow requests
      if (duration > 500) { // Threshold for slow requests: 500ms
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.originalUrl || req.url,
          duration: `${duration.toFixed(2)}ms`,
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.connection.remoteAddress
        });
      }
    });
    
    next();
  };
}

module.exports = {
  getSystemMetrics,
  getApplicationMetrics,
  getDatabaseMetrics,
  getAllMetrics,
  startMetricsLogging,
  performanceMiddleware
};
