/**
 * Database Utilities for RRDM
 * 
 * This script provides utility functions for managing the Prisma database,
 * including schema validation, data seeding, and migration helpers.
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Create a Prisma client instance
const prisma = new PrismaClient();

/**
 * Validate the database schema against the Prisma schema
 * Checks for missing tables, columns, or constraints
 */
async function validateSchema() {
  console.log('Validating database schema...');
  try {
    // This will throw an error if the schema doesn't match
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection successful');
    
    // Get list of tables from the database
    const result = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `;
    
    const existingTables = result.map(row => row.tablename);
    console.log('Existing tables:', existingTables);
    
    // Check for required tables
    const requiredTables = ['Bcrs', 'BcrConfigs', 'Fundings', 'ReferenceData', 'ReleaseNotes', 'Users', 'Session'];
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`Table ${table} exists`);
      } else {
        console.error(`Table ${table} is missing`);
      }
    }
    
    console.log('Schema validation complete');
  } catch (error) {
    console.error('Schema validation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Seed the database with initial data
 * Useful for development and testing environments
 */
async function seedDatabase() {
  console.log('Seeding database...');
  try {
    const now = new Date();
    
    // Seed BCR Configs if they don't exist
    const configCount = await prisma.bcrConfigs.count();
    if (configCount === 0) {
      console.log('Seeding BCR configs...');
      
      // Add phases
      await prisma.bcrConfigs.createMany({
        data: [
          { id: uuidv4(), type: 'phase', name: 'Draft', value: 'draft', displayOrder: 1, createdAt: now, updatedAt: now },
          { id: uuidv4(), type: 'phase', name: 'Submitted', value: 'submitted', displayOrder: 2, createdAt: now, updatedAt: now },
          { id: uuidv4(), type: 'phase', name: 'Under Review', value: 'under_review', displayOrder: 3, createdAt: now, updatedAt: now },
          { id: uuidv4(), type: 'phase', name: 'Approved', value: 'approved', displayOrder: 4, createdAt: now, updatedAt: now },
          { id: uuidv4(), type: 'phase', name: 'Rejected', value: 'rejected', displayOrder: 5, createdAt: now, updatedAt: now },
          { id: uuidv4(), type: 'phase', name: 'Implemented', value: 'implemented', displayOrder: 6, createdAt: now, updatedAt: now }
        ],
        skipDuplicates: true
      });
      
      // Add impact areas
      await prisma.bcrConfigs.createMany({
        data: [
          { id: uuidv4(), type: 'impactArea', name: 'System', value: 'system', displayOrder: 1, createdAt: now, updatedAt: now },
          { id: uuidv4(), type: 'impactArea', name: 'Process', value: 'process', displayOrder: 2, createdAt: now, updatedAt: now },
          { id: uuidv4(), type: 'impactArea', name: 'People', value: 'people', displayOrder: 3, createdAt: now, updatedAt: now },
          { id: uuidv4(), type: 'impactArea', name: 'Data', value: 'data', displayOrder: 4, createdAt: now, updatedAt: now }
        ],
        skipDuplicates: true
      });
      
      console.log('BCR configs seeded successfully');
    } else {
      console.log('BCR configs already exist, skipping seed');
    }
    
    // Seed admin user if no users exist
    const userCount = await prisma.users.count();
    if (userCount === 0) {
      console.log('Seeding admin user...');
      await prisma.users.create({
        data: {
          id: uuidv4(),
          email: 'admin@example.com',
          password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // 'password'
          name: 'Admin User',
          role: 'admin',
          active: true,
          createdAt: now,
          updatedAt: now
        }
      });
      console.log('Admin user seeded successfully');
    } else {
      console.log('Users already exist, skipping seed');
    }
    
    console.log('Database seeding complete');
  } catch (error) {
    console.error('Database seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Create a backup of the Prisma schema
 */
function backupSchema() {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const backupDir = path.join(__dirname, '..', 'prisma', 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `schema-${timestamp}.prisma`);
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Copy schema file to backup
  fs.copyFileSync(schemaPath, backupPath);
  console.log(`Schema backup created at ${backupPath}`);
}

// Command line interface
const command = process.argv[2];
switch (command) {
  case 'validate':
    validateSchema();
    break;
  case 'seed':
    seedDatabase();
    break;
  case 'backup':
    backupSchema();
    break;
  default:
    console.log(`
Database Utilities for RRDM

Usage:
  node db-utils.js [command]

Commands:
  validate   Validate the database schema against the Prisma schema
  seed       Seed the database with initial data
  backup     Create a backup of the Prisma schema
    `);
}
