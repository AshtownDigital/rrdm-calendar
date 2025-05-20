/**
 * Deploy Authentication Fix
 * 
 * This script is designed to be run on the deployed version to ensure
 * authentication works correctly with the Neon PostgreSQL database.
 * It addresses specific issues that might occur in the Vercel environment.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Initialize Prisma client with connection pooling optimized for serverless
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Optimize connection for serverless environment
  log: ['query', 'info', 'warn', 'error']
});

// Default admin user to create if none exists
const DEFAULT_ADMIN = {
  email: 'admin@example.com',
  password: 'Password123!',
  name: 'Admin User',
  role: 'admin'
};

/**
 * Fix authentication for deployment
 */
async function fixDeployAuth() {
  console.log('Starting authentication fix for Vercel deployment...');
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database URL set: ${Boolean(process.env.DATABASE_URL)}`);
  
  try {
    // 1. Verify database connection with retry logic
    console.log('Verifying database connection with retry...');
    let connected = false;
    let retries = 0;
    const maxRetries = 3;
    
    while (!connected && retries < maxRetries) {
      try {
        await prisma.$queryRaw`SELECT 1 as result`;
        connected = true;
        console.log('Database connection successful');
      } catch (error) {
        retries++;
        console.error(`Database connection attempt ${retries} failed:`, error.message);
        
        if (retries < maxRetries) {
          console.log(`Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!connected) {
      throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
    }
    
    // 2. Ensure the users table exists and has the correct structure
    console.log('Verifying users table structure...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('Available tables:', tables.map(t => t.table_name).join(', '));
    
    const userTableName = tables.find(t => 
      t.table_name.toLowerCase() === 'users' || 
      t.table_name === 'Users'
    );
    
    if (!userTableName) {
      console.error('Users table not found!');
      console.log('Creating users table...');
      
      // Create users table if it doesn't exist
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Users" (
          "id" TEXT PRIMARY KEY,
          "email" TEXT UNIQUE NOT NULL,
          "password" TEXT NOT NULL,
          "name" TEXT,
          "role" TEXT NOT NULL DEFAULT 'user',
          "active" BOOLEAN NOT NULL DEFAULT true,
          "lastLogin" TIMESTAMP WITH TIME ZONE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      console.log('Users table created successfully');
    } else {
      console.log(`Users table found as "${userTableName.table_name}"`);
    }
    
    // 3. Check for existing users
    console.log('Checking for existing users...');
    let userCount = 0;
    
    try {
      // Try with capitalized table name first
      userCount = await prisma.users.count();
    } catch (error) {
      console.log('Error counting users, trying alternative query:', error.message);
      
      // Try with raw SQL as fallback
      const result = await prisma.$queryRaw`SELECT COUNT(*) FROM "Users"`;
      userCount = parseInt(result[0].count, 10);
    }
    
    console.log(`Found ${userCount} users in the database`);
    
    // 4. Create default admin user if no users exist
    if (userCount === 0) {
      console.log('No users found. Creating default admin user...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, salt);
      
      // Create admin user
      try {
        await prisma.users.create({
          data: {
            id: uuidv4(),
            email: DEFAULT_ADMIN.email.toLowerCase(),
            password: hashedPassword,
            name: DEFAULT_ADMIN.name,
            role: DEFAULT_ADMIN.role,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      } catch (error) {
        console.log('Error creating user with Prisma model, trying raw SQL:', error.message);
        
        // Try with raw SQL as fallback
        const userId = uuidv4();
        await prisma.$executeRaw`
          INSERT INTO "Users" ("id", "email", "password", "name", "role", "active", "createdAt", "updatedAt")
          VALUES (${userId}, ${DEFAULT_ADMIN.email.toLowerCase()}, ${hashedPassword}, ${DEFAULT_ADMIN.name}, ${DEFAULT_ADMIN.role}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
      }
      
      console.log(`Created default admin user: ${DEFAULT_ADMIN.email}`);
      console.log(`Password: ${DEFAULT_ADMIN.password}`);
    }
    
    // 5. Verify session table for authentication
    console.log('Verifying session table...');
    const sessionTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Session'
      );
    `;
    
    if (!sessionTableExists) {
      console.log('Session table not found, creating...');
      
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT PRIMARY KEY,
          "sid" TEXT UNIQUE NOT NULL,
          "data" TEXT NOT NULL,
          "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL
        );
      `;
      
      console.log('Session table created successfully');
    } else {
      console.log('Session table exists');
      
      // Check if Session table has the correct structure
      const sessionColumns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Session';
      `;
      
      console.log('Session table columns:', sessionColumns.map(c => c.column_name).join(', '));
      
      // Check if createdAt column exists and is causing issues
      const hasCreatedAt = sessionColumns.some(c => c.column_name === 'createdAt');
      
      if (hasCreatedAt) {
        console.log('Session table has createdAt column which may cause issues, fixing...');
        
        // Create a backup of the session data
        const sessions = await prisma.$queryRaw`SELECT * FROM "Session"`;
        console.log(`Backing up ${sessions.length} sessions`);
        
        // Drop and recreate the table with the correct structure
        await prisma.$executeRaw`DROP TABLE "Session"`;
        
        await prisma.$executeRaw`
          CREATE TABLE "Session" (
            "id" TEXT PRIMARY KEY,
            "sid" TEXT UNIQUE NOT NULL,
            "data" TEXT NOT NULL,
            "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL
          );
        `;
        
        // Restore the session data
        for (const session of sessions) {
          await prisma.$executeRaw`
            INSERT INTO "Session" ("id", "sid", "data", "expiresAt")
            VALUES (${session.id}, ${session.sid}, ${session.data}, ${session.expiresAt})
          `;
        }
        
        console.log('Session table fixed successfully');
      }
    }
    
    console.log('\n✅ Deployment authentication fix completed successfully!');
    console.log('\nYou should now be able to log in with these credentials:');
    console.log(`Email: ${DEFAULT_ADMIN.email}`);
    console.log(`Password: ${DEFAULT_ADMIN.password}`);
    
  } catch (error) {
    console.error('Error fixing deployment authentication:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixDeployAuth()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
