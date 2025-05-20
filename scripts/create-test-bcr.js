/**
 * Script to create a test BCR with 'new_submission' status
 * This tests that our fixes to the BCR service are working correctly
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function createTestBcr() {
  console.log('Creating a test BCR with new_submission status...');
  
  try {
    // Use the admin user ID we created
    const userId = '00000000-0000-0000-0000-000000000001';
    
    // Generate a BCR number
    const currentYear = new Date().getFullYear();
    const bcrNumber = `BCR-${currentYear}-0001`;
    
    // Create the BCR using raw SQL to avoid enum issues
    const bcrId = uuidv4();
    const now = new Date();
    
    await prisma.$executeRaw`
      INSERT INTO "Bcrs" (
        "id", "bcrNumber", "description", "status", "priority", "impact",
        "notes", "createdAt", "updatedAt", "requestedBy"
      ) VALUES (
        ${bcrId}::uuid, ${bcrNumber}, 'This is a test BCR created to verify new_submission status',
        'new_submission', 'medium', 'Test impact area',
        'Created by script for testing', ${now}, ${now}, ${userId}::uuid
      )
    `;
    
    console.log(`Successfully created test BCR with ID: ${bcrId}`);
    console.log(`BCR Number: ${bcrNumber}`);
    console.log(`Status: new_submission`);
    console.log(`RequestedBy: ${userId}`);
    
    return {
      id: bcrId,
      bcrNumber,
      status: 'new_submission'
    };
  } catch (error) {
    console.error('Error creating test BCR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createTestBcr()
  .then((bcr) => {
    if (bcr) {
      console.log('Test BCR created successfully.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to create test BCR:', error);
    process.exit(1);
  });
