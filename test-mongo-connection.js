/**
 * Test MongoDB connection for RRDM application
 * This script tests the connection to MongoDB and verifies the environment variables
 */
require('dotenv').config();
const mongoose = require('mongoose');

// Log environment variables (without exposing sensitive data)
console.log('Environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

// Format MongoDB URI for validation
let mongoStatus = 'Not set';
if (process.env.MONGODB_URI) {
  const uri = process.env.MONGODB_URI;
  mongoStatus = 'Set';
  // Add validation check
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    mongoStatus = 'Invalid format';
    console.log('WARNING: MongoDB URI format is invalid. URI must start with mongodb:// or mongodb+srv://');
  }
}

console.log('- MONGODB_URI status:', mongoStatus);

// Test connection function
async function testConnection() {
  try {
    // Get the MongoDB URI from environment variables
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Freddieo:KrY4FIiTXL5opqaY@non.2pdpvcy.mongodb.net/?retryWrites=true&w=majority&appName=NON';
    
    // Ensure the MongoDB URI is properly formatted
    if (MONGODB_URI && !MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
      console.error('Invalid MongoDB URI format. URI must start with mongodb:// or mongodb+srv://');
      
      // Try to extract and reformat the URI if it's malformed
      let fixedUri = MONGODB_URI;
      if (MONGODB_URI.includes('@') && MONGODB_URI.includes('.mongodb.net')) {
        const parts = MONGODB_URI.split('@');
        if (parts.length === 2) {
          const credentials = parts[0].includes(':') ? parts[0] : `Freddieo:KrY4FIiTXL5opqaY`;
          const host = parts[1];
          fixedUri = `mongodb+srv://${credentials}@${host}`;
          console.log('Reformatted MongoDB URI to correct format');
        }
      }
      
      console.log('Using URI:', fixedUri.replace(/mongodb(\+srv)?:\/\/([^:]+):[^@]+@/, 'mongodb$1://*****:*****@'));
      await mongoose.connect(fixedUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000
      });
    } else {
      console.log('Using URI:', MONGODB_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):[^@]+@/, 'mongodb$1://*****:*****@'));
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000
      });
    }
    
    console.log('MongoDB connection established successfully');
    
    // Test a simple database operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // Provide more detailed error information
    if (error.name === 'MongoServerError') {
      if (error.code === 8000 || error.message.includes('auth')) {
        console.error('Authentication failed. Please check your username and password.');
      } else if (error.code === 13) {
        console.error('Authorization failed. The user does not have permission to access the database.');
      }
    } else if (error.name === 'MongoNetworkError') {
      console.error('Network error. Please check your internet connection and MongoDB Atlas network settings.');
    } else if (error.name === 'MongoParseError') {
      console.error('Parse error. The MongoDB connection string is not properly formatted.');
    }
    
    return false;
  } finally {
    // Close the connection
    try {
      await mongoose.disconnect();
      console.log('MongoDB connection closed');
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
    }
  }
}

// Run the test
testConnection()
  .then(success => {
    console.log('Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
