/**
 * Script to list impact areas in the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listImpactAreas() {
  try {
    console.log('Fetching impact areas from database...');
    
    // Query impact areas from the database
    const impactAreas = await prisma.impactedArea.findMany({
      orderBy: { order: 'asc' }
    });
    
    console.log(`Found ${impactAreas.length} impact areas`);
    
    // Display each impact area
    impactAreas.forEach((area, index) => {
      console.log(`\n--- Impact Area ${index + 1} ---`);
      console.log(`ID: ${area.id}`);
      console.log(`Name: ${area.name}`);
      console.log(`Description: ${area.description || 'N/A'}`);
      console.log(`Order: ${area.order}`);
      console.log('------------------------');
    });
    
  } catch (error) {
    console.error('Error listing impact areas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
listImpactAreas();
