// Script to replace existing impact areas with new ones
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function replaceImpactAreas() {
  try {
    console.log('Starting impact areas replacement...');
    
    // Define the new impact areas
    const newImpactAreas = [
      { name: 'Backend', description: 'Changes to server-side code and database', order: 10 },
      { name: 'Frontend', description: 'Changes to user interface and client-side code', order: 20 },
      { name: 'API', description: 'Changes to API endpoints and integrations', order: 30 },
      { name: 'CSV', description: 'Changes to CSV imports and exports', order: 40 },
      { name: 'Reference Data', description: 'Changes to reference data and lookup tables', order: 50 },
      { name: 'Documentation & Guidance', description: 'Changes to documentation and user guidance', order: 60 },
      { name: 'Policy', description: 'Changes to business policies and rules', order: 70 },
      { name: 'Funding', description: 'Changes to funding arrangements and financial aspects', order: 80 }
    ];
    
    // First, delete all existing impact areas
    console.log('Deleting existing impact areas...');
    await prisma.impactedArea.deleteMany({});
    console.log('All existing impact areas deleted.');
    
    // Then create the new impact areas
    console.log('Creating new impact areas...');
    for (const [index, area] of newImpactAreas.entries()) {
      await prisma.impactedArea.create({
        data: {
          name: area.name,
          description: area.description,
          order: area.order,
          recordNumber: index + 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`Created impact area: ${area.name}`);
    }
    
    console.log('Impact areas replacement completed successfully!');
    
    // Verify the new impact areas
    const updatedAreas = await prisma.impactedArea.findMany({
      orderBy: { order: 'asc' }
    });
    
    console.log('\nVerification - New Impact Areas:');
    console.log(JSON.stringify(updatedAreas, null, 2));
    
    // Close the database connection
    await prisma.$disconnect();
    console.log('Database connection closed.');
    
  } catch (error) {
    console.error('Error replacing impact areas:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the function
replaceImpactAreas();
