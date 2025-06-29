/**
 * Check BCR Enums Script
 * 
 * This script checks the valid enum values for BCR status and priority
 */
require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Checking BCR enum values...');
    
    // Get all statuses from BcrConfigs
    const statuses = await prisma.bcrConfigs.findMany({
      where: {
        type: 'status'
      }
    });
    
    console.log('\nValid BCR Status Values:');
    statuses.forEach(status => {
      console.log(`- ${status.name} (${status.id})`);
    });
    
    // Get all priorities from BcrConfigs
    const priorities = await prisma.bcrConfigs.findMany({
      where: {
        type: 'priority'
      }
    });
    
    console.log('\nValid BCR Priority Values:');
    priorities.forEach(priority => {
      console.log(`- ${priority.name} (${priority.id})`);
    });
    
  } catch (error) {
    console.error('Error checking BCR enum values:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
