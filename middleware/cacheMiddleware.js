/**
 * Cache Middleware
 * 
 * This middleware provides caching for API responses to improve performance.
 * It uses Redis for caching and supports different cache durations.
 * 
 * Enhanced with robust Redis management for better reliability and development experience.
 */
const { createRedisClient } = require('../utils/redis-manager');
const { cacheTTL } = require('../config/redis');

// Initialize Redis client with cache-specific configuration
const redisClient = createRedisClient({
  keyPrefix: 'rrdm:cache:',
  // Longer timeouts for caching operations
  connectTimeout: 5000,
  // More retries for caching operations
  maxRetriesPerRequest: 3
});

/**
 * Generate a cache key from the request
 * @param {Object} req - Express request object
 * @returns {string} - Cache key
 */
function generateCacheKey(req) {
  // Create a key based on the request path and query parameters
  const path = req.originalUrl || req.url;
  
  // Include user ID in cache key if authenticated to ensure user-specific caching
  const userId = req.user ? req.user.id : 'anonymous';
  
  return `api:${userId}:${path}`;
}

/**
 * Cache middleware factory
 * @param {number} duration - Cache duration in seconds
 * @returns {Function} - Express middleware
 */
function cache(duration = cacheTTL.MEDIUM) {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip caching if header is present
    if (req.headers['x-skip-cache'] === 'true') {
      return next();
    }
    
    // Generate cache key
    const key = generateCacheKey(req);
    
    try {
      // Try to get cached response using the enhanced Redis client
      const cachedResponseJson = await redisClient.get(key);
      
      if (cachedResponseJson) {
        try {
          const cachedResponse = JSON.parse(cachedResponseJson);
          // Set cache header
          res.setHeader('X-Cache', 'HIT');
          
          // Return cached response
          return res.status(cachedResponse.status).json(cachedResponse.data);
        } catch (parseError) {
          console.error('Error parsing cached response:', parseError);
          // Continue as if cache miss
        }
      }
      
      // Cache miss, continue to handler
      res.setHeader('X-Cache', 'MISS');
      
      // Store original JSON method
      const originalJson = res.json;
      
      // Override JSON method to cache response
      res.json = function(data) {
        // Restore original method
        res.json = originalJson;
        
        // Cache the response
        const responseToCache = {
          status: res.statusCode,
          data
        };
        
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // Use the enhanced Redis client with proper error handling
            redisClient.set(key, JSON.stringify(responseToCache), 'EX', duration)
              .catch(err => console.error('Error caching response:', err));
          } catch (cacheError) {
            console.error('Error caching response:', cacheError);
          }
        }
        
        // Call original method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Clear cache for a specific pattern
 * @param {string} pattern - Cache key pattern to clear
 * @returns {Function} - Express middleware
 */
function clearCache(pattern) {
  return async (req, res, next) => {
    try {
      // Use the enhanced Redis client
      // Get keys matching pattern
      const keys = await redisClient.keys(`rrdm:cache:*${pattern}*`);
      
      // Delete keys if any found
      if (keys.length > 0) {
        await redisClient.del(...keys);
        console.log(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
      }
      
      next();
    } catch (error) {
      console.error('Clear cache middleware error:', error);
      next();
    }
  };
}

module.exports = {
  cache,
  clearCache
};
