// Simple direct test for Redis functionality
const { createRedisClient } = require('./utils/redis-manager');

async function testRedis() {
  console.log('Starting Redis direct test...');
  
  // Create a Redis client with test prefix
  const redis = createRedisClient({
    keyPrefix: 'test:',
    connectTimeout: 1000
  });
  
  try {
    // Test basic set and get
    console.log('Testing set and get...');
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    console.log(`Got value: ${value}`);
    
    // Test pattern matching
    console.log('Testing pattern matching...');
    await redis.set('test:key1', 'value1');
    await redis.set('test:key2', 'value2');
    await redis.set('other:key', 'other-value');
    
    const keys = await redis.keys('test:*');
    console.log('Matching keys:', keys);
    
    // Clean up
    console.log('Cleaning up...');
    await redis.del('test-key');
    await redis.del('test:key1');
    await redis.del('test:key2');
    await redis.del('other:key');
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await redis.quit();
  }
}

// Run the test
testRedis().catch(console.error);
