/**
 * MongoDB Connection Test
 * This script tests the connection to MongoDB
 */
const mongoose = require('mongoose');
require('dotenv').config();

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Freddieo:KrY4FIiTXL5opqaY@non.2pdpvcy.mongodb.net/?retryWrites=true&w=majority&appName=NON';

console.log('Attempting to connect to MongoDB...');
console.log(`Using URI: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`); // Hide password in logs

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000
})
.then(() => {
  console.log('MongoDB connection successful!');
  console.log('Connection state:', mongoose.connection.readyState);
  
  // List all collections
  return mongoose.connection.db.listCollections().toArray();
})
.then(collections => {
  console.log('Available collections:');
  collections.forEach(collection => {
    console.log(`- ${collection.name}`);
  });
  
  // Close the connection
  return mongoose.connection.close();
})
.then(() => {
  console.log('Connection closed successfully');
  process.exit(0);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
