/**
 * Environment Configuration
 * 
 * This module loads the appropriate environment variables based on the current environment (development, staging, production)
 * and provides a unified interface for accessing configuration values.
 */
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Determine the environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load environment-specific .env file
const envFile = `.env.${NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

// Check if environment-specific file exists
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envFile}`);
  dotenv.config({ path: envPath });
} else {
  // Fall back to default .env file
  console.log(`Environment file ${envFile} not found, using default .env`);
  dotenv.config();
}

// Configuration object
const config = {
  // Environment
  env: NODE_ENV,
  isDev: NODE_ENV === 'development',
  isStaging: NODE_ENV === 'staging',
  isProd: NODE_ENV === 'production',
  
  // Server
  port: parseInt(process.env.PORT || '24680', 10),
  
  // Session
  sessionSecret: process.env.SESSION_SECRET || 'rrdm-default-secret-key',
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // Logging
  logLevel: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug'),
  
  // Feature flags
  features: {
    enableMockData: process.env.ENABLE_MOCK_DATA === 'true',
    enableDebugRoutes: process.env.ENABLE_DEBUG_ROUTES === 'true' && NODE_ENV !== 'production'
  }
};

module.exports = config;