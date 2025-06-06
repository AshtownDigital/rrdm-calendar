/**
 * Enhanced Redis Manager
 * 
 * This utility provides a more robust approach to Redis management,
 * offering both a real Redis client and a sophisticated mock implementation
 * for development environments.
 */
const Redis = require('ioredis');
const { EventEmitter } = require('events');

// Initialize logger with fallback
let logger;
try {
  const loggerModule = require('../services/logger');
  logger = loggerModule.logger;
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn('Warning: Logger not available in Redis manager, using console fallback');
  logger = {
    // eslint-disable-next-line no-console
    info: console.log,
    // eslint-disable-next-line no-console
    warn: console.warn,
    // eslint-disable-next-line no-console
    error: console.error,
    // eslint-disable-next-line no-console
    debug: console.debug
  };
}

/**
 * Sophisticated Redis mock implementation that better mimics production behavior
 */
class RedisMock extends EventEmitter {
  constructor(options = {}) {
    super();
    this.data = new Map();
    this.connected = true;
    this.keyPrefix = options.keyPrefix || '';
    this.ttlData = new Map();
    
    // Log initialization
    logger.info('Redis Mock initialized', {
      service: 'rrdm-app',
      component: 'redis-mock'
    });
    
    // Emit ready event asynchronously to mimic real Redis behavior
    setTimeout(() => {
      this.emit('ready');
      this.emit('connect');
    }, 0);
    
    // Start TTL cleanup interval
    this.ttlInterval = setInterval(() => this.processTtlExpiry(), 1000);
    // Ensure interval is unref'd to not keep process alive
    this.ttlInterval.unref();
  }
  
  /**
   * Process TTL expiration for keys
   */
  processTtlExpiry() {
    const now = Date.now();
    
    for (const [key, expiryTime] of this.ttlData.entries()) {
      if (expiryTime <= now) {
        this.data.delete(key);
        this.ttlData.delete(key);
        this.emit('message', '__keyevent@0__:expired', key);
      }
    }
  }
  
  /**
   * Prefixes a key with the configured prefix
   * @param {string} key - The key to prefix
   * @returns {string} The prefixed key
   */
  prefixKey(key) {
    return this.keyPrefix + key;
  }
  
  /**
   * Set a key with optional TTL
   * @param {string} key - The key to set
   * @param {string} value - The value to set
   * @param {string} mode - Optional mode (EX, PX, etc.)
   * @param {number} duration - Optional TTL duration
   * @returns {Promise<string>} "OK" on success
   */
  async set(key, value, mode, duration) {
    const prefixedKey = this.prefixKey(key);
    this.data.set(prefixedKey, value);
    
    // Handle TTL if specified
    if (mode && duration) {
      let ttl = duration;
      
      // Convert to milliseconds if needed
      if (mode.toUpperCase() === 'EX') {
        ttl = duration * 1000; // Convert seconds to milliseconds
      }
      
      this.ttlData.set(prefixedKey, Date.now() + ttl);
    } else {
      // Remove any existing TTL
      this.ttlData.delete(prefixedKey);
    }
    
    return 'OK';
  }
  
  /**
   * Get a key's value
   * @param {string} key - The key to get
   * @returns {Promise<string|null>} The value or null if not found
   */
  async get(key) {
    const prefixedKey = this.prefixKey(key);
    return this.data.get(prefixedKey) || null;
  }
  
