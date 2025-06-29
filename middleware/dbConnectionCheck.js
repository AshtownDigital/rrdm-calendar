/**
 * Database Connection Check Middleware
 * Middleware to check MongoDB connection status and handle timeouts
 */

const mongoose = require('mongoose');

/**
 * Middleware to check database connection
 * Adds isDbConnected and dbConnectionState to res.locals
 */
exports.checkDbConnection = (req, res, next) => {
  // Check MongoDB connection state
  const connectionState = mongoose.connection.readyState;
  const isDbConnected = connectionState === 1;
  
  // Add connection state to res.locals for use in controllers and views
  res.locals.isDbConnected = isDbConnected;
  res.locals.dbConnectionState = connectionState;
  
  // Continue to next middleware
  next();
};

/**
 * Middleware to handle database timeouts
 * @param {number} timeout - Timeout in milliseconds (default: 5000ms)
 */
exports.withTimeout = (timeout = 5000) => {
  return (req, res, next) => {
    // Set a timeout for database operations
    req.dbTimeout = timeout;
    
    // Helper function to execute database queries with timeout
    req.executeWithTimeout = async (dbOperation) => {
      // Skip if database is not connected
      if (mongoose.connection.readyState !== 1) {
        return null;
      }
      
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database operation timed out')), timeout);
        });
        
        // Race the operation against the timeout
        return await Promise.race([dbOperation(), timeoutPromise]);
      } catch (error) {
        console.error('Database operation error or timeout:', error);
        return null;
      }
    };
    
    next();
  };
};

/**
 * Execute multiple database operations with Promise.allSettled
 * Handles partial failures gracefully
 * @param {Array} operations - Array of database operation promises
 * @returns {Array} - Array of results or default values
 */
exports.executeOperations = async (operations) => {
  try {
    const results = await Promise.allSettled(operations);
    
    // Map results to values or null for failures
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );
  } catch (error) {
    console.error('Error executing database operations:', error);
    return operations.map(() => null);
  }
};
