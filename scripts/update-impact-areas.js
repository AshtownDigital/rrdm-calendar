/**
 * Script to update impact areas in the database to match the standard ones
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function updateImpactAreas() {
  try {
    console.log('Updating impact areas in the database...');
    
    // Define the standard impact areas
    const standardImpactAreas = [
      { name: 'Funding', value: 'funding', displayOrder: 10 },
      { name: 'Policy', value: 'policy', displayOrder: 20 },
      { name: 'Processes', value: 'processes', displayOrder: 30 },
      { name: 'Systems', value: 'systems', displayOrder: 40 },
      { name: 'Reporting', value: 'reporting', displayOrder: 50 },
      { name: 'Users', value: 'users', displayOrder: 60 },
      { name: 'Training', value: 'training', displayOrder: 70 },
      { name: 'Other', value: 'other', displayOrder: 80 }
    ];
    
    // Clear existing impact areas
    console.log('Clearing existing impact areas...');
    await prisma.bcrConfigs.deleteMany({
      where: { type: 'impactArea' }
    });
    
    // Create the standard impact areas
    console.log('Creating standard impact areas...');
    for (const area of standardImpactAreas) {
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'impactArea',
          name: area.name,
          value: area.value,
          displayOrder: area.displayOrder,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`Created impact area: ${area.name}`);
    }
    
    console.log('Impact areas updated successfully!');
  } catch (error) {
    console.error('Error updating impact areas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateImpactAreas();
