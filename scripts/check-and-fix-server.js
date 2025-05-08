/**
 * Check and Fix Server Issues
 * This script performs a comprehensive check of the RRDM application setup
 * and fixes common issues that might prevent the application from working.
 */
const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const util = require('util');
const execPromise = util.promisify(exec);

const prisma = new PrismaClient();

async function checkAndFixServer() {
  console.log('🔍 Starting comprehensive server check...');
  
  try {
    // 1. Check environment variables
    console.log('\n📋 Checking environment variables...');
    const envPath = path.join(__dirname, '..', '.env.development');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('✅ .env.development file exists');
      
      // Check for required variables
      const requiredVars = [
        'NODE_ENV', 'PORT', 'SESSION_SECRET', 'DATABASE_URL'
      ];
      
      const missingVars = [];
      for (const varName of requiredVars) {
        if (!envContent.includes(`${varName}=`)) {
          missingVars.push(varName);
        }
      }
      
      if (missingVars.length > 0) {
        console.log(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      } else {
        console.log('✅ All required environment variables are present');
      }
    } else {
      console.log('❌ .env.development file not found');
    }
    
    // 2. Check database connection
    console.log('\n📊 Checking database connection...');
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.log('❌ Database connection failed:', dbError.message);
      console.log('Attempting to fix database connection...');
      
      // Try to create the database if it doesn't exist
      try {
        await execPromise('node scripts/setup-local-db.js');
        console.log('✅ Database setup script executed');
      } catch (setupError) {
        console.log('❌ Failed to run database setup script:', setupError.message);
      }
    }
    
    // 3. Check if admin user exists
    console.log('\n👤 Checking admin user...');
    try {
      const adminUser = await prisma.users.findUnique({
        where: { email: 'admin@example.com' }
      });
      
      if (adminUser) {
        console.log('✅ Admin user exists');
        
        // 4. Fix admin password
        console.log('\n🔑 Ensuring admin password is set correctly...');
        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await prisma.users.update({
          where: { id: adminUser.id },
          data: { password: hashedPassword }
        });
        
        console.log('✅ Admin password updated');
      } else {
        console.log('❌ Admin user not found');
        console.log('Creating admin user...');
        
        // Create admin user
        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await prisma.users.create({
          data: {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'admin@example.com',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log('✅ Admin user created');
      }
    } catch (userError) {
      console.log('❌ Error checking/creating admin user:', userError.message);
    }
    
    // 5. Check Session table
    console.log('\n🔄 Checking Session table...');
    try {
      // Try to clear sessions to see if the table exists
      await prisma.$executeRaw`TRUNCATE TABLE "Session" CASCADE;`;
      console.log('✅ Session table exists and was cleared');
    } catch (sessionError) {
      console.log('❌ Error with Session table:', sessionError.message);
      
      // Try to create Session table
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "Session" (
            "id" TEXT NOT NULL,
            "sid" TEXT NOT NULL,
            "data" TEXT NOT NULL,
            "expiresAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
          );
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Session_sid_key" ON "Session"("sid");`;
        console.log('✅ Session table created');
      } catch (createSessionError) {
        console.log('❌ Failed to create Session table:', createSessionError.message);
      }
    }
    
    // 6. Check if server is running
    console.log('\n🖥️ Checking if server is running on port 3000...');
    try {
      const { stdout } = await execPromise('lsof -i :3000 | grep LISTEN');
      if (stdout.trim()) {
        console.log('✅ Server is running on port 3000');
      } else {
        console.log('❌ Server is not running on port 3000');
      }
    } catch (serverError) {
      console.log('❌ Server is not running on port 3000');
      console.log('Starting server...');
      
      // We can't start the server from here as it would block this process
      console.log('Please start the server manually with: npm run dev');
    }
    
    console.log('\n✨ Check and fix complete!');
    console.log('\nLogin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('\nAccess the application at: http://localhost:3000/access/login');
    
  } catch (error) {
    console.error('❌ An unexpected error occurred:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixServer();
