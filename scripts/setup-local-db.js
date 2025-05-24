/**
 * Local Database Setup Script
 * 
 * This script helps set up a local MongoDB database for development.
 * It creates the database if it doesn't exist and sets up initial data.
 * Updated to work with MongoDB instead of PostgreSQL/Prisma.
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


// Function to check if MongoDB is installed
function checkMongoInstallation() {
  try {
    execSync('which mongod', { stdio: 'pipe' });
    console.log('✅ MongoDB is installed');
    return true;
  } catch (error) {
    console.error('❌ MongoDB is not installed. Please install MongoDB first.');
    console.log('You can install it using Homebrew:');
    console.log('  brew tap mongodb/brew');
    console.log('  brew install mongodb-community');
    console.log('  brew services start mongodb-community');
    return false;
  }
}

// Function to check if the database exists
function checkDatabaseExists() {
  try {
    // Parse MONGODB_URI to get database name
    const dbUrl = process.env.MONGODB_URI || config.database.url;
    if (!dbUrl) {
      console.error('❌ MONGODB_URI is not set in the environment');
      return false;
    }
    
    // Extract database name from MongoDB URI
    const dbName = dbUrl.split('/').pop().split('?')[0];
    console.log(`Checking if MongoDB database '${dbName}' exists...`);
    
    // Use mongo command to check if database exists
    const result = execSync(
      `mongo --eval "db = db.getSiblingDB('${dbName}'); db.stats().ok" --quiet`,
      { stdio: 'pipe' }
    ).toString().trim();
    
    const exists = result === '1';
    if (exists) {
      console.log(`✅ MongoDB database '${dbName}' already exists`);
    } else {
      console.log(`❌ MongoDB database '${dbName}' does not exist`);
    }
    
    return exists;
  } catch (error) {
    console.error('Error checking if MongoDB database exists:', error.message);
    console.log('This is normal if the database does not exist yet. Proceeding with creation.');
    return false;
  }
}

// Function to create the database
function createDatabase() {
  try {
    // Parse MONGODB_URI to get database name
    const dbUrl = process.env.MONGODB_URI || config.database.url;
    if (!dbUrl) {
      console.error('❌ MONGODB_URI is not set in the environment');
      return false;
    }
    
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    console.log(`Creating MongoDB database: ${dbName}`);
    
    // Create the database by simply connecting to it
    // MongoDB creates databases automatically when you first store data
    execSync(
      `mongo --eval "db = db.getSiblingDB('${dbName}'); db.createCollection('system_init')" --quiet`,
      { stdio: 'inherit' }
    );
    
    console.log(`✅ MongoDB database '${dbName}' created successfully`);
    return true;
  } catch (error) {
    console.error('Error creating MongoDB database:', error.message);
    return false;
  }
}

// Function to initialize MongoDB collections
function initializeMongoCollections() {
  try {
    console.log('Initializing MongoDB collections...');
    
    // Parse MONGODB_URI to get database name
    const dbUrl = process.env.MONGODB_URI || config.database.url;
    if (!dbUrl) {
      console.error('❌ MONGODB_URI is not set in the environment');
      return false;
    }
    
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    // Create collections for the application
    const collections = [
      'users',
      'bcrs',
      'bcrConfigs',
      'sessions'
    ];
    
    collections.forEach(collection => {
      try {
        execSync(
          `mongo --eval "db = db.getSiblingDB('${dbName}'); db.createCollection('${collection}')" --quiet`,
          { stdio: 'pipe' }
        );
        console.log(`✅ Collection '${collection}' initialized`);
      } catch (err) {
        // Collection might already exist, which is fine
        console.log(`Collection '${collection}' already exists or could not be created`);
      }
    });
    
    console.log('✅ MongoDB collections initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing MongoDB collections:', error.message);
    return false;
  }
}

// Function to seed the database with initial data
function seedDatabase() {
  try {
    console.log('Seeding MongoDB database with initial data...');
    
    // Parse MONGODB_URI to get database name
    const dbUrl = process.env.MONGODB_URI || config.database.url;
    if (!dbUrl) {
      console.error('❌ MONGODB_URI is not set in the environment');
      return false;
    }
    
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    // Create admin user
    const adminUser = {
      _id: '00000000-0000-0000-0000-000000000000',
      email: 'admin@example.com',
      password: '$2a$10$JcV6Y0UYqbXnGR.pGxXeV.9jGOA.9HnAYfQtKbAjg0yWMvxSHdpZe', // password: admin123
      name: 'Admin User',
      role: 'admin',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // MongoDB command to insert admin user if it doesn't exist
    const adminUserCommand = `
      db.getSiblingDB('${dbName}').users.updateOne(
        { _id: '${adminUser._id}' },
        { $setOnInsert: ${JSON.stringify(adminUser)} },
        { upsert: true }
      )
    `;
    
    // Execute the MongoDB command
    execSync(`mongo --eval "${adminUserCommand}"`, { stdio: 'inherit' });
    
    console.log('✅ MongoDB database seeded successfully');
    console.log('Default admin credentials:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    
    return true;
  } catch (error) {
    console.error('Error seeding MongoDB database:', error.message);
    return false;
  }
}

// Function to set up MongoDB session collection
function setupSessionCollection() {
  try {
    console.log('Setting up MongoDB session collection...');
    
    // Parse MONGODB_URI to get database name
    const dbUrl = process.env.MONGODB_URI || config.database.url;
    if (!dbUrl) {
      console.error('❌ MONGODB_URI is not set in the environment');
      return false;
    }
    
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    // MongoDB command to create sessions collection and add TTL index
    const sessionCommand = `
      db.getSiblingDB('${dbName}').createCollection('sessions');
      db.getSiblingDB('${dbName}').sessions.createIndex(
        { expires: 1 },
        { expireAfterSeconds: 0 }
      );
    `;
    
    // Execute the MongoDB command
    execSync(`mongo --eval "${sessionCommand}"`, { stdio: 'inherit' });
    
    console.log('✅ MongoDB session collection set up successfully');
    return true;
  } catch (error) {
    console.error('Error setting up MongoDB session collection:', error.message);
    return false;
  }
}

// Main function
async function main() {
  // Check if MongoDB is installed
  if (!checkMongoInstallation()) {
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
    console.log('MongoDB database already exists, skipping creation.');
  }
  
  // Initialize MongoDB collections
  if (!initializeMongoCollections()) {
    process.exit(1);
  }
  
  // Set up MongoDB session collection
  if (!setupSessionCollection()) {
    process.exit(1);
  }
  
  // Seed the database
  if (!seedDatabase()) {
    process.exit(1);
  }
  
  console.log('🎉 Local MongoDB development database setup complete!');
  console.log('You can now run the application with:');
  console.log('  npm run dev');
}

// Run the main function
main().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
