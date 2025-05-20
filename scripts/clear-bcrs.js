/**
 * Script to clear all BCRs and related data from the database
 * This script deletes all records from the Submission, BcrWorkflowActivity, Bcrs, and Bcr tables
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearBcrs() {
  console.log('Starting BCR cleanup process...');
  
  try {
    // First, update submissions to remove bcrId references
    await prisma.submission.updateMany({
      where: { bcrId: { not: null } },
      data: { bcrId: null }
    });
    console.log('Removed bcrId references from submissions');
    
    // Delete all workflow activities
    const deletedActivities = await prisma.bcrWorkflowActivity.deleteMany({});
    console.log(`Deleted ${deletedActivities.count} workflow activities`);
    
    // Delete all new Bcr model records
    let deletedNewBcrs = { count: 0 };
    try {
      deletedNewBcrs = await prisma.bcr.deleteMany({});
      console.log(`Deleted ${deletedNewBcrs.count} records from new Bcr model`);
    } catch (e) {
      console.log('No records in new Bcr model or table does not exist yet');
    }
    
    // Delete all legacy Bcrs model records
    const deletedLegacyBcrs = await prisma.bcrs.deleteMany({});
    console.log(`Deleted ${deletedLegacyBcrs.count} records from legacy Bcrs model`);
    
    // Finally, delete all submissions
    const deletedSubmissions = await prisma.submission.deleteMany({});
    console.log(`Deleted ${deletedSubmissions.count} submissions`);
    
    console.log('BCR cleanup completed successfully');
    
    // Create an audit log entry for this action
    await prisma.auditLog.create({
      data: {
        action: 'CLEAR_ALL_BCRS',
        userId: '00000000-0000-0000-0000-000000000001', // Admin user ID
        resourceType: 'BCR',
        resourceId: 'ALL',
        details: JSON.stringify({
          submissionsDeleted: deletedSubmissions.count,
          activitiesDeleted: deletedActivities.count,
          newBcrsDeleted: deletedNewBcrs.count,
          legacyBcrsDeleted: deletedLegacyBcrs.count,
          timestamp: new Date().toISOString()
        }),
        ipAddress: '127.0.0.1'
      }
    });
    
    console.log('Audit log entry created');
    
  } catch (error) {
    console.error('Error during BCR cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
clearBcrs()
  .then(() => console.log('Script execution completed'))
  .catch(error => console.error('Script execution failed:', error));
