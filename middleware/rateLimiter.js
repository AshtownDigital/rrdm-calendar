/**
 * Rate Limiter Middleware
 * 
 * This middleware provides rate limiting for API endpoints to prevent abuse.
 * It uses Redis to store rate limit information across multiple instances when available,
 * with fallback to memory store for serverless environments.
 * Optimized for Vercel serverless deployment with Neon PostgreSQL.
 */
const rateLimit = require('express-rate-limit');

// Import environment configuration
const config = require('../config/env');

// Initialize logger with fallback
let logger;
try {
  const loggerModule = require('../services/logger');
  logger = loggerModule.logger;
} catch (error) {
  console.warn('Warning: Logger not available in rate limiter, using console fallback');
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
}

// Detect serverless environment
const isServerless = process.env.VERCEL === '1';
const isRedisEnabled = process.env.REDIS_ENABLED !== 'false';

// Create Redis client for rate limiting if enabled and not in serverless
let redisClient = null;
let redisStore = null;

// Only attempt to use Redis if not in serverless mode or explicitly enabled
if (!isServerless || (isServerless && isRedisEnabled)) {
  try {
    // Dynamically import Redis to avoid issues in environments where it's not available
    const Redis = require('ioredis');
    const { redisConfig } = require('../config/redis');
    
    // Create a simplified config for rate limiting
    const rateLimitRedisConfig = {
      host: process.env.REDIS_HOST || redisConfig?.host || 'localhost',
      port: parseInt(process.env.REDIS_PORT || redisConfig?.port || '6379', 10),
      password: process.env.REDIS_PASSWORD || redisConfig?.password,
      // Shorter timeouts for rate limiting
      connectTimeout: 2000,
      // Don't retry connections for rate limiting
      retryStrategy: () => null
    };
    
    // Create Redis client
    redisClient = new Redis(rateLimitRedisConfig);
    
    // Set up error handling
    redisClient.on('error', (err) => {
      logger.error('Redis rate limiter error', { error: err.message });
      // Don't crash on Redis errors
    });
    
    // Test connection
    redisClient.ping().then(() => {
      logger.info('Redis connected for rate limiting');
      
      // Only create Redis store if ping succeeds
      try {
        const RedisStore = require('rate-limit-redis');
        redisStore = new RedisStore({
          // Use sendCommand directly to avoid compatibility issues
          sendCommand: (...args) => redisClient.call(...args)
        });
        logger.info('Redis store created for rate limiting');
      } catch (storeError) {
        logger.error('Failed to create Redis store for rate limiting', { error: storeError.message });
      }
    }).catch(err => {
      logger.error('Redis ping failed for rate limiting', { error: err.message });
    });
  } catch (error) {
    logger.error('Failed to initialize Redis for rate limiting', { error: error.message });
  }
} else {
  logger.info('Using memory store for rate limiting in serverless environment');
}

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.keyPrefix - Key prefix for Redis
 * @param {boolean} options.skipSuccessfulRequests - Whether to skip counting successful requests
 * @param {boolean} options.enabled - Whether rate limiting is enabled (defaults to true)
 * @returns {Function} - Express middleware
 */
function createRateLimiter({
  windowMs = 60 * 1000, // 1 minute
  max = 100, // 100 requests per minute
  keyPrefix = 'rrdm:ratelimit:',
  skipSuccessfulRequests = false,
  enabled = true
} = {}) {
  // If rate limiting is disabled or we're in serverless mode with Redis disabled,
  // return a pass-through middleware
  if (!enabled || (isServerless && !isRedisEnabled)) {
    logger.info(`Rate limiting disabled for prefix ${keyPrefix}`);
    return (req, res, next) => next();
  }
  
  // Use Redis store if available, otherwise use memory store
  const store = redisStore ? 
    { 
      ...redisStore,
      prefix: keyPrefix 
    } : 
    undefined; // Default to memory store
  
  // Create rate limiter
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests,
    
    // Use Redis store if available
    store,
    
    // Custom key generator based on IP and user ID
    keyGenerator: (req) => {
      const userId = req.user ? req.user.id : 'anonymous';
      return `${req.ip}:${userId}`;
    },
    
    // Custom handler for when rate limit is exceeded
    handler: (req, res) => {
      const userId = req.user ? req.user.id : 'anonymous';
      
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId,
        path: req.originalUrl || req.url,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          status: 429
        }
      });
    }
  });
  
  return limiter;
}

/**
 * API rate limiter middleware
 * Stricter limits for API endpoints
 */
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyPrefix: 'rrdm:ratelimit:api:',
  // Check environment variable to enable/disable rate limiting
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false'
});

/**
 * Authentication rate limiter middleware
 * Stricter limits for authentication endpoints
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10), // 10 requests per 15 minutes by default
  keyPrefix: 'rrdm:ratelimit:auth:',
  // Check environment variable to enable/disable rate limiting
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false'
});

/**
 * General rate limiter middleware
 * Less strict limits for general endpoints
 */
const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10), // 300 requests per minute by default
  keyPrefix: 'rrdm:ratelimit:general:',
  skipSuccessfulRequests: true,
  // Check environment variable to enable/disable rate limiting
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false'
});

/**
 * Fallback middleware for serverless environments
 * This is used when Redis is not available
 */
const serverlessFallbackLimiter = (req, res, next) => {
  // Simple pass-through middleware for serverless environments
  next();
};

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  generalLimiter,
  serverlessFallbackLimiter
};
