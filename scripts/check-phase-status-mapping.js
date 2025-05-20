/**
 * Script to check the phase-status mapping in the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPhaseStatusMapping() {
  try {
    console.log('Checking phase-status mapping...');
    
    // Get all phases
    const phases = await prisma.bcrConfigs.findMany({
      where: { type: 'phase' }
    });
    
    console.log(`Found ${phases.length} phases`);
    
    // Get all statuses
    const statuses = await prisma.bcrConfigs.findMany({
      where: { type: 'status' }
    });
    
    console.log(`Found ${statuses.length} statuses`);
    
    // Check each phase and its associated statuses
    for (const phase of phases) {
      console.log(`\nPhase: ${phase.name} (ID: ${phase.id}, Value: ${phase.value})`);
      
      // Find statuses for this phase
      const phaseStatuses = statuses.filter(s => s.value === phase.value);
      
      console.log(`  Found ${phaseStatuses.length} statuses for this phase:`);
      
      for (const status of phaseStatuses) {
        console.log(`  - ${status.name} (ID: ${status.id})`);
      }
    }
    
    console.log('\nDone checking phase-status mapping');
  } catch (error) {
    console.error('Error checking phase-status mapping:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkPhaseStatusMapping();
