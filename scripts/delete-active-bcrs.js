/**
 * Script to delete all active BCRs and reset converted submissions
 * CAUTION: This script will permanently delete all active BCRs from the system but keep submissions
 * Run with: node scripts/delete-active-bcrs.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Delete all active BCRs and reset converted submissions
 * This will:
 * 1. Delete all BCRs from the system
 * 2. Reset all submissions that were converted to BCRs back to Pending Review status
 * 3. Keep all submissions intact
 */
async function deleteActiveBcrsAndResetSubmissions() {
  try {
    console.log('Starting deletion of active BCRs...');
    
    // Find all BCRs in the system
    const allBcrs = await prisma.Bcrs.findMany();
    
    console.log(`Found ${allBcrs.length} BCRs to delete.`);
    
    if (allBcrs.length === 0) {
      console.log('No BCRs found. Nothing to delete.');
      await prisma.$disconnect();
      return;
    }
    
    // Delete each BCR and reset its submission
    for (const bcr of allBcrs) {
      console.log(`Deleting BCR: ${bcr.bcrCode} (ID: ${bcr.id})`);
      
      // Update any submissions to remove the BCR reference
      if (bcr.submissionId) {
        // First get the submission to check the relationship structure
        const submission = await prisma.Submission.findUnique({
          where: { id: bcr.submissionId },
          include: { bcr: true }
        });
        
        if (submission) {
          console.log(`  - Found submission ${bcr.submissionId}`);
          
          // Update the submission to disconnect from the BCR
          await prisma.Submission.update({
            where: { id: bcr.submissionId },
            data: {
              bcr: { disconnect: true },
              reviewOutcome: 'Pending Review', // Reset to pending review
              updatedAt: new Date()
            }
          });
          console.log(`  - Updated submission ${bcr.submissionId} to remove BCR reference`);
        }
      }
      
      // Delete the BCR
      await prisma.Bcrs.delete({
        where: { id: bcr.id }
      });
      
      console.log(`  - BCR ${bcr.bcrCode} deleted successfully`);
    }
    
    console.log('All active BCRs have been deleted successfully.');
    
    // Refresh counters
    const counterService = require('../services/counterService');
    await counterService.refreshCounters();
    console.log('Counters refreshed.');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error deleting active BCRs:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Execute the function
deleteActiveBcrsAndResetSubmissions()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
