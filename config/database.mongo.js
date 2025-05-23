/**
 * MongoDB database configuration for RRDM application
 * Establishes connection to MongoDB
 */
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string with credentials
// Using MongoDB Atlas connection string format with SSL options
// Note: For security, it's better to use environment variables for credentials
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Freddieo:KrY4FIiTXL5opqaY@non.2pdpvcy.mongodb.net/?retryWrites=true&w=majority&appName=NON';

// Ensure the MongoDB URI is properly formatted
if (MONGODB_URI && !MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
  console.error('Invalid MongoDB URI format. URI must start with mongodb:// or mongodb+srv://');
  // Try to extract and reformat the URI if it's malformed
  if (MONGODB_URI.includes('@') && MONGODB_URI.includes('.mongodb.net')) {
    const parts = MONGODB_URI.split('@');
    if (parts.length === 2) {
      const credentials = parts[0].includes(':') ? parts[0] : `Freddieo:KrY4FIiTXL5opqaY`;
      const host = parts[1];
      MONGODB_URI = `mongodb+srv://${credentials}@${host}`;
      console.log('Reformatted MongoDB URI to correct format');
    }
  } else {
    // Fall back to the default URI if we can't fix it
    MONGODB_URI = 'mongodb+srv://Freddieo:KrY4FIiTXL5opqaY@non.2pdpvcy.mongodb.net/?retryWrites=true&w=majority&appName=NON';
    console.log('Using fallback MongoDB URI');
  }
}

// Configure mongoose
mongoose.set('strictQuery', false);

// Create connection
let dbConnection = null;

// Connect to MongoDB
const connect = async () => {
  if (dbConnection) return dbConnection;
  
  try {
    // Using modern connection approach (deprecated options removed)
    dbConnection = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Shorter timeout for faster feedback
      connectTimeoutMS: 10000,        // Connection timeout
      socketTimeoutMS: 45000          // Socket timeout
    });
    console.log('MongoDB connection established successfully');
    return dbConnection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // Provide more detailed error information
    if (error.name === 'MongoServerError') {
      if (error.code === 8000 || error.message.includes('auth')) {
        console.error('Authentication failed. Please check your username and password.');
        console.error('You may need to update your MongoDB Atlas credentials or whitelist your IP address.');
      } else if (error.code === 13) {
        console.error('Authorization failed. The user does not have permission to access the database.');
      }
    } else if (error.name === 'MongoNetworkError') {
      console.error('Network error. Please check your internet connection and MongoDB Atlas network settings.');
    }
    
    // For serverless environments, we don't want to crash the application
    if (process.env.VERCEL === '1') {
      console.error('Running in serverless mode, continuing despite MongoDB connection failure');
      return null;
    }
    
    throw error;
  }
};

// Get the mongoose connection
const db = mongoose.connection;

// Handle connection events
db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

db.once('open', () => {
  console.log('MongoDB database connection established successfully');
});

// Test database connection
const testConnection = async () => {
  try {
    // Check if the connection is ready
    if (db.readyState !== 1) {
      await new Promise((resolve, reject) => {
        db.once('open', resolve);
        db.on('error', reject);
      });
    }
    console.log('MongoDB connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to MongoDB:', error);
    return false;
  }
};

// Function to disconnect from the database
const disconnect = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB connection has been closed.');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

module.exports = {
  mongoose,
  db,
  connect,
  testConnection,
  disconnect,
  // Add models to make them available throughout the application
  models: require('../models')
};
