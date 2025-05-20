/**
 * Script to delete all existing BCRs and create a new one with 'new_submission' status
 * This ensures we're starting fresh with the correct status values
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function deleteAllBcrsAndCreateNew() {
  console.log('Starting deletion of all BCRs...');
  
  try {
    // Step 1: Delete all existing BCRs
    const deleteResult = await prisma.$executeRaw`DELETE FROM "Bcrs"`;
    console.log(`Deleted ${deleteResult} BCRs from the database`);
    
    // Step 2: Get a user ID to use as the requestedBy
    const users = await prisma.$queryRaw`SELECT id FROM "Users" LIMIT 1`;
    
    if (!users || users.length === 0) {
      console.error('No users found in the database. Please create a user first.');
      return;
    }
    
    const userId = users[0].id;
    console.log(`Using user ID: ${userId} for the new BCR`);
    
    // Step 3: Generate a BCR number
    const currentYear = new Date().getFullYear();
    const fiscalYearStart = currentYear - (new Date().getMonth() >= 3 ? 0 : 1);
    const fiscalYearEnd = fiscalYearStart + 1;
    const shortYearStart = fiscalYearStart.toString().slice(-2);
    const shortYearEnd = fiscalYearEnd.toString().slice(-2);
    const bcrNumber = `BCR-${shortYearStart}/${shortYearEnd}-0001`;
    
    console.log(`Generated BCR number: ${bcrNumber}`);
    
    // Step 4: Create a new BCR with 'new_submission' status
    const bcrId = uuidv4();
    const now = new Date();
    const title = `Business Change Request: System Update ${currentYear}`;
    
    await prisma.$executeRaw`
      INSERT INTO "Bcrs" (
        "id", "bcrNumber", "title", "description", "status", "priority", "impact",
        "notes", "createdAt", "updatedAt", "requestedBy"
      ) VALUES (
        ${bcrId}::uuid, ${bcrNumber}, ${title}, 'This is a new BCR created with new_submission status',
        'new_submission', 'medium', 'Systems',
        'Created by script after deleting all BCRs', ${now}, ${now}, ${userId}::uuid
      )
    `;
    
    console.log(`Successfully created new BCR with ID: ${bcrId}`);
    console.log(`BCR Number: ${bcrNumber}`);
    console.log(`Title: ${title}`);
    console.log(`Status: new_submission`);
    
    // Step 5: Verify the new BCR
    const newBcr = await prisma.$queryRaw`
      SELECT id, "bcrNumber", title, status FROM "Bcrs" WHERE id = ${bcrId}::uuid
    `;
    
    if (newBcr && newBcr.length > 0) {
      console.log('\nVerified new BCR:');
      console.log(JSON.stringify(newBcr[0], null, 2));
    }
    
    return {
      id: bcrId,
      bcrNumber,
      title,
      status: 'new_submission'
    };
  } catch (error) {
    console.error('Error in delete and create operation:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
deleteAllBcrsAndCreateNew()
  .then((bcr) => {
    if (bcr) {
      console.log('\nOperation completed successfully!');
      console.log('All BCRs were deleted and a new one was created with new_submission status.');
    } else {
      console.error('Operation failed.');
    }
    process.exit(bcr ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
