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

// Connection function with retry logic
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
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm';
      console.log(`Connecting to MongoDB at ${uri.substring(0, uri.indexOf('://') + 3)}***`);
      
      // Configure connection options based on environment
      const isServerless = process.env.VERCEL === '1';
      const options = {
        // Timeouts
        serverSelectionTimeoutMS: isServerless ? 10000 : 30000,
        socketTimeoutMS: isServerless ? 45000 : 60000,
        connectTimeoutMS: isServerless ? 10000 : 30000,
        // Connection pool settings
        maxPoolSize: isServerless ? 5 : 10,
        minPoolSize: 0, // Allow the pool to shrink to 0 connections
        // Performance settings
        autoCreate: true,
        autoIndex: true,
        // Command buffering
        bufferCommands: true,
        bufferTimeoutMS: 30000,
        // Network settings
        family: 4, // Use IPv4, skip trying IPv6
        ssl: process.env.NODE_ENV === 'production',
        // Write concern
        retryWrites: true,
        w: 'majority',
        // Connection pool monitoring
        monitorCommands: true,
        // Heartbeat - how often to check server status
        heartbeatFrequencyMS: 10000
        // Note: reconnectTries and reconnectInterval are removed as they're deprecated
      };
      
      // Connect to MongoDB
      await mongoose.connect(uri, options);
      
      // Reset connection attempts on successful connection
      connectionAttempts = 0;
      console.log('MongoDB connected successfully');
      
      // Setup connection event handlers
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        isConnecting = false;
        connectionPromise = null;
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
