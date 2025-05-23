/**
 * Environment Configuration
 * 
 * This module loads the appropriate environment variables based on the current environment
 * (development, staging, production) and provides a unified interface for accessing configuration values.
 */
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

/**
 * Load environment variables in the following priority:
 * 1. Environment-specific file (.env.development, .env.staging, .env.production)
 * 2. Default .env file (fallback)
 * 3. Default values in code (last resort)
 */
function loadEnvironment() {
  // Determine the environment (can be set via command line or already in process.env)
  const NODE_ENV = process.env.NODE_ENV || 'development';
  
  // Define paths for environment files
  const envFile = `.env.${NODE_ENV}`;
  const envPath = path.resolve(process.cwd(), envFile);
  const defaultEnvPath = path.resolve(process.cwd(), '.env');
  
  // Load environment-specific file if it exists
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envPath });
  } 
  // Otherwise load default .env file
  else if (fs.existsSync(defaultEnvPath)) {
    console.log(`Environment file ${envFile} not found, using default .env`);
    dotenv.config({ path: defaultEnvPath });
  }
  // No env files found, warn but continue with defaults
  else {
    console.warn('No environment files found. Using default values.');
  }
  
  // Re-set NODE_ENV to ensure consistency after loading env files
  process.env.NODE_ENV = process.env.NODE_ENV || NODE_ENV;
  
  return process.env.NODE_ENV;
}

// Load environment variables
const NODE_ENV = loadEnvironment();

// Configuration object with all application settings
const config = {
  // Environment
  env: NODE_ENV,
  isDev: NODE_ENV === 'development',
  isStaging: NODE_ENV === 'staging',
  isProd: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Session
  sessionSecret: process.env.SESSION_SECRET || 'rrdm-default-secret-key',
  sessionPersistence: process.env.SESSION_PERSISTENCE === 'true',
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
    // No engine type needed for Mongoose
  },
  
  // Redis
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    mock: process.env.REDIS_MOCK === 'true',
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug'),
  
  // Feature flags
  features: {
    enableMockData: process.env.ENABLE_MOCK_DATA === 'true',
    enableDebugRoutes: process.env.ENABLE_DEBUG_ROUTES === 'true' && NODE_ENV !== 'production'
  },
  
  // Security
  security: {
    csrfProtection: process.env.CSRF_PROTECTION === 'true',
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true',
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
    }
  }
};

module.exports = config;