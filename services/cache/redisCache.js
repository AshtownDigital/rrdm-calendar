/**
 * Redis Cache Service
 * 
 * This module provides caching functionality using Redis for improved performance.
 * It caches frequently accessed data to reduce database load and improve response times.
 * Falls back to in-memory cache if Redis is not available or disabled.
 */
const config = require('../../config/env');

// Check if Redis is enabled from environment variables
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';
const REDIS_MOCK = process.env.REDIS_MOCK === 'true';

// In-memory cache for fallback when Redis is not available
const memoryCache = new Map();
const memoryCacheExpiry = new Map();

// Initialize Redis client
let redisClient;
let usingRedis = false;

// Log cache mode on startup
console.log(`Cache mode: ${REDIS_ENABLED ? 'Redis' : (REDIS_MOCK ? 'Redis Mock' : 'In-memory')}`);

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
      console.log('Using Redis mock implementation');
      // Create a Redis mock with the same interface
      redisClient = createRedisMock();
    } else {
      console.log('Redis is disabled, using in-memory cache only');
      // Return null to indicate Redis is not available
      return null;
    }
    return redisClient;
  }

  try {
    // Load Redis only if enabled
    const Redis = require('ioredis');
    
    // Get Redis configuration from environment
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      keyPrefix: 'rrdm:',
      retryStrategy: (times) => {
        // Retry connection with exponential backoff
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };

    // Create Redis client
    redisClient = new Redis(redisConfig);
    usingRedis = true;

    // Handle connection events
    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
      usingRedis = false;
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis:', error.message);
    console.log('Falling back to in-memory cache');
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
      const now = Date.now();
      if (memoryCacheExpiry.has(key) && memoryCacheExpiry.get(key) > now) {
        const data = memoryCache.get(key);
        return data ? JSON.parse(data) : null;
      } else if (memoryCacheExpiry.has(key)) {
        // Clean up expired key
        memoryCache.delete(key);
        memoryCacheExpiry.delete(key);
      }
      return null;
    }
    
    // Use Redis or Redis mock
    const client = initializeRedis();
    if (!client) return null;
    
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
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
    console.error('Cache set error:', error);
    
    // Fallback to in-memory cache on error
    try {
      const serializedData = JSON.stringify(data);
      memoryCache.set(key, serializedData);
      memoryCacheExpiry.set(key, Date.now() + (ttl * 1000));
      return true;
    } catch (fallbackError) {
      console.error('In-memory cache fallback error:', fallbackError);
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
    console.error('Cache delete error:', error);
    
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
    
    const keys = await client.keys('rrdm:*');
    
    if (keys.length > 0) {
      await client.del(keys);
    }
    
    // Also clear in-memory cache as a precaution
    memoryCache.clear();
    memoryCacheExpiry.clear();
    
    return true;
  } catch (error) {
    console.error('Cache clear error:', error);
    
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
    console.error('Redis cache getOrSet error:', error);
    
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
    await redisClient.quit();
    redisClient = null;
    usingRedis = false;
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
