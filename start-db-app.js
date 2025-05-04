/**
 * Startup script for the RRDM application with PostgreSQL database
 * This script initializes the database and starts the server
 */
require('dotenv').config();
const { testConnection } = require('./config/database');
const { syncDatabase, seedDatabase } = require('./models');
const { migrateUsersFromJson } = require('./utils/db-user-utils');
const oldUserUtils = require('./utils/user-utils');
const fs = require('fs');
const path = require('path');

// Path to the users JSON file
const USERS_FILE = path.join(__dirname, './data/users.json');

async function startApp() {
  console.log('Starting RRDM application with PostgreSQL database...');
  
  try {
    // Test database connection
    console.log('Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('Failed to connect to the database. Please check your connection settings.');
      process.exit(1);
    }
    
    // Sync database models (create tables)
    console.log('Syncing database models...');
    await syncDatabase(false); // false = don't drop existing tables
    
    // Check if users JSON file exists and migrate users if needed
    if (fs.existsSync(USERS_FILE)) {
      console.log('Checking for existing users in database...');
      const jsonUsers = oldUserUtils.getAllUsers();
      
      if (jsonUsers.length > 0) {
        console.log(`Found ${jsonUsers.length} users in JSON file. Migrating to database...`);
        await migrateUsersFromJson(jsonUsers);
      }
    }
    
    // Seed database with initial data if needed
    console.log('Seeding database with initial data if needed...');
    await seedDatabase();
    
    // Start the server
    console.log('Starting server...');
    require('./server-db');
    
  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
}

// Run the startup script
startApp();
