/**
 * Fix Deployed Authentication
 * 
 * This script addresses authentication issues in the deployed version of RRDM.
 * It ensures the database connection, user table structure, and session management
 * are all properly configured for the Vercel deployment environment.
 */
// Try to load environment variables from different possible locations
try {
  require('dotenv').config({ path: '.env.development' });
  console.log('Loaded environment from .env.development');
} catch (error) {
  try {
    require('dotenv').config();
    console.log('Loaded environment from .env');
  } catch (innerError) {
    console.log('No .env file found, using environment variables directly');
  }
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { User, Session } = require('../models');
require('../config/database.mongo');

// Initialize Mongoose connection with connection pooling
mongoose.set('debug', true);

// Default admin user to create if none exists
const DEFAULT_ADMIN = {
  email: 'prod@email.com',
  password: 'password1254',
  name: 'Production Admin',
  role: 'admin'
};

/**
 * Verify and fix database connection
 */
async function verifyDatabaseConnection() {
  console.log('Verifying database connection...');
  let connected = false;
  let retries = 0;
  const maxRetries = 3;
  
  while (!connected && retries < maxRetries) {
    try {
      await mongoose.connection.db.admin().ping();
      connected = true;
      console.log('✅ Database connection successful');
    } catch (error) {
      retries++;
      console.error(`❌ Database connection attempt ${retries} failed:`, error.message);
      
      if (retries < maxRetries) {
        console.log(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  if (!connected) {
    throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
  }
  
  return connected;
}

/**
 * Verify and fix Users table
 */
async function verifyUsersTable() {
  console.log('Verifying Users table...');
  
  // Check if Users table exists
  const userTableExists = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'Users'
    );
  `;
  
  const exists = userTableExists[0].exists;
  
  if (!exists) {
    console.log('❌ Users table not found, creating...');
    
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
    
    console.log('✅ Users table created successfully');
  } else {
    console.log('✅ Users table exists');
    
    // Verify Users table structure
    const userColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Users';
    `;
    
    const requiredColumns = [
      'id', 'email', 'password', 'name', 'role', 
      'active', 'lastLogin', 'createdAt', 'updatedAt'
    ];
    
    const missingColumns = requiredColumns.filter(
      col => !userColumns.some(c => c.column_name === col)
    );
    
    if (missingColumns.length > 0) {
      console.log(`❌ Users table is missing columns: ${missingColumns.join(', ')}`);
      
      // Add missing columns
      for (const column of missingColumns) {
        console.log(`Adding missing column: ${column}`);
        
        switch (column) {
          case 'id':
            await prisma.$executeRaw`ALTER TABLE "Users" ADD COLUMN "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()`;
            break;
          case 'email':
            await prisma.$executeRaw`ALTER TABLE "Users" ADD COLUMN "email" TEXT UNIQUE NOT NULL DEFAULT ''`;
            break;
          case 'password':
            await prisma.$executeRaw`ALTER TABLE "Users" ADD COLUMN "password" TEXT NOT NULL DEFAULT ''`;
            break;
          case 'name':
            await prisma.$executeRaw`ALTER TABLE "Users" ADD COLUMN "name" TEXT`;
            break;
          case 'role':
            await prisma.$executeRaw`ALTER TABLE "Users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user'`;
            break;
          case 'active':
            await prisma.$executeRaw`ALTER TABLE "Users" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true`;
            break;
          case 'lastLogin':
            await prisma.$executeRaw`ALTER TABLE "Users" ADD COLUMN "lastLogin" TIMESTAMP WITH TIME ZONE`;
            break;
          case 'createdAt':
            await prisma.$executeRaw`ALTER TABLE "Users" ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`;
            break;
          case 'updatedAt':
            await prisma.$executeRaw`ALTER TABLE "Users" ADD COLUMN "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`;
            break;
        }
      }
      
      console.log('✅ Users table structure fixed');
    } else {
      console.log('✅ Users table has all required columns');
    }
  }
}

/**
 * Verify and fix Session table
 */
async function verifySessionTable() {
  console.log('Verifying Session table...');
  
  // Check if Session table exists
  const sessionTableExists = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'Session'
    );
  `;
  
  const exists = sessionTableExists[0].exists;
  
  if (!exists) {
    console.log('❌ Session table not found, creating...');
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT PRIMARY KEY,
        "sid" TEXT UNIQUE NOT NULL,
        "data" TEXT NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `;
    
    console.log('✅ Session table created successfully');
  } else {
    console.log('✅ Session table exists');
    
    // Verify Session table structure
    const sessionColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Session';
    `;
    
    const requiredColumns = ['id', 'sid', 'data', 'expiresAt'];
    const columnNames = sessionColumns.map(c => c.column_name);
    
    console.log('Current Session columns:', columnNames.join(', '));
    
    const missingColumns = requiredColumns.filter(
      col => !columnNames.includes(col)
    );
    
    const extraColumns = columnNames.filter(
      col => !requiredColumns.includes(col)
    );
    
    if (missingColumns.length > 0 || extraColumns.length > 0) {
      console.log(`❌ Session table has incorrect structure`);
      console.log(`Missing columns: ${missingColumns.join(', ')}`);
      console.log(`Extra columns: ${extraColumns.join(', ')}`);
      
      // Backup existing sessions
      console.log('Backing up existing sessions...');
      let sessions = [];
      
      try {
        sessions = await prisma.$queryRaw`SELECT * FROM "Session"`;
        console.log(`Backed up ${sessions.length} sessions`);
      } catch (error) {
        console.error('Error backing up sessions:', error.message);
      }
      
      // Drop and recreate the table
      console.log('Recreating Session table with correct structure...');
      await prisma.$executeRaw`DROP TABLE "Session"`;
      
      await prisma.$executeRaw`
        CREATE TABLE "Session" (
          "id" TEXT PRIMARY KEY,
          "sid" TEXT UNIQUE NOT NULL,
          "data" TEXT NOT NULL,
          "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL
        );
      `;
      
      // Restore sessions if we have the required columns
      if (sessions.length > 0 && 
          columnNames.includes('sid') && 
          columnNames.includes('data') && 
          columnNames.includes('expiresAt')) {
        
        console.log('Restoring sessions...');
        
        for (const session of sessions) {
          try {
            await prisma.$executeRaw`
              INSERT INTO "Session" ("id", "sid", "data", "expiresAt")
              VALUES (${session.id || uuidv4()}, ${session.sid}, ${session.data}, ${session.expiresAt})
            `;
          } catch (error) {
            console.error('Error restoring session:', error.message);
          }
        }
      }
      
      console.log('✅ Session table structure fixed');
    } else {
      console.log('✅ Session table has correct structure');
    }
  }
}

/**
 * Verify and fix user accounts
 */
async function verifyUserAccounts() {
  console.log('Verifying user accounts...');
  
  // Check if any users exist
  let userCount = 0;
  
  try {
    userCount = await User.countDocuments();
  } catch (error) {
    console.error('Error counting users:', error.message);
    
    try {
      const result = await prisma.$queryRaw`SELECT COUNT(*) FROM "Users"`;
      userCount = parseInt(result[0].count, 10);
    } catch (innerError) {
      console.error('Error counting users with raw SQL:', innerError.message);
    }
  }
  
  console.log(`Found ${userCount} users in the database`);
  
  // Create default admin user if no users exist
  if (userCount === 0) {
    console.log('❌ No users found, creating default admin user...');
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, salt);
    
    // Create admin user
    try {
      await User.create({
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
      console.error('Error creating user with Prisma model:', error.message);
      
      try {
        const userId = uuidv4();
        await prisma.$executeRaw`
          INSERT INTO "Users" ("id", "email", "password", "name", "role", "active", "createdAt", "updatedAt")
          VALUES (${userId}, ${DEFAULT_ADMIN.email.toLowerCase()}, ${hashedPassword}, ${DEFAULT_ADMIN.name}, ${DEFAULT_ADMIN.role}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
      } catch (innerError) {
        console.error('Error creating user with raw SQL:', innerError.message);
      }
    }
    
    console.log(`✅ Created default admin user: ${DEFAULT_ADMIN.email}`);
    console.log(`Password: ${DEFAULT_ADMIN.password}`);
  } else {
    console.log('✅ Users exist in the database');
    
    // Verify password hashing for existing users
    console.log('Verifying password hashing for existing users...');
    
    let users = [];
    try {
      users = await User.find({
        select: {
          id: true,
          email: true,
          password: true
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error.message);
      
      try {
        users = await prisma.$queryRaw`SELECT id, email, password FROM "Users"`;
      } catch (innerError) {
        console.error('Error fetching users with raw SQL:', innerError.message);
      }
    }
    
    let fixedUsers = 0;
    
    for (const user of users) {
      // Check if password is properly hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (!user.password || !user.password.startsWith('$2')) {
        console.log(`❌ Fixing password hash for user: ${user.email}`);
        
        // Hash a default password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('TemporaryPassword123!', salt);
        
        // Update the user with the new password hash
        try {
          await User.findByIdAndUpdate(user.id, {
            where: { id: user.id },
            data: { 
              password: hashedPassword,
              updatedAt: new Date()
            }
          });
        } catch (error) {
          console.error('Error updating user password with Prisma:', error.message);
          
          try {
            await prisma.$executeRaw`
              UPDATE "Users" 
              SET "password" = ${hashedPassword}, "updatedAt" = CURRENT_TIMESTAMP 
              WHERE "id" = ${user.id}
            `;
          } catch (innerError) {
            console.error('Error updating user password with raw SQL:', innerError.message);
          }
        }
        
        fixedUsers++;
        console.log(`Reset password for user: ${user.email}`);
        console.log(`New temporary password: TemporaryPassword123!`);
      }
    }
    
    if (fixedUsers > 0) {
      console.log(`✅ Fixed password hashing for ${fixedUsers} users`);
    } else {
      console.log('✅ All user passwords are properly hashed');
    }
  }
}

/**
 * Main function to fix authentication issues
 */
async function fixDeployedAuth() {
  console.log('==========================================');
  console.log('RRDM Authentication Fix for Deployment');
  console.log('==========================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`Database URL set: ${Boolean(process.env.DATABASE_URL)}`);
  console.log('------------------------------------------');
  
  try {
    // Step 1: Verify database connection
    await verifyDatabaseConnection();
    
    // Step 2: Verify Users table
    await verifyUsersTable();
    
    // Step 3: Verify Session table
    await verifySessionTable();
    
    // Step 4: Verify user accounts
    await verifyUserAccounts();
    
    console.log('==========================================');
    console.log('✅ Authentication fix completed successfully!');
    console.log('==========================================');
    console.log('You should now be able to log in with these credentials:');
    console.log(`Email: ${DEFAULT_ADMIN.email}`);
    console.log(`Password: ${DEFAULT_ADMIN.password}`);
    console.log('==========================================');
    
  } catch (error) {
    console.error('❌ Error fixing authentication:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the function
fixDeployedAuth()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
