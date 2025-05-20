/**
 * Script to delete all BCRs from the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllBcrs() {
  try {
    console.log('Deleting all BCRs from the database...');
    
    const result = await prisma.bcrs.deleteMany({});
    
    console.log(`Successfully deleted ${result.count} BCRs`);
  } catch (error) {
    console.error('Error deleting BCRs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
deleteAllBcrs()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
