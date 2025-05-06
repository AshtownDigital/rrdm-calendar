/**
 * Prisma Index Configuration
 * 
 * This file helps optimize database queries by creating indexes
 * on frequently queried fields.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create indexes for optimizing database queries
 */
async function createIndexes() {
  try {
    console.log('Creating database indexes...');
    
    // Create index on Bcrs.status for faster filtering
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Bcrs_status_idx" ON "Bcrs" ("status")`;
    console.log('Created index on Bcrs.status');
    
    // Create index on Bcrs.impact for faster filtering
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Bcrs_impact_idx" ON "Bcrs" ("impact")`;
    console.log('Created index on Bcrs.impact');
    
    // Create index on Bcrs.createdAt for faster sorting
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Bcrs_createdAt_idx" ON "Bcrs" ("createdAt")`;
    console.log('Created index on Bcrs.createdAt');
    
    // Create index on BcrConfigs.type for faster filtering
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "BcrConfigs_type_idx" ON "BcrConfigs" ("type")`;
    console.log('Created index on BcrConfigs.type');
    
    // Create index on ReferenceData.category for faster filtering
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ReferenceData_category_idx" ON "ReferenceData" ("category")`;
    console.log('Created index on ReferenceData.category');
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// If this file is run directly, create the indexes
if (require.main === module) {
  createIndexes();
}

module.exports = { createIndexes };
