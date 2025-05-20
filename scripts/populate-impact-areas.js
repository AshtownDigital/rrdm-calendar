/**
 * Script to populate the BCR Impact Areas in the database
 * This script creates the necessary impact areas in the ImpactedArea model
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

// Define standard impact areas
const impactAreas = [
  {
    name: 'Funding',
    order: 10,
    description: 'Impact on funding arrangements'
  },
  {
    name: 'Policy',
    order: 20,
    description: 'Impact on policies and regulations'
  },
  {
    name: 'Processes',
    order: 30,
    description: 'Impact on business processes'
  },
  {
    name: 'Systems',
    order: 40,
    description: 'Impact on IT systems'
  },
  {
    name: 'Reporting',
    order: 50,
    description: 'Impact on reporting requirements'
  },
  {
    name: 'Users',
    order: 60,
    description: 'Impact on end users'
  },
  {
    name: 'Training',
    order: 70,
    description: 'Impact on training requirements'
  },
  {
    name: 'Other',
    order: 80,
    description: 'Other impact areas not listed above'
  }
];

/**
 * Create an impact area in the database
 * @param {Object} impactArea - Impact area data
 * @returns {Promise<Object>} - Created impact area
 */
async function createImpactArea(impactArea) {
  const now = new Date();
  // Create the impact area entry using the new ImpactedArea model
  const createdImpactArea = await prisma.impactedArea.create({
    data: {
      id: uuidv4(),
      name: impactArea.name,
      description: impactArea.description,
      order: impactArea.order,
      createdAt: now,
      updatedAt: now
    }
  });
  
  return createdImpactArea;
}

/**
 * Populate the database with impact areas using the new ImpactedArea model
 */
async function populateImpactAreas() {
  try {
    console.log('Starting to populate impact areas...');
    
    // First, clear existing impact areas
    console.log('Clearing existing impact areas...');
    await prisma.impactedArea.deleteMany({});
    
    // Create impact areas
    console.log('Creating impact areas...');
    for (const impactArea of impactAreas) {
      await createImpactArea(impactArea);
    }
    
    // Also maintain backward compatibility with BcrConfigs
    console.log('Maintaining backward compatibility with BcrConfigs...');
    await prisma.bcrConfigs.deleteMany({
      where: {
        type: {
          in: ['impact_area', 'impact_area_description']
        }
      }
    });
    
    // Create entries in BcrConfigs for backward compatibility
    for (const impactArea of impactAreas) {
      const now = new Date();
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'impact_area',
          name: impactArea.name,
          value: impactArea.name.toLowerCase().replace(/\s+/g, '_'),
          displayOrder: impactArea.order,
          createdAt: now,
          updatedAt: now
        }
      });
    }
    
    console.log('Impact areas populated successfully!');
  } catch (error) {
    console.error('Error populating impact areas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateImpactAreas();
