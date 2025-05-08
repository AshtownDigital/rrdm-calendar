/**
 * Database configuration for RRDM application
 * Establishes connection to PostgreSQL database using Prisma
 * Optimized for serverless environments with connection pooling
 */
require('dotenv').config();

// Detect serverless environment
const isServerless = process.env.VERCEL === '1';

// Global variable to store the Prisma client instance (for serverless environment)
let prismaInstance = null;

/**
 * Get or create a Prisma client instance using the singleton pattern
 * This is important for serverless environments to avoid connection issues
 */
function getPrismaClient() {
  // If we already have an instance, return it
  if (prismaInstance) {
    return prismaInstance;
  }
  
  try {
    // Import PrismaClient dynamically to avoid issues in serverless
    const { PrismaClient } = require('@prisma/client');
    
    // Log environment info for debugging
    console.log(`Loading environment from ${process.env.NODE_ENV === 'production' ? '.env.production' : '.env.staging'}`);
    console.log(`Database connection attempt in ${isServerless ? 'serverless' : 'standard'} mode`);
    
    // Create Prisma client with appropriate options
    const options = {
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    };
    
    // Add connection pool settings for serverless
    if (isServerless) {
      // Prisma client requires datasources to be in the format { db: { url: "CONNECTION_STRING" } }
      options.datasources = {
        db: {
          url: process.env.DATABASE_URL
        }
      };
      
      // Add connection timeout as a separate option
      options.connectionTimeout = 5000; // 5 seconds in milliseconds
    }
    
    // Validate DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Create the client
    prismaInstance = new PrismaClient(options);
    
    // Log creation
    console.log(`Prisma client created in ${isServerless ? 'serverless' : 'standard'} mode`);
    
    return prismaInstance;
  } catch (error) {
    console.error('Failed to create Prisma client:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      env: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        databaseUrlSet: !!process.env.DATABASE_URL,
        databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0
      }
    });
    throw error;
  }
}

// Export the prisma client getter for convenience
const prisma = getPrismaClient();

/**
 * Test database connection with retry logic
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} delay - Delay between retries in ms (default: 1000)
 * @returns {Promise<boolean>} - True if connection successful, false otherwise
 */
const testConnection = async (retries = 3, delay = 1000) => {
  const client = getPrismaClient();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Try to connect
      await client.$connect();
      console.log(`Database connection established successfully (attempt ${attempt}/${retries}).`);
      return true;
    } catch (error) {
      // Log the error
      console.error(`Unable to connect to the database (attempt ${attempt}/${retries}):`, error);
      
      // If we have more retries, wait and try again
      if (attempt < retries) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  return false;
};

/**
 * Function to disconnect from the database
 * @returns {Promise<void>}
 */
const disconnect = async () => {
  if (prismaInstance) {
    try {
      await prismaInstance.$disconnect();
      console.log('Database connection has been closed.');
      // Reset the instance in case we need to reconnect
      prismaInstance = null;
    } catch (error) {
      console.error('Error disconnecting from database:', error);
      // Still reset the instance to force a new connection next time
      prismaInstance = null;
      throw error;
    }
  } else {
    console.log('No active database connection to close.');
  }
};
/**
 * Execute a query with automatic reconnection if needed
 * This is especially useful in serverless environments where connections might be dropped
 * @param {Function} queryFn - Function that executes a Prisma query
 * @returns {Promise<any>} - Query result
 */
const executeQuery = async (queryFn) => {
  const client = getPrismaClient();
  
  try {
    // Try to execute the query
    return await queryFn(client);
  } catch (error) {
    // If it's a connection error, try to reconnect once
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      console.warn('Database connection issue detected, attempting to reconnect...');
      
      try {
        // Disconnect and reset the client
        await disconnect();
        
        // Get a fresh client
        const freshClient = getPrismaClient();
        await freshClient.$connect();
        
        // Retry the query
        console.log('Reconnected to database, retrying query...');
        return await queryFn(freshClient);
      } catch (reconnectError) {
        console.error('Failed to reconnect to database:', reconnectError);
        throw reconnectError;
      }
    }
    
    // For other errors, just throw
    throw error;
  }
};

// Export the database utilities
module.exports = {
  prisma,
  getPrismaClient,
  testConnection,
  disconnect,
  executeQuery
};