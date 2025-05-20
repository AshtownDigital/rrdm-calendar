/**
 * Script to check urgency levels in the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUrgencyLevels() {
  try {
    console.log('Checking urgency levels in the database...');
    
    // Get all urgency levels
    const urgencyLevels = await prisma.bcrConfigs.findMany({
      where: { type: 'urgencyLevel' }
    });
    
    console.log(`Found ${urgencyLevels.length} urgency levels:`);
    
    if (urgencyLevels.length === 0) {
      console.log('No urgency levels found. Creating default urgency levels...');
      
      // Create default urgency levels
      const defaultUrgencyLevels = [
        { name: 'Low', value: 'low', displayOrder: 10 },
        { name: 'Medium', value: 'medium', displayOrder: 20 },
        { name: 'High', value: 'high', displayOrder: 30 },
        { name: 'Critical', value: 'critical', displayOrder: 40 }
      ];
      
      for (const level of defaultUrgencyLevels) {
        await prisma.bcrConfigs.create({
          data: {
            id: require('uuid').v4(),
            type: 'urgencyLevel',
            name: level.name,
            value: level.value,
            displayOrder: level.displayOrder,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        console.log(`Created urgency level: ${level.name}`);
      }
      
      console.log('Default urgency levels created successfully.');
    } else {
      // Display existing urgency levels
      for (const level of urgencyLevels) {
        console.log(`- ${level.name} (ID: ${level.id}, Value: ${level.value}, Display Order: ${level.displayOrder})`);
      }
    }
    
    console.log('Done checking urgency levels.');
  } catch (error) {
    console.error('Error checking urgency levels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkUrgencyLevels();
