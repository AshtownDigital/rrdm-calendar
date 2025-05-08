/**
 * Local Database Setup Script
 * 
 * This script helps set up a local PostgreSQL database for development.
 * It creates the database if it doesn't exist and runs Prisma migrations.
 * Updated to work with the new environment structure.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
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

console.log('🔧 Setting up local development database...');
console.log(`Environment: ${config.env}`);
console.log(`Database URL: ${config.database.url ? config.database.url : 'Not set'}`);


// Function to check if PostgreSQL is installed
function checkPostgresInstallation() {
  try {
    execSync('which psql', { stdio: 'pipe' });
    console.log('✅ PostgreSQL is installed');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL is not installed. Please install PostgreSQL first.');
    console.log('You can install it using Homebrew:');
    console.log('  brew install postgresql@14');
    console.log('  brew services start postgresql@14');
    return false;
  }
}

// Function to check if the database exists
function checkDatabaseExists() {
  try {
    // Parse DATABASE_URL to get database name
    const dbUrl = config.database.url;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL is not set in the environment');
      return false;
    }
    
    const dbName = dbUrl.split('/').pop().split('?')[0];
    console.log(`Checking if database '${dbName}' exists...`);
    
    // Check if database exists
    const result = execSync(
      `psql -lqt | cut -d \| -f 1 | grep -w ${dbName} | wc -l`,
      { stdio: 'pipe' }
    ).toString().trim();
    
    const exists = parseInt(result) > 0;
    if (exists) {
      console.log(`✅ Database '${dbName}' already exists`);
    } else {
      console.log(`❌ Database '${dbName}' does not exist`);
    }
    
    return exists;
  } catch (error) {
    console.error('Error checking if database exists:', error.message);
    return false;
  }
}

// Function to create the database
function createDatabase() {
  try {
    // Parse DATABASE_URL to get database name, user, and password
    const dbUrl = config.database.url;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL is not set in the environment');
      return false;
    }
    
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    console.log(`Creating database: ${dbName}`);
    
    // Create the database
    execSync(`createdb ${dbName}`, { stdio: 'inherit' });
    
    console.log(`✅ Database '${dbName}' created successfully`);
    return true;
  } catch (error) {
    console.error('Error creating database:', error.message);
    return false;
  }
}

// Function to push the schema directly to the database
function pushPrismaSchema() {
  try {
    console.log('Pushing Prisma schema to database...');
    
    // Generate Prisma client
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Push schema to database (this is more reliable for initial setup than migrate dev)
    execSync('npx prisma db push', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Prisma schema pushed to database successfully');
    return true;
  } catch (error) {
    console.error('Error pushing Prisma schema:', error.message);
    return false;
  }
}

// Function to seed the database with initial data
function seedDatabase() {
  try {
    console.log('Seeding database with initial data...');
    
    // Parse DATABASE_URL to get database name
    const dbUrl = config.database.url;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL is not set in the environment');
      return false;
    }
    
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    // Create admin user
    const seedQuery = `
      INSERT INTO "Users" (id, email, password, name, role, active, "createdAt", "updatedAt")
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        'admin@example.com',
        '$2a$10$JcV6Y0UYqbXnGR.pGxXeV.9jGOA.9HnAYfQtKbAjg0yWMvxSHdpZe', -- password: admin123
        'Admin User',
        'admin',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `;
    
    // Write the seed query to a temporary file
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const seedFile = path.join(tempDir, 'seed.sql');
    fs.writeFileSync(seedFile, seedQuery);
    
    // Execute the seed query
    execSync(`psql -d ${dbName} -f ${seedFile}`, { stdio: 'inherit' });
    
    // Clean up
    fs.unlinkSync(seedFile);
    
    console.log('✅ Database seeded successfully');
    console.log('Default admin credentials:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    
    return true;
  } catch (error) {
    console.error('Error seeding database:', error.message);
    return false;
  }
}

// Function to create a Session table for Prisma Session Store
function createSessionTable() {
  try {
    console.log('Creating Session table...');
    
    // Parse DATABASE_URL to get database name
    const dbUrl = config.database.url;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL is not set in the environment');
      return false;
    }
    
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    // SQL to create the Session table
    const sessionTableQuery = `
      CREATE TABLE IF NOT EXISTS "Session" (
        id TEXT PRIMARY KEY,
        sid TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
    `;
    
    // Write the query to a temporary file
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const sessionFile = path.join(tempDir, 'session.sql');
    fs.writeFileSync(sessionFile, sessionTableQuery);
    
    // Execute the query
    execSync(`psql -d ${dbName} -f ${sessionFile}`, { stdio: 'inherit' });
    
    // Clean up
    fs.unlinkSync(sessionFile);
    
    console.log('✅ Session table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating Session table:', error.message);
    return false;
  }
}

// Main function
async function main() {
  // Check if PostgreSQL is installed
  if (!checkPostgresInstallation()) {
    process.exit(1);
  }
  
  // Check if database exists
  const dbExists = checkDatabaseExists();
  
  // Create database if it doesn't exist
  if (!dbExists) {
    if (!createDatabase()) {
      process.exit(1);
    }
  } else {
    console.log('Database already exists, skipping creation.');
  }
  
  // Push Prisma schema to database
  if (!pushPrismaSchema()) {
    process.exit(1);
  }
  
  // Create Session table
  if (!createSessionTable()) {
    process.exit(1);
  }
  
  // Seed the database
  if (!seedDatabase()) {
    process.exit(1);
  }
  
  console.log('🎉 Local development database setup complete!');
  console.log('You can now run the application with:');
  console.log('  npm run dev');
}

// Run the main function
main().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
