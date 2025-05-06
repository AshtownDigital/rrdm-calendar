/**
 * Simple in-memory cache utility for RRDM
 * 
 * This provides a basic caching mechanism to improve performance
 * for frequently accessed data.
 */

class Cache {
  constructor(ttlSeconds = 300) { // Default TTL: 5 minutes
    this.cache = new Map();
    this.ttlSeconds = ttlSeconds;
  }

  /**
   * Get a value from the cache
   * @param {string} key - The cache key
   * @returns {any|null} - The cached value or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    const now = Date.now();
    if (now > item.expiry) {
      this.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * Set a value in the cache
   * @param {string} key - The cache key
   * @param {any} value - The value to cache
   * @param {number} [ttlSeconds] - Optional TTL override
   */
  set(key, value, ttlSeconds = this.ttlSeconds) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete a value from the cache
   * @param {string} key - The cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all values from the cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get a cached value or compute it if not in cache
   * @param {string} key - The cache key
   * @param {Function} fetchFn - Function to fetch the value if not cached
   * @param {number} [ttlSeconds] - Optional TTL override
   * @returns {Promise<any>} - The cached or computed value
   */
  async getOrSet(key, fetchFn, ttlSeconds = this.ttlSeconds) {
    const cachedValue = this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    const value = await fetchFn();
    this.set(key, value, ttlSeconds);
    return value;
  }
}

// Create cache instances with different TTLs
const shortCache = new Cache(60); // 1 minute
const mediumCache = new Cache(300); // 5 minutes
const longCache = new Cache(3600); // 1 hour

module.exports = {
  shortCache,
  mediumCache,
  longCache,
  Cache
};
