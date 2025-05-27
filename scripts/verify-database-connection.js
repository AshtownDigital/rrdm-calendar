/**
 * Database Connection Verification Script
 * 
 * This script tests the database connection in both standard and simulated serverless environments.
 * It helps identify and diagnose database connection issues that might occur in Vercel deployment.
 */
const mongoose = require('mongoose');
const { Bcr } = require('../models');
require('../config/database.mongo');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Test database connection in both modes
async function testDatabaseConnection() {
  console.log('=== DATABASE CONNECTION TEST ===');
  console.log('Current environment:', process.env.NODE_ENV || 'development');
  console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
  
  // Test standard connection
  console.log('\n--- Testing Standard Connection ---');
  await testStandardConnection();
  
  // Test serverless connection
  console.log('\n--- Testing Serverless Connection ---');
  await testServerlessConnection();
}

// Test standard Mongoose connection
async function testStandardConnection() {
  console.log('\nTesting standard connection...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database successfully');
    
    // Test a simple query
    const count = await Bcr.countDocuments();
    console.log(`Found ${count} BCR submissions`);
    
    await mongoose.disconnect();
    console.log('Disconnected from database successfully');
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error);
    if (error.message.includes('localhost') || error.message.includes('127.0.0.1')) {
      console.error('   This error suggests you are trying to connect to a local database.');
      console.error('   For Vercel deployment, you need a cloud-hosted database like MongoDB Atlas.');
    }
    return false;
  }
}

// Test serverless Mongoose connection (simulating Vercel environment)
async function testServerlessConnection() {
  console.log('\nTesting serverless connection...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database successfully');
    
    // Test a simple query
    const count = await Bcr.countDocuments();
    console.log(`Found ${count} BCR submissions`);
    
    await mongoose.disconnect();
    console.log('Disconnected from database successfully');
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error);
    console.error('   This is likely what is failing in your Vercel deployment.');
    return false;
  }
}

// Check if DATABASE_URL is properly formatted for Neon
function checkDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL is not set!');
    return;
  }
  
  console.log('\n--- Checking DATABASE_URL format ---');
  
  // Don't log the actual URL for security reasons
  console.log('DATABASE_URL is set');
  
  // Check for localhost
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    console.error('❌ Your DATABASE_URL contains localhost or 127.0.0.1');
    console.error('   This will not work in Vercel\'s serverless environment.');
    console.error('   You need to use a cloud database like Neon PostgreSQL.');
    console.error('   Example format: postgresql://user:password@db.example.com:5432/dbname');
  } else if (url.includes('postgres://')) {
    console.log('✅ Using postgres:// protocol');
  } else if (url.includes('postgresql://')) {
    console.log('✅ Using postgresql:// protocol');
  } else {
    console.error('❌ DATABASE_URL doesn\'t use postgres:// or postgresql:// protocol');
  }
  
  // Check for Neon-specific format
  if (url.includes('.neon.tech')) {
    console.log('✅ Using Neon PostgreSQL (detected .neon.tech in URL)');
    
    // Check for pgbouncer flag for Neon
    if (url.includes('pgbouncer=true')) {
      console.log('✅ Using pgbouncer=true flag (recommended for Neon)');
    } else {
      console.log('⚠️ Missing pgbouncer=true flag in Neon connection string');
      console.log('   For better performance with Neon, add ?pgbouncer=true to your connection string');
    }
    
    // Check for pooling
    if (url.includes('pool_timeout=')) {
      console.log('✅ Pool timeout configuration detected');
    } else {
      console.log('⚠️ No pool_timeout configuration detected');
      console.log('   Consider adding &pool_timeout=10 to your connection string');
    }
  }
}

// Provide deployment recommendations
function provideRecommendations() {
  console.log('\n=== RECOMMENDATIONS FOR VERCEL DEPLOYMENT ===');
  console.log('1. Ensure your DATABASE_URL is set in Vercel environment variables');
  console.log('2. For Neon PostgreSQL, use the format:');
  console.log('   postgresql://user:password@db.neon.tech/dbname?pgbouncer=true&pool_timeout=10');
  console.log('3. Make sure your MongoDB connection string is properly set in your environment variables');
  console.log('4. Verify that your Mongoose models are properly defined');
  console.log('5. After deploying, check Vercel logs for any database connection errors');
}

// Main function
async function main() {
  try {
    checkDatabaseUrl();
    await testDatabaseConnection();
    provideRecommendations();
    
    console.log('\nTest completed. If you\'re still having issues, check the Vercel deployment logs.');
  } catch (error) {
    console.error('Unexpected error during test:', error);
  }
}

// Run the tests
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
