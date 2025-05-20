/**
 * Script to update the test BCR with more complete information
 * This will populate all the necessary fields for the BCR submission details page
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTestBcr() {
  console.log('Updating the test BCR with complete information...');
  
  try {
    // Get the test BCR we created earlier
    const bcrId = 'd7e706b8-b65f-4d69-bf6a-e7740991bfb0';
    const bcr = await prisma.Bcrs.findUnique({
      where: { id: bcrId }
    });
    
    if (!bcr) {
      console.error(`BCR with ID ${bcrId} not found.`);
      return;
    }
    
    console.log('Found BCR:', bcr);
    
    // Get the impact areas
    const impactAreas = await prisma.bcrConfigs.findMany({
      where: { type: 'impactArea' },
      orderBy: { displayOrder: 'asc' }
    });
    
    // Select a few impact areas to use
    const selectedImpactAreas = impactAreas.slice(0, 3).map(area => area.name);
    
    // Update the BCR with more complete information
    const updatedBcr = await prisma.Bcrs.update({
      where: { id: bcrId },
      data: {
        description: 'This is a comprehensive test BCR to demonstrate the impact area functionality. It includes multiple impact areas and detailed justification.',
        status: 'new_submission',
        priority: 'high',
        impact: selectedImpactAreas.join(', '),
        notes: `
Initial submission: This BCR is created to test the impact areas functionality.
Impact areas affected: ${selectedImpactAreas.join(', ')}
Justification: The changes are needed to improve the user experience and fix several critical bugs.
Technical details: Will require updates to the database schema and frontend components.
        `,
        targetDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
        updatedAt: new Date()
      }
    });
    
    console.log('Successfully updated test BCR with complete information');
    console.log('Updated BCR:', updatedBcr);
    
    return updatedBcr;
  } catch (error) {
    console.error('Error updating test BCR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updateTestBcr()
  .then(() => {
    console.log('Update script completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
