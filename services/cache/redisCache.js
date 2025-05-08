/**
 * Redis Cache Service
 * 
 * This module provides caching functionality using Redis for improved performance.
 * It caches frequently accessed data to reduce database load and improve response times.
 * Falls back to in-memory cache if Redis is not available or disabled.
 * 
 * Enhanced with robust Redis management for better reliability and development experience.
 */
const config = require('../../config/env');
const { createRedisClient } = require('../../utils/redis-manager');

// Check if Redis is enabled from environment variables
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';
const REDIS_MOCK = process.env.REDIS_MOCK === 'true';

// In-memory cache for fallback when Redis is not available
const memoryCache = new Map();
const memoryCacheExpiry = new Map();

// Initialize Redis client
let redisClient;
let usingRedis = false;

// Set up logging with fallback
let logger;
try {
  const loggerModule = require('../../services/logger');
  logger = loggerModule.logger;
} catch (error) {
  console.warn('Warning: Logger not available in Redis cache, using console fallback');
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
}

// Log cache mode on startup
logger.info(`Cache mode: ${REDIS_ENABLED ? 'Redis' : (REDIS_MOCK ? 'Redis Mock' : 'In-memory')}`, {
  service: 'rrdm-app',
  component: 'redis-cache'
});

/**
 * Initialize the Redis connection or mock implementation
 */
function initializeRedis() {
  // Only initialize if not already connected
  if (redisClient) {
    return redisClient;
  }
  
  // If Redis is disabled, use in-memory cache
  if (!REDIS_ENABLED) {
    if (REDIS_MOCK) {
      logger.info('Using Redis mock implementation', {
        service: 'rrdm-app',
        component: 'redis-cache'
      });
      // Create a Redis mock with the same interface
      redisClient = createRedisMock();
    } else {
      logger.info('Redis is disabled, using in-memory cache only', {
        service: 'rrdm-app',
        component: 'redis-cache'
      });
      // Return null to indicate Redis is not available
      return null;
    }
    return redisClient;
  }

  try {
    // Use the enhanced Redis manager to create a client
    redisClient = createRedisClient({
      keyPrefix: 'rrdm:cache:',
      // Cache-specific configuration
      connectTimeout: 5000,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        // Retry connection with exponential backoff
        const delay = Math.min(times * 100, 3000);
        return delay;
      }
    });
    
    usingRedis = true;
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', {
      service: 'rrdm-app',
      component: 'redis-cache',
      error: error.message
    });
    logger.info('Falling back to in-memory cache', {
      service: 'rrdm-app',
      component: 'redis-cache'
    });
    usingRedis = false;
    return null;
  }
}

/**
 * Create a Redis mock implementation using the in-memory cache
 */
function createRedisMock() {
  return {
    get: async (key) => {
      // Check if key exists and hasn't expired
      const now = Date.now();
      if (memoryCacheExpiry.has(key) && memoryCacheExpiry.get(key) > now) {
        return memoryCache.get(key);
      } else if (memoryCacheExpiry.has(key)) {
        // Clean up expired key
        memoryCache.delete(key);
        memoryCacheExpiry.delete(key);
      }
      return null;
    },
    set: async (key, value, expiryMode, ttl) => {
      memoryCache.set(key, value);
      if (expiryMode === 'EX' && ttl) {
        memoryCacheExpiry.set(key, Date.now() + (ttl * 1000));
      }
      return 'OK';
    },
    del: async (key) => {
      const deleted = memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
      return deleted ? 1 : 0;
    },
    keys: async (pattern) => {
      // Simple pattern matching for keys
      const keys = [];
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          keys.push(key);
        }
      }
      return keys;
    },
    quit: async () => {
      return 'OK';
    },
    on: (event, callback) => {
      // Mock event handling
      if (event === 'connect') {
        setTimeout(callback, 0);
      }
      return this;
    }
  };
}

/**
 * Get cached data by key
 * @param {string} key - The cache key
 * @returns {Promise<any>} - The cached data or null if not found
 */
async function get(key) {
  try {
    // If Redis is disabled and not using mock, use in-memory cache directly
    if (!REDIS_ENABLED && !REDIS_MOCK) {
      // Check if key exists and hasn't expired
      const now = Date.now();
      if (memoryCacheExpiry.has(key) && memoryCacheExpiry.get(key) > now) {
        const cachedData = memoryCache.get(key);
        return cachedData ? JSON.parse(cachedData) : null;
      } else if (memoryCacheExpiry.has(key)) {
        // Clean up expired key
        memoryCache.delete(key);
        memoryCacheExpiry.delete(key);
      }
      return null;
    }
    
    // Use Redis or Redis mock
    const client = initializeRedis();
    if (!client) {
      // Fallback to in-memory if client initialization failed
      const now = Date.now();
      if (memoryCacheExpiry.has(key) && memoryCacheExpiry.get(key) > now) {
        const cachedData = memoryCache.get(key);
        return cachedData ? JSON.parse(cachedData) : null;
      }
      return null;
    }
    
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Cache get error:', {
      service: 'rrdm-app',
      component: 'redis-cache',
      key,
      error: error.message
    });
    return null;
  }
}

