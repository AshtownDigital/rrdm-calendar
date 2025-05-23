/**
 * Database Connection Verification Script
 * 
 * This script tests the database connection in both standard and simulated serverless environments.
 * It helps identify and diagnose database connection issues that might occur in Vercel deployment.
 */
const { PrismaClient } = require('@prisma/client');
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

// Test standard Prisma connection
async function testStandardConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  try {
    console.log('Connecting to database using standard connection...');
    await prisma.$connect();
    console.log('✅ Standard connection successful!');
    
    // Try a simple query
    const count = await prisma.bcrSubmission.count();
    console.log(`✅ Query successful: Found ${count} BCR submissions`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Standard connection failed:', error.message);
    if (error.message.includes('localhost') || error.message.includes('127.0.0.1')) {
      console.error('   This error suggests you are trying to connect to a local database.');
      console.error('   For Vercel deployment, you need a cloud-hosted database like Neon PostgreSQL.');
    }
  }
}

// Test serverless Prisma connection (simulating Vercel environment)
async function testServerlessConnection() {
  // Simulate serverless environment
  process.env.VERCEL = '1';
  process.env.PRISMA_CLIENT_ENGINE_TYPE = 'dataproxy';
  
  const prisma = new PrismaClient({
    log: ['error'],
  });
  
  try {
    console.log('Connecting to database using serverless connection...');
    await prisma.$connect();
    console.log('✅ Serverless connection successful!');
    
    // Try a simple query
    const count = await prisma.bcrSubmission.count();
    console.log(`✅ Query successful: Found ${count} BCR submissions`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Serverless connection failed:', error.message);
    console.error('   This is likely what is failing in your Vercel deployment.');
    
    if (error.message.includes('P1001')) {
      console.error('   Error P1001 indicates the database server cannot be reached.');
      console.error('   Check that your DATABASE_URL is correctly set in Vercel environment variables.');
    } else if (error.message.includes('P1003')) {
      console.error('   Error P1003 indicates a database does not exist or you don\'t have access.');
    }
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
  console.log('3. Make sure PRISMA_CLIENT_ENGINE_TYPE=dataproxy is set in Vercel');
  console.log('4. Verify that your schema.prisma file has the correct provider and URL');
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
