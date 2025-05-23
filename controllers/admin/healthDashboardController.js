/**
 * Health Dashboard Controller
 * 
 * Provides functionality for the admin health dashboard, displaying system health,
 * Redis status, and session information.
 */
const os = require('os');
// Using centralized Prisma client
const { prisma } = require('../config/prisma');
const { getRedisManager } = require('../../utils/redis-manager');
const { getSessionManager } = require('../../utils/session-manager');
const { createError, ErrorTypes } = require('../../utils/error-handler');

// Initialize Prisma client
// Prisma client is imported from centralized config

// Initialize Redis manager
const redisManager = getRedisManager();

// Initialize Session manager
const sessionManager = getSessionManager();

// Application start time
const startTime = new Date();

// Request metrics
let requestCount = 0;
let errorCount = 0;
let responseTimes = [];

/**
 * Format bytes to a human-readable format
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format milliseconds to a human-readable format
 * @param {number} ms - Milliseconds to format
 * @returns {string} Formatted string
 */
function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(2)}m`;
  
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(2)}h`;
  
  const days = hours / 24;
  return `${days.toFixed(2)}d`;
}

/**
 * Get system information
 * @returns {Object} System information
 */
function getSystemInfo() {
  const uptime = os.uptime() * 1000; // Convert to milliseconds
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryPercentage = ((usedMem / totalMem) * 100).toFixed(2);
  
  // Get CPU usage
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  
  const cpuPercentage = (100 - (totalIdle / totalTick) * 100).toFixed(2);
  
  return {
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: formatTime(uptime),
    memoryUsage: `${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memoryPercentage}%)`,
    cpuUsage: `${cpuPercentage}%`
  };
}

/**
 * Get application information
 * @returns {Object} Application information
 */
function getApplicationInfo() {
  // Calculate average response time
  const avgResponseTime = responseTimes.length > 0
    ? formatTime(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 'N/A';
  
  // Get package.json version if available
  let version = 'Unknown';
  try {
    const packageJson = require('../../package.json');
    version = packageJson.version;
  } catch (error) {
    console.error('Error reading package.json:', error);
  }
  
  return {
    version,
    startTime,
    requestCount,
    errorCount,
    avgResponseTime
  };
}

/**
 * Check database health
 * @returns {Promise<Object>} Database health status
 */
async function checkDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    // Simple query to test database connection
    await prisma.$queryRaw`SELECT 1 as result`;
    
    const responseTime = formatTime(Date.now() - startTime);
    
    return {
      status: 'up',
      responseTime,
      error: null
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return {
      status: 'down',
      responseTime: formatTime(Date.now() - startTime),
      error: error.message
    };
  }
}

/**
 * Check Redis health
 * @returns {Promise<Object>} Redis health status
 */
async function checkRedisHealth() {
  const redisEnabled = process.env.REDIS_ENABLED === 'true';
  const redisMock = process.env.REDIS_MOCK === 'true';
  
  if (!redisEnabled) {
    return {
      status: 'degraded',
      implementation: 'Disabled',
      error: 'Redis is disabled in configuration'
    };
  }
  
  const startTime = Date.now();
  
  try {
    const redisClient = redisManager.getClient();
    
    // Test Redis connection with PING
    const pingResult = await redisClient.ping();
    
    const responseTime = formatTime(Date.now() - startTime);
    
    return {
      status: pingResult === 'PONG' ? 'up' : 'degraded',
      responseTime,
      implementation: redisMock ? 'Mock' : 'Real',
      error: null
    };
  } catch (error) {
    console.error('Redis health check failed:', error);
    
    return {
      status: 'down',
      responseTime: formatTime(Date.now() - startTime),
      implementation: redisMock ? 'Mock' : 'Real',
      error: error.message
    };
  }
}

/**
 * Get session information
 * @returns {Promise<Object>} Session information
 */
async function getSessionInfo() {
  try {
    // Get all sessions
    const sessions = await prisma.session.findMany();
    
    // Count active users (sessions with a user ID)
    const activeUsers = sessions.filter(session => {
      try {
        const data = JSON.parse(session.data);
        return data.passport && data.passport.user;
      } catch (error) {
        return false;
      }
    }).length;
    
    // Count sessions expiring in the next hour
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const expiringSoon = sessions.filter(session => {
      return new Date(session.expires) < oneHourFromNow;
    }).length;
    
    // Get last cleanup time from Redis if available
    let lastCleanup = null;
    try {
      const redisClient = redisManager.getClient();
      const lastCleanupStr = await redisClient.get('rrdm:session:lastCleanup');
      if (lastCleanupStr) {
        lastCleanup = new Date(lastCleanupStr);
      }
    } catch (error) {
      console.error('Error getting last cleanup time:', error);
    }
    
    return {
      total: sessions.length,
      activeUsers,
      expiringSoon,
      lastCleanup
    };
  } catch (error) {
    console.error('Error getting session info:', error);
    
    return {
      total: 0,
      activeUsers: 0,
      expiringSoon: 0,
      lastCleanup: null
    };
  }
}

/**
 * Render the health dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.renderHealthDashboard = async (req, res, next) => {
  try {
    // Track request
    requestCount++;
    const requestStartTime = Date.now();
    
    // Get health information
    const [databaseHealth, redisHealth, sessionInfo] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      getSessionInfo()
    ]);
    
    // Determine overall status
    let overallStatus = 'up';
    if (databaseHealth.status === 'down' || redisHealth.status === 'down') {
      overallStatus = 'down';
    } else if (databaseHealth.status === 'degraded' || redisHealth.status === 'degraded') {
      overallStatus = 'degraded';
    }
    
    // Prepare health data
    const healthData = {
      status: overallStatus,
      timestamp: new Date(),
      components: {
        database: databaseHealth,
        redis: redisHealth,
        system: getSystemInfo(),
        application: getApplicationInfo()
      }
    };
    
    // Track response time
    const responseTime = Date.now() - requestStartTime;
    responseTimes.push(responseTime);
    
    // Keep only the last 100 response times
    if (responseTimes.length > 100) {
      responseTimes.shift();
    }
    
    // Render the dashboard
    res.render('admin/health-dashboard', {
      health: healthData,
      sessions: sessionInfo
    });
  } catch (error) {
    // Track error
    errorCount++;
    
    // Pass to error handler
    next(createError('Failed to render health dashboard', ErrorTypes.SERVER, { originalError: error }));
  }
};

/**
 * Middleware to track request metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.trackRequestMetrics = (req, res, next) => {
  const startTime = Date.now();
  
  // Track response time when the response is finished
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Only track API and page requests, not assets
    const path = req.path;
    if (!path.startsWith('/assets') && 
        !path.startsWith('/scripts') && 
        !path.startsWith('/stylesheets')) {
      
      requestCount++;
      
      // Track response time
      responseTimes.push(responseTime);
      
      // Keep only the last 100 response times
      if (responseTimes.length > 100) {
        responseTimes.shift();
      }
      
      // Track errors (status >= 400)
      if (res.statusCode >= 400) {
        errorCount++;
      }
    }
  });
  
  next();
};
