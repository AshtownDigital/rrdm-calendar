/**
 * Comprehensive Authentication Fix Script
 * 
 * This script addresses all potential authentication issues:
 * 1. Ensures admin user exists with correct password
 * 2. Fixes Session table structure
 * 3. Verifies password hashing is working correctly
 * 4. Clears any stale sessions
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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

async function fixAuthentication() {
  try {
    console.log('🔧 Starting comprehensive authentication fix...');
    console.log(`Environment: ${config.env}`);
    console.log(`Database URL: ${config.database.url ? 'Set' : 'Not set'}`);
    
    // 1. Fix Session table
    await fixSessionTable();
    
    // 2. Fix admin user
    await fixAdminUser();
    
    // 3. Verify authentication
    await verifyAuthentication();
    
    console.log('\n🎉 Authentication fix complete!');
    console.log('\nLogin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    
    return true;
  } catch (error) {
    console.error('❌ An unexpected error occurred:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function fixSessionTable() {
  console.log('\n🔄 Fixing Session table...');
  
  try {
    // Drop the Session table if it exists
    console.log('Dropping existing Session table...');
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Session" CASCADE;`);
    console.log('✅ Existing Session table dropped');
  } catch (error) {
    console.error('Error dropping Session table:', error.message);
  }
  
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
    return true;
  } catch (error) {
    console.error('Error creating Session table:', error.message);
    return false;
  }
}

async function fixAdminUser() {
  console.log('\n👤 Fixing admin user...');
  
  // Admin user credentials
  const email = 'admin@example.com';
  const password = 'admin123';
  
  // Generate new password hash
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  // Check if admin user exists
  const existingUser = await prisma.users.findUnique({
    where: { email }
  });
  
  if (existingUser) {
    console.log('Admin user exists, updating password...');
    
    // Update the existing user with new password
    await prisma.users.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Admin user password updated');
  } else {
    console.log('Admin user does not exist, creating...');
    
    // Create new admin user
    await prisma.users.create({
      data: {
        id: '00000000-0000-0000-0000-000000000000',
        email,
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Admin user created');
  }
  
  return true;
}

async function verifyAuthentication() {
  console.log('\n🔍 Verifying authentication setup...');
  
  // 1. Verify admin user exists and password is correct
  const email = 'admin@example.com';
  const password = 'admin123';
  
  const user = await prisma.users.findUnique({
    where: { email }
  });
  
  if (!user) {
    console.error('❌ Admin user not found!');
    return false;
  }
  
  console.log('✅ Admin user exists');
  
  // 2. Verify password hash works
  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      console.log('✅ Password hash verification successful');
    } else {
      console.error('❌ Password hash verification failed!');
      
      // Fix the password hash
      console.log('Fixing password hash...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      await prisma.users.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Password hash fixed');
    }
  } catch (error) {
    console.error('❌ Error verifying password:', error.message);
  }
  
  // 3. Check Session table
  try {
    const sessionCount = await prisma.$executeRaw`SELECT COUNT(*) FROM "Session";`;
    console.log(`Session table exists with ${sessionCount} sessions`);
  } catch (error) {
    console.error('❌ Error checking Session table:', error.message);
  }
  
  return true;
}

// Run the function
fixAuthentication()
  .then(() => {
    console.log('\nPlease restart your server and try logging in again with:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('\nAccess the application at: http://localhost:23456/access/login');
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
