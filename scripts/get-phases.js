/**
 * Script to get all phases from the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getPhases() {
  try {
    console.log('Fetching all phases from the database...');
    
    const phases = await prisma.BcrConfigs.findMany({
      where: { type: 'phase' },
      orderBy: { displayOrder: 'asc' }
    });
    
    console.log('Phases found:', phases.length);
    console.log(JSON.stringify(phases, null, 2));
    
  } catch (error) {
    console.error('Error fetching phases:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
getPhases();
