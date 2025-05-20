/**
 * Script to update BCR statuses in the database
 * This script converts any 'new' status to 'new_submission'
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBcrStatuses() {
  console.log('Starting BCR status update...');
  
  try {
    // Convert 'new' status to 'new_submission'
    console.log('Converting any "new" status to "new_submission"...');
    const newToNewSubmission = await prisma.$executeRaw`
      UPDATE "Bcrs" 
      SET "status" = 'new_submission', "updatedAt" = NOW() 
      WHERE "status" = 'new'
    `;
    console.log(`Updated ${newToNewSubmission} BCRs from 'new' to 'new_submission'`);
    
    // Verify the updates
    console.log('\nVerifying BCR statuses after update:');
    const bcrs = await prisma.$queryRaw`
      SELECT status, COUNT(*)::text as count
      FROM "Bcrs"
      GROUP BY status
      ORDER BY count DESC
    `;
    
    console.log('BCR status counts:');
    console.log(JSON.stringify(bcrs, null, 2));
    
    console.log('\nBCR status update completed successfully!');
    return true;
  } catch (error) {
    console.error('Error updating BCR statuses:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updateBcrStatuses()
  .then((success) => {
    if (success) {
      console.log('All status updates applied successfully.');
    } else {
      console.error('Failed to apply all status updates.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
