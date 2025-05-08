/**
 * Fix Session Table Script
 * 
 * This script fixes issues with the Session table in the database
 * which can cause login problems.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

// Ensure we're using the development environment
process.env.NODE_ENV = 'development';

// Load environment configuration
const envFile = `.env.${process.env.NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envFile}`);
  dotenv.config({ path: envPath });
} else {
  console.log('Environment file not found, using default .env');
  dotenv.config();
}

// Import config after loading environment variables
const config = require('../config/env');

// Initialize Prisma client
const prisma = new PrismaClient();

async function fixSessionTable() {
  try {
    console.log('🔧 Fixing Session table...');
    console.log(`Environment: ${config.env}`);
    console.log(`Database URL: ${config.database.url ? 'Set' : 'Not set'}`);
    
    // Parse DATABASE_URL to get database name
    const dbUrl = config.database.url;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL is not set in the environment');
      return false;
    }
    
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    console.log(`Working with database: ${dbName}`);
    
    // Drop the Session table if it exists
    try {
      console.log('Dropping existing Session table...');
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Session" CASCADE;`);
      console.log('✅ Existing Session table dropped');
    } catch (error) {
      console.error('Error dropping Session table:', error.message);
    }
    
    // Create a new Session table with the correct structure
    try {
      console.log('Creating new Session table...');
      
      // Create the Session table using separate queries
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "Session" (
          id TEXT PRIMARY KEY,
          sid TEXT NOT NULL,
          data TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL
        );
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");
      `);
      
      console.log('✅ Session table created successfully');
    } catch (error) {
      console.error('Error creating Session table:', error.message);
      return false;
    }
    
    console.log('🎉 Session table fix complete!');
    return true;
  } catch (error) {
    console.error('❌ An unexpected error occurred:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixSessionTable()
  .then(() => {
    console.log('Please restart your server and try logging in again.');
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
