/**
 * Script to update phase groups in the BcrConfigs table
 * This ensures that the phases are correctly grouped according to the BCR workflow page
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePhaseGroups() {
  console.log('Starting phase group update...');
  
  try {
    // Get all existing phases
    const phases = await prisma.BcrConfigs.findMany({
      where: { type: 'phase' },
      orderBy: { displayOrder: 'asc' }
    });
    
    console.log(`Found ${phases.length} phases in the database`);
    
    // Update each phase with the correct group
    for (const phase of phases) {
      let group = '';
      
      // Assign group based on ID range
      if (phase.id >= 1 && phase.id <= 3) {
        group = 'Submission & Initial Review';
      } else if (phase.id >= 4 && phase.id <= 6) {
        group = 'Review & Approval';
      } else if (phase.id >= 7 && phase.id <= 9) {
        group = 'Requirements Documentation';
      } else if (phase.id >= 10 && phase.id <= 11) {
        group = 'Implementation & Release';
      } else if (phase.id >= 12) {
        group = 'Release Management';
      }
      
      // Update the phase with the new group
      if (group) {
        console.log(`Updating phase ${phase.id} (${phase.name}) to group: ${group}`);
        
        await prisma.BcrConfigs.update({
          where: { id: phase.id },
          data: { 
            metadata: {
              ...phase.metadata,
              group: group
            }
          }
        });
      }
    }
    
    console.log('Phase group update completed successfully!');
  } catch (error) {
    console.error('Error updating phase groups:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updatePhaseGroups();
