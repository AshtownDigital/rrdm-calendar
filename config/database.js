/**
 * Database configuration for RRDM application
 * Establishes connection to PostgreSQL database using Sequelize ORM
 * Includes optimized connection pooling for production environments
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Determine environment-specific pool settings
const isProd = process.env.NODE_ENV === 'production';
const poolConfig = {
  max: isProd ? 20 : 5,         // Maximum number of connection in pool
  min: isProd ? 2 : 0,          // Minimum number of connection in pool
  acquire: isProd ? 60000 : 30000, // Maximum time, in milliseconds, that pool will try to get connection before throwing error
  idle: isProd ? 30000 : 10000,    // Maximum time, in milliseconds, that a connection can be idle before being released
  evict: 1000,                  // How frequently to check for idle connections to evict (ms)
};

// Create Sequelize instance with connection details from environment variables
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Required for some cloud database providers
    },
    // Add statement timeout to prevent long-running queries
    statement_timeout: isProd ? 30000 : 60000, // 30s in production, 60s in development
    // Add idle_in_transaction_session_timeout to prevent idle transactions
    idle_in_transaction_session_timeout: 60000 // 60s
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: poolConfig,
  // Add retry logic for failed connections
  retry: {
    max: 3, // Maximum retry attempts
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/
    ]
  }
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection
};
