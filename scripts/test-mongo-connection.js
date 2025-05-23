/**
 * Test MongoDB Connection Script
 * 
 * This script tests the connection to MongoDB using the configuration
 * from config/database.mongo.js
 */
const mongoose = require('mongoose');
const mongoConfig = require('../config/database.mongo');

// Test MongoDB connection
async function testMongoConnection() {
  console.log('=== TESTING MONGODB CONNECTION ===');
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoConfig.connect();
    
    // Check connection status
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB connection successful!');
      
      // Get database name
      const dbName = mongoose.connection.db.databaseName;
      console.log(`Connected to database: ${dbName}`);
      
      // List collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`Found ${collections.length} collections:`);
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    } else {
      console.error('❌ MongoDB connection failed. Connection state:', mongoose.connection.readyState);
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
  }
}

// Main function
async function main() {
  try {
    await testMongoConnection();
    
    console.log('\n=== CONNECTION SUMMARY ===');
    console.log('MongoDB: ' + (mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Not connected'));
    
  } catch (error) {
    console.error('Unexpected error during tests:', error);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the test
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
