/**
 * Script to migrate existing BCR data to the new BcrSubmissions and BcrWorkflows models
 * This script should be run after applying the database migration
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function migrateBcrData() {
  console.log('Starting BCR data migration...');
  
  try {
    // Get all existing BCRs
    const bcrs = await prisma.bcrs.findMany();
    console.log(`Found ${bcrs.length} BCRs to migrate`);
    
    // Process each BCR
    for (const bcr of bcrs) {
      console.log(`Migrating BCR ${bcr.bcrNumber || bcr.id}...`);
      
      // Generate BCR code in format BCR-YY/YY-XXXX
      const creationDate = new Date(bcr.createdAt);
      const fiscalYearStart = creationDate.getMonth() >= 3 ? creationDate.getFullYear() : creationDate.getFullYear() - 1;
      const fiscalYearEnd = fiscalYearStart + 1;
      const shortYearStart = fiscalYearStart.toString().slice(-2);
      const shortYearEnd = fiscalYearEnd.toString().slice(-2);
      const randomId = Math.floor(1000 + Math.random() * 9000); // 4-digit number
      const bcrCode = `BCR-${shortYearStart}/${shortYearEnd}-${randomId}`;
      
      // Create BcrSubmission record
      const submission = await prisma.bcrSubmissions.create({
        data: {
          id: uuidv4(),
          bcrId: bcr.id,
          bcrCode: bcrCode,
          description: bcr.description,
          priority: bcr.priority,
          impact: bcr.impact,
          requestedBy: bcr.requestedBy,
          createdAt: bcr.createdAt,
          updatedAt: bcr.createdAt, // Use creation date for initial submission
          bcrNumber: bcr.bcrNumber
        }
      });
      
      // Determine the appropriate status based on GOV.UK Design System tag colors
      // Use 'new_submission' for new BCRs, but preserve the status for BCRs in progress
      let workflowStatus = 'new_submission';
      
      // If the BCR is already in a later stage of the workflow, preserve its status
      if (['under_review', 'approved', 'rejected', 'implemented'].includes(bcr.status)) {
        workflowStatus = bcr.status;
      }
      
      // Create BcrWorkflow record
      const workflow = await prisma.bcrWorkflows.create({
        data: {
          id: uuidv4(),
          bcrId: bcr.id,
          status: workflowStatus,
          assignedTo: bcr.assignedTo,
          targetDate: bcr.targetDate,
          implementationDate: bcr.implementationDate,
          notes: bcr.notes ? bcr.notes + '\n[Migration] Status set to new_submission' : '[Migration] Status set to new_submission',
          createdAt: bcr.createdAt,
          updatedAt: bcr.updatedAt,
          currentPhase: null, // Will be populated based on status mapping
          previousStatus: bcr.status !== workflowStatus ? bcr.status : null,
          statusChangedAt: bcr.updatedAt,
          statusChangedBy: bcr.requestedBy // Assume requester made the last status change
        }
      });
      
      console.log(`Created submission ID ${submission.id} and workflow ID ${workflow.id} for BCR ${bcr.bcrNumber || bcr.id}`);
    }
    
    console.log('BCR data migration completed successfully!');
  } catch (error) {
    console.error('Error during BCR data migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateBcrData()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
