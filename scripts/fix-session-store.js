/**
 * Fix Session Store Script
 * 
 * This script ensures the Session table has the correct structure for the Prisma Session Store.
 * It will drop and recreate the Session table with all required columns.
 */
// Load environment variables from .env.development
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.development') });
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function fixSessionTable() {
  try {
    console.log('Starting Session table fix...');
    
    // Drop the Session table if it exists
    try {
      console.log('Dropping Session table...');
      await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Session" CASCADE;');
      console.log('Session table dropped successfully');
    } catch (error) {
      console.error('Error dropping Session table:', error);
      throw error;
    }
    
    // Create the Session table with the correct structure
    try {
      console.log('Creating Session table with correct structure...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "Session" (
          "id" TEXT NOT NULL,
          "sid" TEXT NOT NULL,
          "data" TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          
          CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
        );
      `);
      
      // Create index on sid
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");
      `);
      
      console.log('Session table created successfully with all required columns');
    } catch (error) {
      console.error('Error creating Session table:', error);
      throw error;
    }
    
    console.log('Session table fix completed successfully');
  } catch (error) {
    console.error('Failed to fix Session table:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixSessionTable()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
