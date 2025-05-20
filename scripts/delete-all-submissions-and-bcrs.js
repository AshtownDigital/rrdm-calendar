/**
 * Script to delete ALL submissions and BCRs
 * CAUTION: This script will permanently delete ALL submissions and BCRs from the system
 * Run with: node scripts/delete-all-submissions-and-bcrs.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllSubmissionsAndBcrs() {
  try {
    console.log('Starting deletion of all Submission and BCR records...');
    
    // Get counts before deletion
    const beforeBcrCount = await prisma.bcrs.count();
    const beforeNewBcrCount = await prisma.bcr.count();
    const beforeSubmissionCount = await prisma.submission.count();
    
    console.log(`Current counts:`);
    console.log(`- Legacy BCRs: ${beforeBcrCount}`);
    console.log(`- New BCRs: ${beforeNewBcrCount}`);
    console.log(`- Submissions: ${beforeSubmissionCount}`);
    
    console.log('\nDeleting records...');
    
    // Delete all new BCR records first (due to foreign key constraints)
    const deleteBcrResult = await prisma.bcr.deleteMany({});
    console.log(`Successfully deleted ${deleteBcrResult.count} new BCR records`);
    
    // Delete all Submission records
    const deleteSubmissionResult = await prisma.submission.deleteMany({});
    console.log(`Successfully deleted ${deleteSubmissionResult.count} Submission records`);
    
    // Delete all legacy BCR records
    const deleteLegacyBcrResult = await prisma.bcrs.deleteMany({});
    console.log(`Successfully deleted ${deleteLegacyBcrResult.count} legacy BCR records`);
    
    // Verify deletion
    const afterBcrCount = await prisma.bcrs.count();
    const afterNewBcrCount = await prisma.bcr.count();
    const afterSubmissionCount = await prisma.submission.count();
    
    console.log('\nVerification counts:');
    console.log(`- Legacy BCRs: ${afterBcrCount}`);
    console.log(`- New BCRs: ${afterNewBcrCount}`);
    console.log(`- Submissions: ${afterSubmissionCount}`);
    
    console.log('\nOperation completed successfully');
    
    return {
      legacyBcrs: deleteLegacyBcrResult.count,
      newBcrs: deleteBcrResult.count,
      submissions: deleteSubmissionResult.count
    };
  } catch (error) {
    console.error('Error deleting records:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
deleteAllSubmissionsAndBcrs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to delete records:', error);
    process.exit(1);
  });
