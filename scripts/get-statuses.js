/**
 * Script to get all statuses from the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getStatuses() {
  try {
    console.log('Fetching all statuses from the database...');
    
    const statuses = await prisma.BcrConfigs.findMany({
      where: { type: 'status' },
      orderBy: { displayOrder: 'asc' }
    });
    
    console.log('Statuses found:', statuses.length);
    console.log(JSON.stringify(statuses, null, 2));
    
  } catch (error) {
    console.error('Error fetching statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
getStatuses();
