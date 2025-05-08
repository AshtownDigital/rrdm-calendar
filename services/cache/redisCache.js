/**
 * Redis Cache Service
 * 
 * This module provides caching functionality using Redis for improved performance.
 * It caches frequently accessed data to reduce database load and improve response times.
 */
const Redis = require('ioredis');
const config = require('../../config/env');

// Initialize Redis client
let redisClient;

/**
 * Initialize the Redis connection
 */
function initializeRedis() {
  // Only initialize if not already connected
  if (redisClient) {
    return redisClient;
  }

  // Get Redis configuration from environment
  const redisConfig = {
    host: config.redis.host || 'localhost',
    port: config.redis.port || 6379,
    password: config.redis.password,
    keyPrefix: 'rrdm:',
    retryStrategy: (times) => {
      // Retry connection with exponential backoff
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  };

  // Create Redis client
  redisClient = new Redis(redisConfig);

  // Handle connection events
  redisClient.on('connect', () => {
    console.log('Connected to Redis');
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  return redisClient;
}

/**
 * Get cached data by key
 * @param {string} key - The cache key
 * @returns {Promise<any>} - The cached data or null if not found
 */
async function get(key) {
  try {
    const client = initializeRedis();
    const data = await client.get(key);
    
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis cache get error:', error);
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
    const client = initializeRedis();
    await client.set(key, JSON.stringify(data), 'EX', ttl);
    return true;
  } catch (error) {
    console.error('Redis cache set error:', error);
    return false;
  }
}

/**
 * Delete data from the cache
 * @param {string} key - The cache key
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function del(key) {
  try {
    const client = initializeRedis();
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Redis cache delete error:', error);
    return false;
  }
}

/**
 * Clear all cached data with the application prefix
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function clear() {
  try {
    const client = initializeRedis();
    const keys = await client.keys('rrdm:*');
    
    if (keys.length > 0) {
      await client.del(keys);
    }
    
    return true;
  } catch (error) {
    console.error('Redis cache clear error:', error);
    return false;
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
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

module.exports = {
  get,
  set,
  del,
  clear,
  getOrSet,
  close
};
