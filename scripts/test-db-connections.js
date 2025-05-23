/**
 * Test Database Connections Script
 * 
 * This script tests connections to both MongoDB and PostgreSQL databases
 * to ensure they are properly configured.
 */
const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection string from config file
const mongoConfig = require('../config/database.mongo');

// Create Prisma client
const prisma = new PrismaClient({
  log: ['error'],
});

// Test MongoDB connection
async function testMongoConnection() {
  console.log('\n=== TESTING MONGODB CONNECTION ===');
  
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

// Test PostgreSQL connection via Prisma
async function testPostgresConnection() {
  console.log('\n=== TESTING POSTGRESQL CONNECTION ===');
  console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
  
  try {
    console.log('Connecting to PostgreSQL via Prisma...');
    await prisma.$connect();
    console.log('✅ PostgreSQL connection successful!');
    
    // Try to query some data
    try {
      // Try to get BCR submissions count
      const bcrCount = await prisma.bcrSubmission.count();
      console.log(`Found ${bcrCount} BCR submissions`);
      
      // Try to get phases count
      const phasesCount = await prisma.workflowPhase.count();
      console.log(`Found ${phasesCount} workflow phases`);
    } catch (queryError) {
      console.error('❌ Query error:', queryError.message);
    }
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    
    if (error.message.includes('localhost') || error.message.includes('127.0.0.1')) {
      console.error('   This error suggests you are trying to connect to a local database.');
      console.error('   For Vercel deployment, you need a cloud-hosted database.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Main function
async function main() {
  try {
    console.log('=== DATABASE CONNECTION TESTS ===');
    console.log('Testing connections to both MongoDB and PostgreSQL...');
    
    // Test MongoDB
    await testMongoConnection();
    
    // Test PostgreSQL
    await testPostgresConnection();
    
    console.log('\n=== TEST SUMMARY ===');
    console.log('MongoDB: ' + (mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Not connected'));
    console.log('PostgreSQL: ' + (prisma ? '✅ Test completed' : '❌ Test failed'));
    
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

// Run the tests
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