/**
 * Set data in the cache
 * @param {string} key - The cache key
 * @param {any} data - The data to cache
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function set(key, data, ttl = 3600) {
  try {
    // If Redis is disabled and not using mock, use in-memory cache directly
    if (!REDIS_ENABLED && !REDIS_MOCK) {
      const serializedData = JSON.stringify(data);
      memoryCache.set(key, serializedData);
      memoryCacheExpiry.set(key, Date.now() + (ttl * 1000));
      return true;
    }
    
    // Use Redis or Redis mock
    const client = initializeRedis();
    if (!client) {
      // Fallback to in-memory if client initialization failed
      const serializedData = JSON.stringify(data);
      memoryCache.set(key, serializedData);
      memoryCacheExpiry.set(key, Date.now() + (ttl * 1000));
      return true;
    }
    
    await client.set(key, JSON.stringify(data), 'EX', ttl);
    return true;
  } catch (error) {
    logger.error('Cache set error:', {
      service: 'rrdm-app',
      component: 'redis-cache',
      key,
      error: error.message
    });
    
    // Fallback to in-memory cache on error
    try {
      const serializedData = JSON.stringify(data);
      memoryCache.set(key, serializedData);
      memoryCacheExpiry.set(key, Date.now() + (ttl * 1000));
      return true;
    } catch (fallbackError) {
      logger.error('In-memory cache fallback error:', {
        service: 'rrdm-app',
        component: 'redis-cache',
        key,
        error: fallbackError.message
      });
      return false;
    }
  }
}

/**
 * Delete data from the cache
 * @param {string} key - The cache key
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function del(key) {
  try {
    // If Redis is disabled and not using mock, use in-memory cache directly
    if (!REDIS_ENABLED && !REDIS_MOCK) {
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
      return true;
    }
    
    // Use Redis or Redis mock
    const client = initializeRedis();
    if (!client) {
      // Fallback to in-memory if client initialization failed
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
      return true;
    }
    
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('Cache delete error:', {
      service: 'rrdm-app',
      component: 'redis-cache',
      key,
      error: error.message
    });
    
    // Try to delete from in-memory cache as fallback
    memoryCache.delete(key);
    memoryCacheExpiry.delete(key);
    return true;
  }
}

/**
 * Clear all cached data with the application prefix
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function clear() {
  try {
    // If Redis is disabled and not using mock, clear in-memory cache directly
    if (!REDIS_ENABLED && !REDIS_MOCK) {
      memoryCache.clear();
      memoryCacheExpiry.clear();
      return true;
    }
    
    // Use Redis or Redis mock
    const client = initializeRedis();
    if (!client) {
      // Fallback to clearing in-memory cache
      memoryCache.clear();
      memoryCacheExpiry.clear();
      return true;
    }
    
    const keys = await client.keys('rrdm:cache:*');
    
    if (keys.length > 0) {
      // Delete keys in batches to avoid command overflow
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await client.del(...batch);
      }
      
      logger.info(`Cleared ${keys.length} cache keys`, {
        service: 'rrdm-app',
        component: 'redis-cache'
      });
    }
    
    // Also clear in-memory cache as a precaution
    memoryCache.clear();
    memoryCacheExpiry.clear();
    
    return true;
  } catch (error) {
    logger.error('Cache clear error:', {
      service: 'rrdm-app',
      component: 'redis-cache',
      error: error.message
    });
    
    // Try to clear in-memory cache as fallback
    memoryCache.clear();
    memoryCacheExpiry.clear();
    return true;
  }
}

/**
 * Get or set cache data with a function to generate the data if not found
 * @param {string} key - The cache key
 * @param {Function} fn - Function to generate data if not in cache
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 * @returns {Promise<any>} - The cached or generated data
 */
async function getOrSet(key, fn, ttl = 3600) {
  try {
    // Try to get from cache first
    const cachedData = await get(key);
    
    if (cachedData !== null) {
      return cachedData;
    }
    
    // Generate data if not in cache
    const data = await fn();
    
    // Cache the generated data
    await set(key, data, ttl);
    
    return data;
  } catch (error) {
    logger.error('Redis cache getOrSet error:', {
      service: 'rrdm-app',
      component: 'redis-cache',
      key,
      error: error.message
    });
    
    // If cache fails, just execute the function
    return fn();
  }
}

/**
 * Close the Redis connection
 * @returns {Promise<void>}
 */
async function close() {
  if (redisClient && usingRedis) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed', {
        service: 'rrdm-app',
        component: 'redis-cache'
      });
    } catch (error) {
      logger.error('Error closing Redis connection', {
        service: 'rrdm-app',
        component: 'redis-cache',
        error: error.message
      });
    } finally {
      redisClient = null;
      usingRedis = false;
    }
  }
  
  // Clear in-memory cache when closing
  memoryCache.clear();
  memoryCacheExpiry.clear();
}

module.exports = {
  get,
  set,
  del,
  clear,
  getOrSet,
  close
};