  /**
   * Delete one or more keys
   * @param {...string} keys - The keys to delete
   * @returns {Promise<number>} Number of keys deleted
   */
  async del(...keys) {
    let count = 0;
    
    // Handle both direct calls and array arguments
    const keyArray = keys.flat();
    
    for (const key of keyArray) {
      const prefixedKey = this.prefixKey(key);
      if (this.data.has(prefixedKey)) {
        this.data.delete(prefixedKey);
        this.ttlData.delete(prefixedKey);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Check if a key exists
   * @param {string} key - The key to check
   * @returns {Promise<number>} 1 if exists, 0 otherwise
   */
  async exists(key) {
    const prefixedKey = this.prefixKey(key);
    return this.data.has(prefixedKey) ? 1 : 0;
  }
  
  /**
   * Set a key's time to live in seconds
   * @param {string} key - The key to set TTL for
   * @param {number} seconds - TTL in seconds
   * @returns {Promise<number>} 1 if set, 0 if key doesn't exist
   */
  async expire(key, seconds) {
    const prefixedKey = this.prefixKey(key);
    
    if (!this.data.has(prefixedKey)) {
      return 0;
    }
    
    this.ttlData.set(prefixedKey, Date.now() + (seconds * 1000));
    return 1;
  }
  
  /**
   * Get the remaining time to live of a key
   * @param {string} key - The key to check
   * @returns {Promise<number>} TTL in seconds, -1 if no TTL, -2 if key doesn't exist
   */
  async ttl(key) {
    const prefixedKey = this.prefixKey(key);
    
    if (!this.data.has(prefixedKey)) {
      return -2;
    }
    
    const ttl = this.ttlData.get(prefixedKey);
    
    if (!ttl) {
      return -1;
    }
    
    const remainingMs = ttl - Date.now();
    return Math.ceil(remainingMs / 1000);
  }
  
  /**
   * Increment a key's integer value
   * @param {string} key - The key to increment
   * @returns {Promise<number>} The new value
   */
  async incr(key) {
    const prefixedKey = this.prefixKey(key);
    const currentValue = parseInt(this.data.get(prefixedKey) || '0', 10);
    const newValue = currentValue + 1;
    this.data.set(prefixedKey, newValue.toString());
    return newValue;
  }
  
  /**
   * Ping the Redis server
   * @returns {Promise<string>} "PONG"
   */
  async ping() {
    return 'PONG';
  }
  
  /**
   * Close the Redis connection
   */
  disconnect() {
    this.connected = false;
    clearInterval(this.ttlInterval);
    this.emit('end');
    this.emit('close');
    
    logger.info('Redis Mock disconnected', {
      service: 'rrdm-app',
      component: 'redis-mock'
    });
  }
  
  /**
   * Alias for disconnect to match Redis client API
   * @returns {Promise<string>} "OK"
   */
  async quit() {
    this.disconnect();
    return 'OK';
  }
  
  /**
   * Subscribe to a channel
   * @param {string} channel - The channel to subscribe to
   * @returns {Promise<void>}
   */
  async subscribe(channel) {
    this.emit('subscribe', channel, 1);
    return;
  }
  
  /**
   * Get all keys matching a pattern
   * @param {string} pattern - The pattern to match
   * @returns {Promise<string[]>} Array of matching keys
   */
  async keys(pattern) {
    const result = [];
    // Escape special regex characters except * which we'll convert to .*
    const escapedPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape all special regex chars
      .replace(/\*/g, '.*'); // Convert * to .* for wildcard matching
    
    const regex = new RegExp(`^${escapedPattern}$`);
    
    for (const key of this.data.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    
    return result;
  }
  
  /**
   * Publish a message to a channel
   * @param {string} channel - The channel to publish to
   * @param {string} message - The message to publish
   * @returns {Promise<number>} Number of clients that received the message
   */
  async publish(channel, message) {
    this.emit('message', channel, message);
    return 1;
  }
}

/**
 * Creates a Redis client based on environment configuration
 * @param {Object} options - Redis client options
 * @returns {Object} Redis client or mock
 */
const createRedisClient = (options = {}) => {
  const redisEnabled = process.env.REDIS_ENABLED === 'true';
  const redisMock = process.env.REDIS_MOCK === 'true';
  
  // Default options
  const defaultOptions = {
    keyPrefix: 'rrdm:',
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3
  };
  
  // Merge options
  const clientOptions = {
    ...defaultOptions,
    ...options
  };
  
  // If Redis is disabled or mock is enabled, use mock implementation
  if (!redisEnabled || redisMock) {
    logger.info('Using Redis Mock', {
      service: 'rrdm-app',
      component: 'redis'
    });
    return new RedisMock(clientOptions);
  }
  
  // Otherwise, use real Redis client
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  logger.info('Connecting to Redis', {
    service: 'rrdm-app',
    component: 'redis',
    url: redisUrl.replace(/\/\/.*@/, '//***:***@') // Hide credentials in logs
  });
  
  const client = new Redis(redisUrl, clientOptions);
  
  // Add event listeners
  client.on('connect', () => {
    logger.info('Redis connected', {
      service: 'rrdm-app',
      component: 'redis'
    });
  });
  
  client.on('error', (err) => {
    logger.error('Redis error', {
      service: 'rrdm-app',
      component: 'redis',
      error: err.message
    });
  });
  
  client.on('close', () => {
    logger.info('Redis connection closed', {
      service: 'rrdm-app',
      component: 'redis'
    });
  });
  
  return client;
};

module.exports = {
  createRedisClient,
  RedisMock
};
