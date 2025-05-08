/**
 * MongoDB database configuration for RRDM application
 * Establishes connection to MongoDB
 */
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string with credentials
// Using MongoDB Atlas connection string format with SSL options
const MONGODB_URI = 'mongodb+srv://Freddieo:y8HUkVOlM6PBr8m7@non.2pdpvcy.mongodb.net/rrdm?retryWrites=true&w=majority';

// Configure mongoose
mongoose.set('strictQuery', false);

// Create connection
let dbConnection = null;

// Connect to MongoDB
const connect = async () => {
  if (dbConnection) return dbConnection;
  
  try {
    // Using a simpler connection approach
    dbConnection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Shorter timeout for faster feedback
    });
    console.log('MongoDB connection established successfully');
    return dbConnection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
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
