/**
 * Script to list all urgency levels in the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllUrgencyLevels() {
  try {
    console.log('Listing all urgency levels in the database...');
    
    // Get all urgency levels
    const urgencyLevels = await prisma.bcrConfigs.findMany({
      where: { type: 'urgencyLevel' }
    });
    
    console.log(`Found ${urgencyLevels.length} urgency levels:`);
    
    if (urgencyLevels.length === 0) {
      console.log('No urgency levels found.');
    } else {
      // Display all urgency levels
      urgencyLevels.forEach(level => {
        console.log(`- ID: ${level.id}`);
        console.log(`  Name: ${level.name}`);
        console.log(`  Value: ${level.value}`);
        console.log(`  Display Order: ${level.displayOrder}`);
        console.log(`  Created At: ${level.createdAt}`);
        console.log(`  Updated At: ${level.updatedAt}`);
        console.log('---');
      });
    }
  } catch (error) {
    console.error('Error listing urgency levels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
listAllUrgencyLevels();
