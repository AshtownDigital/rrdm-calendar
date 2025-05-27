/**
 * MongoDB Connection Configuration
 * Enhanced for serverless environments with connection pooling and retry logic
 */
const mongoose = require('mongoose');

// Set mongoose options
mongoose.set('strictQuery', false);

// Track connection attempts for retry backoff
let connectionAttempts = 0;
let isConnecting = false;
let connectionPromise = null;

// Connection function with improved retry logic and error handling
async function connect() {
  // If already connecting, return the existing promise
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }
  
  // If already connected, return the connection
  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB already connected');
    return mongoose.connection;
  }
  
  // Set connecting flag and create a new connection promise
  isConnecting = true;
  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      // Determine the appropriate MongoDB URI based on environment
      let uri = process.env.MONGODB_URI;
      
      // For Heroku or production environments, ensure we're using the correct MongoDB URI
      if (process.env.NODE_ENV === 'production' && !uri) {
        console.error('ERROR: MONGODB_URI environment variable is not set in production!');
        // Fallback to a dummy URI that will fail gracefully
        uri = 'mongodb://atlas-placeholder-uri/rrdm';
      } else if (!uri) {
        // For local development, use localhost
        uri = 'mongodb://localhost:27017/rrdm';
      }
      
      // Mask sensitive parts of the connection string for logging
      const maskedUri = uri.includes('@') 
        ? `${uri.substring(0, uri.indexOf('://') + 3)}***` 
        : uri;
      console.log(`Connecting to MongoDB at ${maskedUri}`);
      
      // Configure connection options with better defaults for stability
      const options = {
        // Timeouts - reduced for faster failure detection
        serverSelectionTimeoutMS: 10000, // 10 seconds (reduced from 30)
        socketTimeoutMS: 45000, // 45 seconds (reduced from 60)
        connectTimeoutMS: 10000, // 10 seconds (reduced from 30)
        // Connection pool settings
        maxPoolSize: 10,
        minPoolSize: 1, // Keep at least one connection in the pool
        // Performance settings
        autoCreate: true,
        autoIndex: true,
        // Command buffering
        bufferCommands: true,
        bufferTimeoutMS: 10000, // 10 seconds (reduced from 30)
        // Network settings
        family: 4, // Use IPv4, skip trying IPv6
        ssl: process.env.NODE_ENV === 'production',
        // Write concern
        retryWrites: true,
        w: 'majority',
        // Connection pool monitoring
        monitorCommands: true,
        // Heartbeat - how often to check server status
        heartbeatFrequencyMS: 5000 // 5 seconds (reduced from 10)
        // Note: autoReconnect, reconnectTries, and reconnectInterval are deprecated in newer MongoDB driver
        // The driver now handles reconnection automatically
      };
      
      // Connect to MongoDB
      await mongoose.connect(uri, options);
      
      // Reset connection attempts on successful connection
      connectionAttempts = 0;
      console.log('MongoDB connected successfully');
      
      // Setup connection event handlers with improved error handling
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        // Don't reset connection state here, let the reconnect logic handle it
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        isConnecting = false;
        connectionPromise = null;
        
        // Only attempt reconnection if not shutting down
        if (process.env.NODE_ENV !== 'test') {
          console.log('Attempting to reconnect to MongoDB...');
          // The mongoose driver will handle reconnection automatically
        }
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected successfully');
      });
      
      // Resolve with the connection
      resolve(mongoose.connection);
    } catch (error) {
      // Increment connection attempts
      connectionAttempts++;
      
      console.error(`MongoDB connection error (attempt ${connectionAttempts}):`, error);
      
      // Reset connecting state
      isConnecting = false;
      connectionPromise = null;
      
      // Reject with the error
      reject(error);
    }
  });
  
  try {
    return await connectionPromise;
  } finally {
    isConnecting = false;
  }
}

// Export mongoose and connect function
module.exports = { mongoose, connect };
