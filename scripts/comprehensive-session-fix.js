/**
 * Comprehensive Session Fix Script
 * 
 * This script provides a comprehensive fix for session-related issues:
 * 1. Ensures the Session table has the correct structure
 * 2. Updates the session store configuration to match the database schema
 * 3. Cleans up any orphaned sessions
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.development') });
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Fix Session table structure
 */
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
    return true;
  } catch (error) {
    console.error('Failed to fix Session table:', error);
    return false;
  }
}

/**
 * Update session store configuration
 */
async function updateSessionStoreConfig() {
  try {
    console.log('\nUpdating session store configuration...');
    
    // Path to server.js
    const serverPath = path.resolve(__dirname, '../server.js');
    
    // Read server.js
    let serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Check if we need to update the session store configuration
    if (serverContent.includes('schema: { tableName: "Session"')) {
      console.log('Session store configuration already updated');
      return true;
    }
    
    // Update the session store configuration
    const sessionStorePattern = /new PrismaSessionStore\(\s*prisma\s*,\s*{([^}]*)}\s*\)/;
    const updatedSessionStore = `new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,  // 2 minutes
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
      enableConcurrentSetDelete: true,
      schema: { tableName: "Session" }
    })`;
    
    // Replace the session store configuration
    const updatedServerContent = serverContent.replace(sessionStorePattern, updatedSessionStore);
    
    // Write the updated content back to server.js
    fs.writeFileSync(serverPath, updatedServerContent);
    
    console.log('Session store configuration updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating session store configuration:', error);
    return false;
  }
}

/**
 * Clean up orphaned sessions
 */
async function cleanupOrphanedSessions() {
  try {
    console.log('\nCleaning up orphaned sessions...');
    
    // Delete expired sessions
    const now = new Date();
    const deletedCount = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });
    
    console.log(`Deleted ${deletedCount.count} expired sessions`);
    return true;
  } catch (error) {
    console.error('Error cleaning up orphaned sessions:', error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting comprehensive session fix...');
    
    // Fix Session table
    const tableFixed = await fixSessionTable();
    if (!tableFixed) {
      throw new Error('Failed to fix Session table');
    }
    
    // Update session store configuration
    const configUpdated = await updateSessionStoreConfig();
    if (!configUpdated) {
      throw new Error('Failed to update session store configuration');
    }
    
    // Clean up orphaned sessions
    await cleanupOrphanedSessions();
    
    console.log('\n✅ Comprehensive session fix completed successfully!');
    console.log('\nPlease restart the application for the changes to take effect.');
  } catch (error) {
    console.error('\n❌ Comprehensive session fix failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
