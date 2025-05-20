/**
 * Script to check impact areas in the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImpactAreas() {
  try {
    console.log('Checking impact areas in the database...');
    
    // Get all impact areas
    const impactAreas = await prisma.bcrConfigs.findMany({
      where: { type: 'impactArea' }
    });
    
    console.log(`Found ${impactAreas.length} impact areas:`);
    
    if (impactAreas.length === 0) {
      console.log('No impact areas found. Creating default impact areas...');
      
      // Create default impact areas
      const defaultImpactAreas = [
        { name: 'Funding', value: 'Funding', displayOrder: 10 },
        { name: 'Policy', value: 'Policy', displayOrder: 20 },
        { name: 'Processes', value: 'Processes', displayOrder: 30 },
        { name: 'Systems', value: 'Systems', displayOrder: 40 },
        { name: 'Reporting', value: 'Reporting', displayOrder: 50 },
        { name: 'Users', value: 'Users', displayOrder: 60 },
        { name: 'Training', value: 'Training', displayOrder: 70 },
        { name: 'Other', value: 'Other', displayOrder: 80 }
      ];
      
      for (const area of defaultImpactAreas) {
        await prisma.bcrConfigs.create({
          data: {
            id: require('uuid').v4(),
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
      
      console.log('Default impact areas created successfully.');
    } else {
      // Display existing impact areas
      for (const area of impactAreas) {
        console.log(`- ${area.name} (ID: ${area.id}, Value: ${area.value}, Display Order: ${area.displayOrder})`);
      }
    }
    
    console.log('Done checking impact areas.');
  } catch (error) {
    console.error('Error checking impact areas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkImpactAreas();
