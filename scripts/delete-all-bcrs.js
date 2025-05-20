// Script to delete all BCR records from the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllBcrs() {
  try {
    console.log('Starting deletion of all BCR records...');
    
    // Get count before deletion
    const beforeCount = await prisma.bcrs.count();
    console.log(`Current BCR count: ${beforeCount}`);
    
    // Delete all BCR records
    const deleteResult = await prisma.bcrs.deleteMany({});
    
    console.log(`Successfully deleted ${deleteResult.count} BCR records`);
    console.log('Operation completed successfully');
    
    return deleteResult;
  } catch (error) {
    console.error('Error deleting BCR records:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
deleteAllBcrs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to delete BCR records:', error);
    process.exit(1);
  });
