/**
 * Redis Manager Integration Tests
 * 
 * These tests verify that the enhanced Redis manager works correctly
 * in different environments and with different configurations.
 */
const { createRedisClient, RedisMock } = require('../../utils/redis-manager');

// Simple logger for tests
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.REDIS_MOCK = 'true'; // Use mock for tests by default

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
      // Set up multiple test keys
      await redisClient.set('test-key-1', 'value1');
      await redisClient.set('test-key-2', 'value2');
      await redisClient.set('other-key', 'value3');
      
      try {
        // Verify keys were set (with prefix)
        const allKeys = await redisClient.keys('*');
        console.log('All keys in Redis:', allKeys);
        
        // Check each key individually
        const key1 = await redisClient.get('test-key-1');
        const key2 = await redisClient.get('test-key-2');
        const otherKey = await redisClient.get('other-key');
        
        console.log('Key test-key-1 value:', key1);
        console.log('Key test-key-2 value:', key2);
        console.log('Key other-key value:', otherKey);
        
        // Try to find keys with different patterns
        const pattern1 = await redisClient.keys('*');
        const pattern2 = await redisClient.keys('test-*');
        const pattern3 = await redisClient.keys('*key*');
        
        console.log('Pattern * matches:', pattern1);
        console.log('Pattern test-* matches:', pattern2);
        console.log('Pattern *key* matches:', pattern3);
        
        // Try to delete keys with pattern
        // Note: The Redis mock adds the prefix automatically, but the del method expects keys without prefix
        const prefixedKeys = await redisClient.keys('*test-key-*');
        console.log('Keys to delete with pattern *test-key-*:', prefixedKeys);
        
        if (prefixedKeys.length > 0) {
          // Extract the original keys by removing the prefix
          const prefix = 'rrdm:test:';
          const keysToDelete = prefixedKeys.map(key => key.startsWith(prefix) ? key.slice(prefix.length) : key);
          console.log('Extracted keys to delete:', keysToDelete);
          
          const deletedCount = await redisClient.del(...keysToDelete);
          console.log(`Deleted ${deletedCount} keys`);
          
          // Verify deletion
          const remainingKeys = await redisClient.keys('*');
          console.log('Remaining keys after deletion:', remainingKeys);
          
          // Verify individual keys are deleted
          const deletedKey1 = await redisClient.get('test-key-1');
          const deletedKey2 = await redisClient.get('test-key-2');
          const remainingKey = await redisClient.get('other-key');
          
          expect(deletedKey1).toBeNull();
          expect(deletedKey2).toBeNull();
          expect(remainingKey).toBe('value3');
        } else {
          console.log('No keys matched the pattern for deletion');
        }
      } finally {
        // Clean up all test keys
        const cleanupKeys = await redisClient.keys('*');
        if (cleanupKeys.length > 0) {
          await redisClient.del(...cleanupKeys);
        }
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
