/**
 * Script to update the Submission phase status in the database
 * This script directly updates the status for the Submission phase to "New Submission"
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSubmissionStatus() {
  try {
    console.log('Starting to update Submission phase status...');
    
    // Get phases to find the Submission phase
    const phases = await prisma.bcrConfigs.findMany({
      where: { type: 'phase' }
    });
    
    const submissionPhase = phases.find(p => p.name === 'Submission');
    
    if (!submissionPhase) {
      console.error('Submission phase not found!');
      return;
    }
    
    console.log(`Found Submission phase with value: ${submissionPhase.value}`);
    
    // Find the current In Progress status for the Submission phase
    const currentStatus = await prisma.bcrConfigs.findFirst({
      where: {
        type: 'status',
        value: submissionPhase.value,
        name: { not: { startsWith: 'completed:' } }
      }
    });
    
    if (!currentStatus) {
      console.error('No In Progress status found for Submission phase!');
      return;
    }
    
    console.log(`Found current status: ${currentStatus.name} with ID: ${currentStatus.id}`);
    
    // Update the status to "New Submission"
    const updatedStatus = await prisma.bcrConfigs.update({
      where: { id: currentStatus.id },
      data: {
        name: 'New Submission',
        updatedAt: new Date()
      }
    });
    
    console.log(`Updated status to: ${updatedStatus.name}`);
    
    // Update the status description if it exists
    const statusDescription = await prisma.bcrConfigs.findFirst({
      where: {
        type: 'status_description',
        name: `description:${currentStatus.name}`
      }
    });
    
    if (statusDescription) {
      const updatedDescription = await prisma.bcrConfigs.update({
        where: { id: statusDescription.id },
        data: {
          name: 'description:New Submission',
          value: 'In progress status for phase: Submission',
          updatedAt: new Date()
        }
      });
      
      console.log(`Updated status description to: ${updatedDescription.name}`);
    } else {
      console.log('No status description found to update');
    }
    
    console.log('Submission phase status updated successfully!');
  } catch (error) {
    console.error('Error updating Submission phase status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateSubmissionStatus();
