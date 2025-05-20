/**
 * Seed script to populate BCR Urgency Levels
 * 
 * This script populates the database with predefined urgency levels.
 * 
 * Usage: node seeders/populate-urgency-levels.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

// Urgency levels data
const urgencyLevelsData = [
  {
    name: 'Low',
    description: 'Changes that can be implemented during normal business operations',
    displayOrder: 10
  },
  {
    name: 'Medium',
    description: 'Changes that should be prioritized but are not time-critical',
    displayOrder: 20
  },
  {
    name: 'High',
    description: 'Changes that need to be implemented soon to prevent issues',
    displayOrder: 30
  },
  {
    name: 'Critical',
    description: 'Urgent changes that must be implemented immediately to address critical issues',
    displayOrder: 40
  }
];

/**
 * Seed the urgency levels
 */
async function seedUrgencyLevels() {
  console.log('Starting to seed BCR urgency levels...');
  
  try {
    // Check if urgency levels already exist
    const existingUrgencyLevels = await prisma.bcrConfigs.findMany({
      where: {
        type: 'urgencyLevel'
      }
    });
    
    if (existingUrgencyLevels.length > 0) {
      console.log(`Found ${existingUrgencyLevels.length} existing urgency levels.`);
      
      // Check if we need to update any existing urgency levels
      for (const level of urgencyLevelsData) {
        const existingLevel = existingUrgencyLevels.find(l => l.name.toLowerCase() === level.name.toLowerCase());
        
        if (existingLevel) {
          console.log(`Updating existing urgency level: ${level.name}`);
          
          // Update the urgency level
          await prisma.bcrConfigs.update({
            where: { id: existingLevel.id },
            data: {
              value: level.name,
              displayOrder: level.displayOrder
            }
          });
        } else {
          // Create new urgency level
          console.log(`Creating new urgency level: ${level.name}`);
          
          await prisma.bcrConfigs.create({
            data: {
              id: uuidv4(),
              type: 'urgencyLevel',
              name: level.name,
              value: level.name,
              displayOrder: level.displayOrder,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      }
    } else {
      console.log('No existing urgency levels found. Creating all from scratch...');
      
      // Create all urgency levels
      for (const level of urgencyLevelsData) {
        console.log(`Creating urgency level: ${level.name}`);
        
        await prisma.bcrConfigs.create({
          data: {
            id: uuidv4(),
            type: 'urgencyLevel',
            name: level.name,
            value: level.name,
            displayOrder: level.displayOrder,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }
    
    console.log('BCR urgency levels seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding BCR urgency levels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedUrgencyLevels()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
