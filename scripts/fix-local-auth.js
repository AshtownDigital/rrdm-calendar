/**
 * Fix Local Authentication
 * This script fixes authentication issues in the local development environment
 * Updated to work with the new environment structure
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

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

async function fixLocalAuth() {
  try {
    console.log('🔧 Fixing local authentication...');
    console.log(`Environment: ${config.env}`);
    console.log(`Database URL: ${config.database.url ? 'Set' : 'Not set'}`);
    
    // 1. Create a new admin user with a simple password
    const email = 'admin@example.com';
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Check if admin user exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      // Update the existing user with new password
      await prisma.users.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          name: 'Admin User',
          role: 'admin',
          active: true,
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Updated admin user with new password');
    } else {
      // Create a new admin user
      await prisma.users.create({
        data: {
          id: uuidv4(),
          email,
          password: hashedPassword,
          name: 'Admin User',
          role: 'admin',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Created new admin user');
    }
    
    // 2. Create a Session table if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Session" (
          id TEXT PRIMARY KEY,
          sid TEXT UNIQUE NOT NULL,
          data TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
      `);
      
      console.log('✅ Session table created/verified');
    } catch (error) {
      console.error('Error creating Session table:', error.message);
    }
    
    // 3. Clear existing sessions
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Session";`);
      console.log('✅ Cleared existing sessions');
    } catch (error) {
      console.error('Error clearing sessions:', error.message);
    }
    
    // 4. Verify environment variables
    const envPath = path.join(__dirname, '..', '.env.development');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Ensure SESSION_SECRET is set
    if (!envContent.includes('SESSION_SECRET=')) {
      envContent += '\nSESSION_SECRET=rrdm-dev-secret-key\n';
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Added SESSION_SECRET to environment variables');
    }
    
    console.log('\n🎉 Authentication fix complete!');
    console.log('\nLogin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('\nPlease restart your server and try logging in again.');
    
    return true;
  } catch (error) {
    console.error('Error fixing authentication:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixLocalAuth();
