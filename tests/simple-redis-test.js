const { createRedisClient } = require('./utils/redis-manager');

describe('Simple Redis Test', () => {
  let redisClient;
  
  beforeAll(() => {
    // Create a fresh Redis client for the test
    redisClient = createRedisClient({
      keyPrefix: 'test:',
      connectTimeout: 1000
    });
  });
  
  afterAll(async () => {
    // Clean up and close the connection
    if (redisClient) {
      await redisClient.quit();
    }
  });
  
  test('should set and get a value', async () => {
    const key = 'simple-test-key';
    const value = 'test-value';
    
    // Set a value
    await redisClient.set(key, value);
    
    // Get the value back
    const result = await redisClient.get(key);
    
    // Clean up
    await redisClient.del(key);
    
    expect(result).toBe(value);
  });
});
