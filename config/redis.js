/**
 * Redis Configuration
 * 
 * This module provides Redis configuration for caching and session storage.
 * It supports different environments (development, staging, production).
 */
const config = require('./env');

// Default Redis configuration
const redisConfig = {
  // Default host (localhost for development, Redis service for production)
  host: process.env.REDIS_HOST || 'localhost',
  
  // Default port
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  
  // Password (if required)
  password: process.env.REDIS_PASSWORD || undefined,
  
  // Database index
  db: parseInt(process.env.REDIS_DB || '0', 10),
  
  // Key prefix for the application
  keyPrefix: `rrdm:${config.env}:`,
  
  // Connection timeout in milliseconds
  connectTimeout: 10000,
  
  // Enable TLS for production
  tls: config.isProd ? {} : undefined,
  
  // Retry strategy for connection failures
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);
    return delay;
  }
};

// Cache TTL (Time To Live) settings in seconds
const cacheTTL = {
  // Short-lived cache (5 minutes)
  SHORT: 300,
  
  // Medium-lived cache (1 hour)
  MEDIUM: 3600,
  
  // Long-lived cache (1 day)
  LONG: 86400,
  
  // Very long-lived cache (1 week)
  VERY_LONG: 604800
};

// Cache key patterns
const cacheKeys = {
  // Reference data cache keys
  REFERENCE_DATA: {
    ALL_ITEMS: 'ref-data:items:all',
    ITEM: (id) => `ref-data:item:${id}`,
    ITEM_VALUES: (id) => `ref-data:item:${id}:values`
  },
  
  // BCR cache keys
  BCR: {
    ALL_SUBMISSIONS: 'bcr:submissions:all',
    SUBMISSION: (id) => `bcr:submission:${id}`,
    CONFIG: 'bcr:config'
  },
  
  // Funding cache keys
  FUNDING: {
    REQUIREMENTS: 'funding:requirements',
    HISTORY: 'funding:history',
    ALLOCATIONS: 'funding:allocations'
  },
  
  // User cache keys
  USER: {
    PROFILE: (id) => `user:${id}:profile`
  }
};

module.exports = {
  redisConfig,
  cacheTTL,
  cacheKeys
};
