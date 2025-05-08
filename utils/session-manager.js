/**
 * Enhanced Session Management Utility
 * 
 * This utility provides a more robust approach to session management,
 * addressing the issues with the Session table structure and ensuring
 * consistent behavior across environments.
 */
const { PrismaClient } = require('@prisma/client');
const session = require('express-session');
const { handleDatabaseError, createError, ErrorTypes } = require('./error-handler');
const CustomPrismaSessionStore = require('./custom-session-store');

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Ensures the Session table exists with the correct structure
 * @returns {Promise<boolean>} True if successful
 */
const ensureSessionTable = async () => {
  try {
    // Check if Session table exists with the correct structure
    const tableExists = await prisma.$executeRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Session'
      );
    `;
    
    if (!tableExists) {
      console.log('Session table does not exist, creating...');
      await createSessionTable();
      return true;
    }
    
    // Verify the table structure
    const hasCorrectColumns = await verifySessionTableStructure();
    
    if (!hasCorrectColumns) {
      console.log('Session table has incorrect structure, recreating...');
      await dropSessionTable();
      await createSessionTable();
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring session table:', error);
    throw createError('Failed to ensure session table', ErrorTypes.DATABASE, { originalError: error });
  }
};

/**
 * Verifies the Session table has the correct structure
 * @returns {Promise<boolean>} True if structure is correct
 */
const verifySessionTableStructure = async () => {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Session';
    `;
    
    // Expected columns
    const expectedColumns = {
      'id': 'text',
      'sid': 'text',
      'data': 'text',
      'expiresAt': 'timestamp with time zone'
    };
    
    // Check if all expected columns exist with correct types
    const columnsMap = columns.reduce((acc, col) => {
      acc[col.column_name] = col.data_type;
      return acc;
    }, {});
    
    for (const [colName, colType] of Object.entries(expectedColumns)) {
      if (!columnsMap[colName] || !columnsMap[colName].includes(colType)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying session table structure:', error);
    return false;
  }
};

/**
 * Creates the Session table with the correct structure
 */
const createSessionTable = async () => {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Session" (
        id TEXT PRIMARY KEY,
        sid TEXT NOT NULL,
        data TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL
      );
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Session_sid_key" ON "Session"("sid");
    `;
    
    console.log('Session table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating session table:', error);
    throw createError('Failed to create session table', ErrorTypes.DATABASE, { originalError: error });
  }
};

/**
 * Drops the Session table if it exists
 */
const dropSessionTable = async () => {
  try {
    await prisma.$executeRaw`DROP TABLE IF EXISTS "Session" CASCADE;`;
    console.log('Session table dropped successfully');
    return true;
  } catch (error) {
    console.error('Error dropping session table:', error);
    throw createError('Failed to drop session table', ErrorTypes.DATABASE, { originalError: error });
  }
};

/**
 * Configures the session middleware with proper error handling
 * @param {Object} app - Express application instance
 * @param {Object} config - Configuration options
 */
const configureSessionMiddleware = (app, config = {}) => {
  const {
    secret = process.env.SESSION_SECRET || 'rrdm-default-secret',
    cookie = {},
    resave = false,
    saveUninitialized = false,
    name = 'rrdm.sid',
    maxAge = 24 * 60 * 60 * 1000, // 1 day
  } = config;
  
  // Set default cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    ...cookie
  };
  
  // Configure the session store with our custom implementation
  const store = new CustomPrismaSessionStore({
    prisma,
    tableName: 'Session',
    ttl: 86400, // 1 day in seconds
    checkPeriod: 2 * 60 * 1000, // 2 minutes
    logger: {
      info: (message, ...args) => console.log(message, ...args),
      error: (message, ...args) => {
        const enhancedError = handleDatabaseError(args[0], {
          logLevel: 'error',
          includeStack: true
        });
        console.error(message, enhancedError);
      }
    }
  });
  
  // Configure the session middleware
  const sessionMiddleware = session({
    secret,
    resave,
    saveUninitialized,
    name,
    cookie: cookieOptions,
    store
  });
  
  // Apply the middleware
  app.use(sessionMiddleware);
  
  console.log('Session middleware configured');
};

/**
 * Cleans up expired sessions
 * @returns {Promise<number>} Number of sessions cleaned
 */
const cleanupExpiredSessions = async () => {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM "Session" 
      WHERE "expiresAt" < NOW();
    `;
    
    console.log(`Cleaned up ${result} expired sessions`);
    return result;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    throw createError('Failed to clean up expired sessions', ErrorTypes.DATABASE, { originalError: error });
  }
};

module.exports = {
  ensureSessionTable,
  configureSessionMiddleware,
  cleanupExpiredSessions,
  verifySessionTableStructure,
  createSessionTable,
  dropSessionTable
};
