/**
 * Simple script to test MongoDB connection
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log(`Connection string starts with: ${process.env.MONGODB_URI.substring(0, process.env.MONGODB_URI.indexOf('://') + 3)}***`);
    
    // Connect with options that match your application but with longer timeouts
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Longer timeout for testing
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      bufferCommands: true,
      family: 4
    });
    
    console.log('MongoDB connection successful!');
    console.log(`Connection state: ${mongoose.connection.readyState}`);
    console.log(`Database name: ${mongoose.connection.db.databaseName}`);
    
    // List collections to verify full access
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Available collections: ${collections.map(c => c.name).join(', ')}`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed successfully');
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
  } finally {
    // Ensure the process exits
    process.exit(0);
  }
}

testConnection();
