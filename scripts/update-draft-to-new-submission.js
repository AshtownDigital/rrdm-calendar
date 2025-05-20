/**
 * Script to update all BCRs with 'draft' status to 'new_submission'
 * This enforces the business rule that all BCRs must use 'new_submission' status
 * and 'draft' status is not allowed
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateDraftToNewSubmission() {
  console.log('Starting update of draft BCRs to new_submission status...');
  
  try {
    // First, count how many records we're going to update
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "Bcrs" WHERE "status" = 'draft'
    `;
    
    const count = parseInt(countResult[0].count, 10);
    console.log(`Found ${count} BCRs with 'draft' status to update.`);
    
    // Use raw SQL to update the records directly
    const result = await prisma.$executeRaw`
      UPDATE "Bcrs" 
      SET "status" = 'new_submission', "updatedAt" = NOW() 
      WHERE "status" = 'draft'
    `;
    
    console.log(`Updated ${result} BCRs from 'draft' to 'new_submission' status.`);
  } catch (error) {
    console.error('Error updating BCR statuses:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updateDraftToNewSubmission()
  .then(() => {
    console.log('Update completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Update failed:', error);
    process.exit(1);
  });
