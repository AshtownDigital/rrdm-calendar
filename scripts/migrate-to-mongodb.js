/**
 * Migration script to transfer data from Neon PostgreSQL to MongoDB
 * 
 * This script transfers users and BCR configurations from the Neon PostgreSQL database
 * to the MongoDB database.
 * 
 * Usage: node scripts/migrate-to-mongodb.js [--overwrite]
 * 
 * Options:
 *   --overwrite: Overwrite existing data in MongoDB
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
const { User, BcrConfig } = require('../models');
const mongoDb = require('../config/database.mongo');

// Flag to control whether to overwrite existing data
const overwrite = process.argv.includes('--overwrite');

// Initialize Prisma client for Neon PostgreSQL
const prisma = new PrismaClient();

/**
 * Migrate users from Neon PostgreSQL to MongoDB
 */
async function migrateUsers() {
  try {
    console.log('Migrating users from Neon PostgreSQL to MongoDB...');
    
    // Get all users from Neon PostgreSQL
    const prismaUsers = await prisma.users.findMany();
    console.log(`Found ${prismaUsers.length} users in Neon PostgreSQL`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const prismaUser of prismaUsers) {
      // Check if user already exists in MongoDB
      const existingUser = await User.findOne({ email: prismaUser.email.toLowerCase() });
      
      if (existingUser && !overwrite) {
        console.log(`Skipping existing user: ${prismaUser.email}`);
        skippedCount++;
        continue;
      }
      
      if (existingUser && overwrite) {
        console.log(`Updating existing user: ${prismaUser.email}`);
        existingUser.name = prismaUser.name;
        existingUser.password = prismaUser.password; // Already hashed
        existingUser.role = prismaUser.role;
        existingUser.active = prismaUser.active;
        existingUser.lastLogin = prismaUser.lastLogin;
        existingUser.updatedAt = new Date();
        
        // Save without running the password hashing hook
        existingUser.$isNew = false; // Trick to avoid pre-save hooks
        await existingUser.save({ validateBeforeSave: false });
        migratedCount++;
      } else {
        console.log(`Creating new user: ${prismaUser.email}`);
        const newUser = new User({
          email: prismaUser.email.toLowerCase(),
          password: prismaUser.password, // Already hashed
          name: prismaUser.name,
          role: prismaUser.role,
          active: prismaUser.active,
          lastLogin: prismaUser.lastLogin,
          createdAt: prismaUser.createdAt,
          updatedAt: prismaUser.updatedAt
        });
        
        // Save without running the password hashing hook
        newUser.$isNew = false; // Trick to avoid pre-save hooks
        await newUser.save({ validateBeforeSave: false });
        migratedCount++;
      }
    }
    
    console.log(`Migration completed: ${migratedCount} users migrated, ${skippedCount} users skipped`);
    return true;
  } catch (error) {
    console.error('Error migrating users:', error);
    return false;
  }
}

/**
 * Migrate BCR configurations from Neon PostgreSQL to MongoDB
 */
async function migrateBcrConfigs() {
  try {
    console.log('Migrating BCR configurations from Neon PostgreSQL to MongoDB...');
    
    // Get all BCR configurations from Neon PostgreSQL
    const prismaBcrConfigs = await prisma.bcrConfigs.findMany();
    console.log(`Found ${prismaBcrConfigs.length} BCR configurations in Neon PostgreSQL`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const prismaConfig of prismaBcrConfigs) {
      // Check if configuration already exists in MongoDB
      const existingConfig = await BcrConfig.findOne({
        type: prismaConfig.type,
        name: prismaConfig.name
      });
      
      if (existingConfig && !overwrite) {
        console.log(`Skipping existing config: ${prismaConfig.type} - ${prismaConfig.name}`);
        skippedCount++;
        continue;
      }
      
      if (existingConfig && overwrite) {
        console.log(`Updating existing config: ${prismaConfig.type} - ${prismaConfig.name}`);
        existingConfig.value = prismaConfig.value;
        existingConfig.displayOrder = prismaConfig.displayOrder;
        existingConfig.updatedAt = new Date();
        await existingConfig.save();
        migratedCount++;
      } else {
        console.log(`Creating new config: ${prismaConfig.type} - ${prismaConfig.name}`);
        const newConfig = new BcrConfig({
          type: prismaConfig.type,
          name: prismaConfig.name,
          value: prismaConfig.value,
          displayOrder: prismaConfig.displayOrder,
          createdAt: prismaConfig.createdAt,
          updatedAt: prismaConfig.updatedAt
        });
        await newConfig.save();
        migratedCount++;
      }
    }
    
    console.log(`Migration completed: ${migratedCount} configs migrated, ${skippedCount} configs skipped`);
    return true;
  } catch (error) {
    console.error('Error migrating BCR configurations:', error);
    return false;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  try {
    console.log('Starting migration from Neon PostgreSQL to MongoDB...');
    console.log(`Overwrite mode: ${overwrite ? 'ON' : 'OFF'}`);
    
    // Migrate users
    const usersMigrated = await migrateUsers();
    
    // Migrate BCR configurations
    const configsMigrated = await migrateBcrConfigs();
    
    console.log('Migration completed!');
    console.log(`Users migration: ${usersMigrated ? 'SUCCESS' : 'FAILED'}`);
    console.log(`BCR configs migration: ${configsMigrated ? 'SUCCESS' : 'FAILED'}`);
    
    return usersMigrated && configsMigrated;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  } finally {
    // Close database connections
    await prisma.$disconnect();
    await mongoDb.disconnect();
  }
}

// Run the migration
migrate()
  .then(success => {
    console.log(`Migration ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error during migration:', error);
    process.exit(1);
  });
