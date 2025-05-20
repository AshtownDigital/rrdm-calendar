/**
 * Script to check for duplicate BCR workflow phases and statuses in the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBcrWorkflowDuplicates() {
  console.log('Checking for duplicate BCR workflow phases and statuses...');
  
  try {
    // Get all phases
    const phases = await prisma.BcrConfigs.findMany({
      where: { type: 'phase' },
      orderBy: { displayOrder: 'asc' }
    });
    
    console.log(`Found ${phases.length} phases in the database`);
    
    // Check for duplicate phase values
    const phaseValues = {};
    const duplicatePhaseValues = [];
    
    phases.forEach(phase => {
      if (phaseValues[phase.value]) {
        duplicatePhaseValues.push(phase.value);
      } else {
        phaseValues[phase.value] = true;
      }
    });
    
    if (duplicatePhaseValues.length > 0) {
      console.log(`Found ${duplicatePhaseValues.length} duplicate phase values: ${duplicatePhaseValues.join(', ')}`);
    } else {
      console.log('No duplicate phase values found');
    }
    
    // Check for duplicate phase names
    const phaseNames = {};
    const duplicatePhaseNames = [];
    
    phases.forEach(phase => {
      if (phaseNames[phase.name]) {
        duplicatePhaseNames.push(phase.name);
      } else {
        phaseNames[phase.name] = true;
      }
    });
    
    if (duplicatePhaseNames.length > 0) {
      console.log(`Found ${duplicatePhaseNames.length} duplicate phase names: ${duplicatePhaseNames.join(', ')}`);
    } else {
      console.log('No duplicate phase names found');
    }
    
    // Get all statuses
    const statuses = await prisma.BcrConfigs.findMany({
      where: { type: 'status' },
      orderBy: { displayOrder: 'asc' }
    });
    
    console.log(`Found ${statuses.length} statuses in the database`);
    
    // Check for duplicate status values
    const statusValues = {};
    const duplicateStatusValues = [];
    
    statuses.forEach(status => {
      if (statusValues[status.value]) {
        duplicateStatusValues.push(status.value);
      } else {
        statusValues[status.value] = true;
      }
    });
    
    if (duplicateStatusValues.length > 0) {
      console.log(`Found ${duplicateStatusValues.length} duplicate status values: ${duplicateStatusValues.join(', ')}`);
    } else {
      console.log('No duplicate status values found');
    }
    
    // Check for duplicate status names
    const statusNames = {};
    const duplicateStatusNames = [];
    
    statuses.forEach(status => {
      if (statusNames[status.name]) {
        duplicateStatusNames.push(status.name);
      } else {
        statusNames[status.name] = true;
      }
    });
    
    if (duplicateStatusNames.length > 0) {
      console.log(`Found ${duplicateStatusNames.length} duplicate status names: ${duplicateStatusNames.join(', ')}`);
    } else {
      console.log('No duplicate status names found');
    }
    
    // Print all phases and statuses for verification
    console.log('\nAll Phases:');
    phases.forEach(phase => {
      console.log(`ID: ${phase.id}, Value: ${phase.value}, Name: ${phase.name}, Display Order: ${phase.displayOrder}`);
    });
    
    console.log('\nAll Statuses:');
    statuses.forEach(status => {
      console.log(`ID: ${status.id}, Value: ${status.value}, Name: ${status.name}, Display Order: ${status.displayOrder}`);
    });
    
  } catch (error) {
    console.error('Error checking for duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check function
checkBcrWorkflowDuplicates();
