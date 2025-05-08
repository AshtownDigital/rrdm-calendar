/**
 * Migrate BCR configuration from JSON file to Neon PostgreSQL database
 * This script reads the BCR config from the JSON file and inserts it into the BcrConfigs table
 */
require('dotenv').config();

// Ensure we're using the real database, not the mock
process.env.DATABASE_MOCK = 'false';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/database');

async function migrateBcrConfig() {
  try {
    console.log('Starting migration of BCR configuration to Neon database...');
    
    // Read the BCR config JSON file
    const configPath = path.join(__dirname, '../data/bcr/config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Check if we already have data in the BcrConfigs table
    const existingConfigs = await prisma.bcrConfigs.findMany();
    if (existingConfigs.length > 0) {
      console.log(`Found ${existingConfigs.length} existing BCR configs in the database.`);
      const overwrite = process.argv.includes('--overwrite');
      if (!overwrite) {
        console.log('Use --overwrite flag to replace existing data. Exiting...');
        return;
      }
      console.log('Overwrite flag detected. Proceeding with migration...');
    }
    
    // Migrate phases
    console.log('Migrating BCR phases...');
    for (const [index, phase] of configData.phases.entries()) {
      await prisma.bcrConfigs.upsert({
        where: {
          id: existingConfigs.find(c => c.type === 'phase' && c.name === phase.name)?.id || uuidv4()
        },
        update: {
          value: JSON.stringify({
            id: phase.id,
            description: phase.description,
            allowedActions: phase.allowedActions,
            nextPhase: phase.nextPhase
          }),
          displayOrder: index
        },
        create: {
          id: uuidv4(),
          type: 'phase',
          name: phase.name,
          value: JSON.stringify({
            id: phase.id,
            description: phase.description,
            allowedActions: phase.allowedActions,
            nextPhase: phase.nextPhase
          }),
          displayOrder: index,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    // Migrate statuses
    console.log('Migrating BCR statuses...');
    for (const [index, status] of configData.statuses.entries()) {
      await prisma.bcrConfigs.upsert({
        where: {
          id: existingConfigs.find(c => c.type === 'status' && c.name === status.name)?.id || uuidv4()
        },
        update: {
          value: JSON.stringify({
            id: status.id,
            phase: status.phase
          }),
          displayOrder: index
        },
        create: {
          id: uuidv4(),
          type: 'status',
          name: status.name,
          value: JSON.stringify({
            id: status.id,
            phase: status.phase
          }),
          displayOrder: index,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    // Migrate impact areas
    console.log('Migrating BCR impact areas...');
    for (const [index, area] of configData.impactAreas.entries()) {
      await prisma.bcrConfigs.upsert({
        where: {
          id: existingConfigs.find(c => c.type === 'impactArea' && c.name === area)?.id || uuidv4()
        },
        update: {
          displayOrder: index
        },
        create: {
          id: uuidv4(),
          type: 'impactArea',
          name: area,
          displayOrder: index,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    // Migrate urgency levels
    console.log('Migrating BCR urgency levels...');
    for (const [index, level] of configData.urgencyLevels.entries()) {
      await prisma.bcrConfigs.upsert({
        where: {
          id: existingConfigs.find(c => c.type === 'urgencyLevel' && c.name === level)?.id || uuidv4()
        },
        update: {
          displayOrder: index
        },
        create: {
          id: uuidv4(),
          type: 'urgencyLevel',
          name: level,
          displayOrder: index,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    // Migrate roles
    console.log('Migrating BCR roles...');
    for (const [index, role] of configData.roles.entries()) {
      await prisma.bcrConfigs.upsert({
        where: {
          id: existingConfigs.find(c => c.type === 'role' && c.name === role)?.id || uuidv4()
        },
        update: {
          displayOrder: index
        },
        create: {
          id: uuidv4(),
          type: 'role',
          name: role,
          displayOrder: index,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    console.log('BCR configuration migration completed successfully!');
  } catch (error) {
    console.error('Error migrating BCR configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateBcrConfig();
