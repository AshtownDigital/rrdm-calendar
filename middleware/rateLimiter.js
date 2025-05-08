/**
 * Rate Limiter Middleware
 * 
 * This middleware provides rate limiting for API endpoints to prevent abuse.
 * It uses Redis to store rate limit information across multiple instances.
 */
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const config = require('../config/env');
const { redisConfig } = require('../config/redis');
const { logger } = require('../services/logger');

// Create Redis client for rate limiting
let redisClient;

try {
  redisClient = new Redis(redisConfig);
  
  redisClient.on('error', (err) => {
    logger.error('Redis rate limiter error', { error: err.message });
  });
} catch (error) {
  logger.error('Failed to initialize Redis for rate limiting', { error: error.message });
}

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.keyPrefix - Key prefix for Redis
 * @param {boolean} options.skipSuccessfulRequests - Whether to skip counting successful requests
 * @returns {Function} - Express middleware
 */
function createRateLimiter({
  windowMs = 60 * 1000, // 1 minute
  max = 100, // 100 requests per minute
  keyPrefix = 'rrdm:ratelimit:',
  skipSuccessfulRequests = false
} = {}) {
  // Use Redis store if available, otherwise use memory store
  const store = redisClient ? 
    new RedisStore({
      client: redisClient,
      prefix: keyPrefix
    }) : 
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
  keyPrefix: 'rrdm:ratelimit:api:'
});

/**
 * Authentication rate limiter middleware
 * Stricter limits for authentication endpoints
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  keyPrefix: 'rrdm:ratelimit:auth:'
});

/**
 * General rate limiter middleware
 * Less strict limits for general endpoints
 */
const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  keyPrefix: 'rrdm:ratelimit:general:',
  skipSuccessfulRequests: true
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  generalLimiter
};
