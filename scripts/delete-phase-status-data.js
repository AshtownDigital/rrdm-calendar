/**
 * Script to delete all BCR Phase-Status mapping data from the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Delete all phase and status configurations from the database
 */
async function deletePhaseStatusData() {
  try {
    console.log('Starting to delete phase-status mapping data...');
    
    // Delete all phase and status configurations
    console.log('Deleting existing phase and status configurations...');
    const result = await prisma.bcrConfigs.deleteMany({
      where: {
        type: {
          in: [
            'phase', 
            'status', 
            'phase_description', 
            'status_description', 
            'trello_list_mapping', 
            'trello_list_description'
          ]
        }
      }
    });
    
    console.log(`Deleted ${result.count} phase and status configurations.`);
    console.log('Phase-status mapping data deleted successfully!');
  } catch (error) {
    console.error('Error deleting phase-status mapping data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deletePhaseStatusData();
