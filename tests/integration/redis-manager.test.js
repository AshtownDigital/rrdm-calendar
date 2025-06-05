/**
 * Redis Manager Integration Tests
 * 
 * These tests verify that the enhanced Redis manager works correctly
 * in different environments and with different configurations.
 */
const { createRedisClient, RedisMock } = require('../../utils/redis-manager');

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.REDIS_MOCK = 'true'; // Use mock for tests by default

// Set up logging with fallback
let logger;
try {
  const loggerModule = require('../../services/logger');
  logger = loggerModule.logger;
} catch (error) {
  console.warn('Warning: Logger not available, using console fallback');
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
}

describe('Redis Manager Integration Tests', () => {
  let redisClient;
  
  beforeEach(() => {
    // Create a fresh Redis client for each test
    redisClient = createRedisClient({
      keyPrefix: 'rrdm:test:',
      connectTimeout: 1000
    });
  });
  
  afterEach(async () => {
    // Clean up after each test
    if (redisClient) {
      try {
        // Clear all test keys
        const keys = await redisClient.keys('rrdm:test:*');
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
        
        // Close the connection
        await redisClient.quit();
      } catch (error) {
        logger.error('Error cleaning up Redis client:', error);
      }
    }
  });
  
  describe('Basic Operations', () => {
    test('should connect and ping successfully', async () => {
      const result = await redisClient.ping();
      expect(result).toBe('PONG');
    });
    
    test('should set and get a key', async () => {
      const key = 'test-key';
      const value = 'test-value';
      
      await redisClient.set(key, value);
      const result = await redisClient.get(key);
      
      expect(result).toBe(value);
    });
    
    test('should set a key with TTL', async () => {
      const key = 'test-key-ttl';
      const value = 'test-value';
      
      await redisClient.set(key, value, 'EX', 10);
      const ttl = await redisClient.ttl(key);
      
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);
    });
    
    test('should delete a key', async () => {
      const key = 'test-key-delete';
      const value = 'test-value';
      
      await redisClient.set(key, value);
      const beforeDelete = await redisClient.get(key);
      expect(beforeDelete).toBe(value);
      
      await redisClient.del(key);
      const afterDelete = await redisClient.get(key);
      expect(afterDelete).toBeNull();
    });
  });
  
  describe('Pattern Matching', () => {
    test('should find keys matching a pattern', async () => {
      // Set up multiple keys
      await redisClient.set('test-key-1', 'value1');
      await redisClient.set('test-key-2', 'value2');
      await redisClient.set('other-key', 'value3');
      
      const keys = await redisClient.keys('rrdm:test:test-*');
      
      expect(keys).toHaveLength(2);
      expect(keys.some(k => k.includes('test-key-1'))).toBe(true);
      expect(keys.some(k => k.includes('test-key-2'))).toBe(true);
      expect(keys.some(k => k.includes('other-key'))).toBe(false);
    });
    
    test('should delete multiple keys by pattern', async () => {
      // Set up multiple keys with full key format
      await redisClient.set('rrdm:test:test-key-1', 'value1');
      await redisClient.set('rrdm:test:test-key-2', 'value2');
      await redisClient.set('rrdm:test:other-key', 'value3');
      
      try {
        // Find and delete keys matching pattern
        const keys = await redisClient.keys('rrdm:test:test-*');
        expect(keys.length).toBeGreaterThan(0); // Make sure we found some keys
        
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
        
        // Verify the specific test keys were deleted
        const testKey1 = await redisClient.get('rrdm:test:test-key-1');
        const testKey2 = await redisClient.get('rrdm:test:test-key-2');
        const otherKey = await redisClient.get('rrdm:test:other-key');
        
        expect(testKey1).toBeNull();
        expect(testKey2).toBeNull();
        expect(otherKey).toBe('value3');
      } finally {
        // Clean up all test keys
        await redisClient.del([
          'rrdm:test:test-key-1',
          'rrdm:test:test-key-2',
          'rrdm:test:other-key'
        ]);
      }
    });
  });
  
  describe('Error Handling', () => {
    test('should handle invalid commands gracefully', async () => {
      try {
        // Attempt to call a non-existent command
        await redisClient.nonExistentCommand();
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        // Expect an error to be thrown
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('Mock Implementation', () => {
    test('should create a Redis mock when configured', () => {
      // Force mock mode
      process.env.REDIS_MOCK = 'true';
      
      const client = createRedisClient();
      expect(client).toBeInstanceOf(RedisMock);
    });
    
    test('mock should handle TTL correctly', async () => {
      // Ensure we're using the mock
      expect(redisClient).toBeInstanceOf(RedisMock);
      
      const key = 'ttl-test-key';
      await redisClient.set(key, 'value', 'EX', 5);
      
      // Check TTL immediately
      const initialTtl = await redisClient.ttl(key);
      expect(initialTtl).toBeGreaterThan(0);
      expect(initialTtl).toBeLessThanOrEqual(5);
      
      // Wait 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check TTL again, should be lower
      const laterTtl = await redisClient.ttl(key);
      expect(laterTtl).toBeLessThan(initialTtl);
    });
  });
  
  describe('JSON Operations', () => {
    test('should store and retrieve JSON data', async () => {
      const key = 'json-test';
      const data = {
        id: 123,
        name: 'Test User',
        roles: ['admin', 'user'],
        metadata: {
          created: new Date().toISOString(),
          active: true
        }
      };
      
      await redisClient.set(key, JSON.stringify(data));
      const retrieved = await redisClient.get(key);
      const parsedData = JSON.parse(retrieved);
      
      expect(parsedData).toEqual(data);
      expect(parsedData.id).toBe(123);
      expect(parsedData.roles).toHaveLength(2);
      expect(parsedData.metadata.active).toBe(true);
    });
  });
});
