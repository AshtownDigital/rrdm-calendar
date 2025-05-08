/**
 * Test Redis Manager Script
 * 
 * This script tests the enhanced Redis manager implementation to ensure
 * it's working correctly in both real Redis and mock modes.
 */
const { createRedisClient } = require('../utils/redis-manager');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment configuration
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envFile}`);
  dotenv.config({ path: envPath });
} else {
  console.log('Environment file not found, using default .env');
  dotenv.config();
}

// Set up logging with fallback
let logger;
try {
  const loggerModule = require('../services/logger');
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

async function testRedisManager() {
  logger.info('🔍 Testing Redis Manager Implementation');
  logger.info(`Redis Enabled: ${process.env.REDIS_ENABLED !== 'false' ? 'Yes' : 'No'}`);
  logger.info(`Redis Mock: ${process.env.REDIS_MOCK === 'true' ? 'Yes' : 'No'}`);
  
  // Create Redis client with test-specific configuration
  const redisClient = createRedisClient({
    keyPrefix: 'rrdm:test:',
    connectTimeout: 3000
  });
  
  try {
    // Test basic operations
    logger.info('\n1. Testing connection...');
    const pingResult = await redisClient.ping();
    logger.info(`Ping result: ${pingResult}`);
    
    // Test set and get
    logger.info('\n2. Testing set/get operations...');
    const testKey = 'test-key';
    const testValue = { message: 'Hello from Redis Manager Test', timestamp: new Date().toISOString() };
    
    await redisClient.set(testKey, JSON.stringify(testValue), 'EX', 60);
    logger.info(`Set key "${testKey}" with value`);
    
    const retrievedValue = await redisClient.get(testKey);
    logger.info(`Retrieved value: ${retrievedValue}`);
    logger.info(`Parsed value: ${JSON.stringify(JSON.parse(retrievedValue), null, 2)}`);
    
    // Test TTL
    logger.info('\n3. Testing TTL...');
    const ttl = await redisClient.ttl(testKey);
    logger.info(`TTL for "${testKey}": ${ttl} seconds`);
    
    // Test keys pattern matching
    logger.info('\n4. Testing keys pattern matching...');
    await redisClient.set('test-key-2', 'value2', 'EX', 60);
    await redisClient.set('test-key-3', 'value3', 'EX', 60);
    
    const keys = await redisClient.keys('rrdm:test:test-*');
    logger.info(`Found ${keys.length} keys matching pattern:`);
    keys.forEach(key => logger.info(`- ${key}`));
    
    // Test deletion
    logger.info('\n5. Testing deletion...');
    await redisClient.del(testKey);
    const afterDelete = await redisClient.get(testKey);
    logger.info(`After deletion, value is: ${afterDelete === null ? 'null (as expected)' : afterDelete}`);
    
    // Test multi-key deletion
    logger.info('\n6. Testing multi-key deletion...');
    const remainingKeys = await redisClient.keys('rrdm:test:test-*');
    if (remainingKeys.length > 0) {
      await redisClient.del(...remainingKeys);
      logger.info(`Deleted ${remainingKeys.length} remaining keys`);
    }
    
    // Test pub/sub if available
    if (typeof redisClient.publish === 'function') {
      logger.info('\n7. Testing pub/sub functionality...');
      const channel = 'test-channel';
      const message = 'Hello from pub/sub test';
      
      // Create a subscriber client
      const subscriberClient = createRedisClient({
        keyPrefix: 'rrdm:test:',
        connectTimeout: 3000
      });
      
      // Set up subscription
      await subscriberClient.subscribe(channel);
      subscriberClient.on('message', (ch, msg) => {
        logger.info(`Received message on channel "${ch}": ${msg}`);
        
        // Unsubscribe after receiving message
        subscriberClient.unsubscribe(channel).then(() => {
          logger.info('Unsubscribed from channel');
          subscriberClient.quit();
        });
      });
      
      // Publish a message
      await redisClient.publish(channel, message);
      logger.info(`Published message to channel "${channel}"`);
      
      // Wait a moment for the message to be received
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    logger.info('\n✅ Redis Manager test completed successfully!');
  } catch (error) {
    logger.error('❌ Error testing Redis Manager:', error);
  } finally {
    // Close the Redis connection
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (quitError) {
      logger.error('Error closing Redis connection:', quitError);
    }
  }
}

// Run the test
testRedisManager()
  .then(() => {
    logger.info('\nRedis Manager test script completed');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
