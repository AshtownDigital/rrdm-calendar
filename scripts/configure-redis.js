/**
 * Redis Configuration Script
 * 
 * This script helps configure Redis for different environments.
 * It can be used to:
 * 1. Test Redis connectivity
 * 2. Set up Redis for development, staging, or production
 * 3. Verify Redis configuration for Vercel deployment
 */
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { createRedisClient } = require('../utils/redis-manager');

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

// Load environment variables
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envFile}`);
  dotenv.config({ path: envPath });
} else {
  console.log('Environment file not found, using default .env');
  dotenv.config();
}

/**
 * Test Redis connectivity
 */
async function testRedisConnection() {
  console.log('\n🔍 Testing Redis Connection');
  console.log('==========================');
  console.log(`Redis Enabled: ${process.env.REDIS_ENABLED !== 'false' ? 'Yes' : 'No'}`);
  console.log(`Redis Mock: ${process.env.REDIS_MOCK === 'true' ? 'Yes' : 'No'}`);
  console.log(`Redis URL: ${process.env.REDIS_URL ? 'Set' : 'Not set'}`);
  
  // Create Redis client
  const redisClient = createRedisClient({
    keyPrefix: 'rrdm:config-test:',
    connectTimeout: 5000
  });
  
  try {
    // Test connection
    console.log('\nTesting connection...');
    const pingResult = await redisClient.ping();
    console.log(`Ping result: ${pingResult}`);
    
    // Test basic operations
    console.log('\nTesting basic operations...');
    const testKey = 'test-key';
    const testValue = { message: 'Hello from Redis Config Test', timestamp: new Date().toISOString() };
    
    await redisClient.set(testKey, JSON.stringify(testValue), 'EX', 60);
    console.log(`Set key "${testKey}" with value`);
    
    const retrievedValue = await redisClient.get(testKey);
    console.log(`Retrieved value: ${retrievedValue}`);
    
    // Clean up
    await redisClient.del(testKey);
    console.log('Test key deleted');
    
    console.log('\n✅ Redis connection test successful!');
    return true;
  } catch (error) {
    console.error('\n❌ Redis connection test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  } finally {
    // Close the Redis connection
    try {
      await redisClient.quit();
      console.log('Redis connection closed');
    } catch (quitError) {
      console.error('Error closing Redis connection:', quitError.message);
    }
  }
}

/**
 * Configure Redis for Vercel deployment
 */
async function configureForVercel() {
  console.log('\n🚀 Configuring Redis for Vercel Deployment');
  console.log('=======================================');
  
  // Check if required environment variables are set
  const requiredVars = ['REDIS_URL', 'REDIS_ENABLED'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.log('\nPlease add the following to your .env file or Vercel environment variables:');
    
    missingVars.forEach(varName => {
      if (varName === 'REDIS_URL') {
        console.log('REDIS_URL=redis://username:password@host:port');
      } else if (varName === 'REDIS_ENABLED') {
        console.log('REDIS_ENABLED=true');
      }
    });
    
    return false;
  }
  
  // Verify Redis connection
  console.log('\nVerifying Redis connection...');
  const connectionSuccess = await testRedisConnection();
  
  if (!connectionSuccess) {
    console.error('❌ Redis connection verification failed. Please check your configuration.');
    return false;
  }
  
  console.log('\n✅ Redis is properly configured for Vercel deployment!');
  console.log('\nMake sure the following environment variables are set in your Vercel project:');
  console.log('- REDIS_ENABLED=true');
  console.log('- REDIS_MOCK=false');
  console.log('- REDIS_URL=<your-redis-url>');
  
  return true;
}

/**
 * Display Redis configuration
 */
function displayRedisConfig() {
  console.log('\n📋 Current Redis Configuration');
  console.log('===========================');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Redis Enabled: ${process.env.REDIS_ENABLED !== 'false' ? 'Yes' : 'No'}`);
  console.log(`Redis Mock: ${process.env.REDIS_MOCK === 'true' ? 'Yes' : 'No'}`);
  
  if (process.env.REDIS_URL) {
    // Hide credentials in the URL
    const redisUrl = process.env.REDIS_URL.replace(/\/\/.*@/, '//***:***@');
    console.log(`Redis URL: ${redisUrl}`);
  } else {
    console.log('Redis URL: Not set');
  }
  
  console.log(`Rate Limiting Enabled: ${process.env.RATE_LIMIT_ENABLED !== 'false' ? 'Yes' : 'No'}`);
  console.log(`Session Persistence: ${process.env.SESSION_PERSISTENCE === 'true' ? 'Yes' : 'No'}`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    displayRedisConfig();
    await testRedisConnection();
    return;
  }
  
  switch (command) {
    case 'test':
      await testRedisConnection();
      break;
    case 'vercel':
      await configureForVercel();
      break;
    case 'config':
      displayRedisConfig();
      break;
    default:
      console.log('Unknown command:', command);
      console.log('Available commands:');
      console.log('  test    - Test Redis connectivity');
      console.log('  vercel  - Configure Redis for Vercel deployment');
      console.log('  config  - Display current Redis configuration');
      break;
  }
}

// Run the script
main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
