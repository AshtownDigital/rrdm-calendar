/**
 * Script to fix the phase-status mapping relationships in the database
 * This script updates the existing phase and status configurations to ensure proper relationships
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPhaseStatusMapping() {
  try {
    console.log('Starting to fix phase-status mapping relationships...');
    
    // Get existing phases and statuses
    const phases = await prisma.bcrConfigs.findMany({
      where: { type: 'phase' },
      orderBy: { displayOrder: 'asc' }
    });
    
    const statuses = await prisma.bcrConfigs.findMany({
      where: { type: 'status' },
      orderBy: { displayOrder: 'asc' }
    });
    
    console.log(`Found ${phases.length} phases and ${statuses.length} statuses`);
    
    // Define the expected relationships between phases and statuses
    const expectedRelationships = [
      { phaseName: 'Submission', inProgressStatus: 'New Submission', completedStatus: 'Submitted' },
      { phaseName: 'Prioritisation', inProgressStatus: 'Being Prioritised', completedStatus: 'Prioritised' },
      { phaseName: 'Technical Review and Analysis', inProgressStatus: 'Under Technical Review', completedStatus: 'Technical Review Complete' },
      { phaseName: 'Governance Playback', inProgressStatus: 'In Governance Review', completedStatus: 'Governance Approved' },
      { phaseName: 'Stakeholder Consultation', inProgressStatus: 'Consulting Stakeholders', completedStatus: 'Stakeholders Consulted' },
      { phaseName: 'Final Drafting', inProgressStatus: 'Drafting In Progress', completedStatus: 'Draft Completed' },
      { phaseName: 'Final Approval', inProgressStatus: 'Awaiting Final Approval', completedStatus: 'Final Approval Granted' },
      { phaseName: 'Implementation', inProgressStatus: 'Being Implemented', completedStatus: 'Implementation Complete' },
      { phaseName: 'Validation & Testing', inProgressStatus: 'Testing In Progress', completedStatus: 'Testing Passed' },
      { phaseName: 'Go Live', inProgressStatus: 'Preparing for Go Live', completedStatus: 'Gone Live' },
      { phaseName: 'Post-Implementation Review', inProgressStatus: 'Under Post-Implementation Review', completedStatus: 'Review Completed' },
      { phaseName: 'Closed', inProgressStatus: 'Closing', completedStatus: 'Closed' }
    ];
    
    // Update each status to ensure it has the correct phase value
    console.log('Updating status-phase relationships...');
    
    for (const relationship of expectedRelationships) {
      // Find the phase
      const phase = phases.find(p => p.name === relationship.phaseName);
      if (!phase) {
        console.log(`⚠️ Phase not found: ${relationship.phaseName}`);
        continue;
      }
      
      // Find and update the in-progress status
      const inProgressStatus = statuses.find(s => s.name === relationship.inProgressStatus);
      if (inProgressStatus) {
        if (inProgressStatus.value !== phase.value) {
          await prisma.bcrConfigs.update({
            where: { id: inProgressStatus.id },
            data: { value: phase.value }
          });
          console.log(`✅ Updated in-progress status "${relationship.inProgressStatus}" to phase "${relationship.phaseName}" (${phase.value})`);
        } else {
          console.log(`✓ In-progress status "${relationship.inProgressStatus}" already linked to phase "${relationship.phaseName}"`);
        }
      } else {
        console.log(`⚠️ In-progress status not found: ${relationship.inProgressStatus}`);
      }
      
      // Find and update the completed status
      const completedStatus = statuses.find(s => s.name === relationship.completedStatus);
      if (completedStatus) {
        if (completedStatus.value !== phase.value) {
          await prisma.bcrConfigs.update({
            where: { id: completedStatus.id },
            data: { value: phase.value }
          });
          console.log(`✅ Updated completed status "${relationship.completedStatus}" to phase "${relationship.phaseName}" (${phase.value})`);
        } else {
          console.log(`✓ Completed status "${relationship.completedStatus}" already linked to phase "${relationship.phaseName}"`);
        }
      } else {
        console.log(`⚠️ Completed status not found: ${relationship.completedStatus}`);
      }
    }
    
    console.log('\nPhase-status mapping relationships fixed successfully!');
  } catch (error) {
    console.error('Error fixing phase-status mapping relationships:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixPhaseStatusMapping();
