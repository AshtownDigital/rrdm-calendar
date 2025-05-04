/**
 * Database initialization script for RRDM application
 * Sets up database tables and migrates existing users from JSON
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, syncDatabase, seedDatabase } = require('../models');
const { migrateUsersFromJson } = require('../utils/db-user-utils');
const oldUserUtils = require('../utils/user-utils');

// Path to the users JSON file
const USERS_FILE = path.join(__dirname, '../data/users.json');

async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync database models (create tables)
    console.log('Creating database tables...');
    await syncDatabase(false); // false = don't drop existing tables
    
    // Check if users JSON file exists
    if (fs.existsSync(USERS_FILE)) {
      console.log('Migrating existing users from JSON file...');
      const jsonUsers = oldUserUtils.getAllUsers();
      
      if (jsonUsers.length > 0) {
        const migrationResult = await migrateUsersFromJson(jsonUsers);
        if (migrationResult) {
          console.log(`Successfully migrated ${jsonUsers.length} users from JSON file.`);
        } else {
          console.error('Error migrating users from JSON file.');
        }
      } else {
        console.log('No users found in JSON file to migrate.');
      }
    } else {
      console.log('No existing users JSON file found.');
    }
    
    // Seed database with initial data if needed
    console.log('Seeding database with initial data...');
    await seedDatabase();
    
    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
