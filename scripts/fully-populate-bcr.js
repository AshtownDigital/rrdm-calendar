/**
 * Script to fully populate all fields for the test BCR
 * This ensures that every field in the submission details page is populated
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function fullyPopulateBcr() {
  console.log('Fully populating the test BCR with complete information for all fields...');
  
  try {
    // Get the test BCR we created earlier
    const bcrId = 'd7e706b8-b65f-4d69-bf6a-e7740991bfb0';
    const bcr = await prisma.Bcrs.findUnique({
      where: { id: bcrId }
    });
    
    if (!bcr) {
      console.error(`BCR with ID ${bcrId} not found.`);
      return;
    }
    
    console.log('Found BCR:', bcr);
    
    // Get the impact areas
    const impactAreas = await prisma.bcrConfigs.findMany({
      where: { type: 'impactArea' },
      orderBy: { displayOrder: 'asc' }
    });
    
    // Select all impact areas to use
    const selectedImpactAreas = impactAreas.map(area => area.name);
    
    // Create a submission record linked to the BCR
    const submissionId = uuidv4();
    const submission = await prisma.submission.create({
      data: {
        id: submissionId,
        submissionNumber: `SUB-${bcr.bcrNumber}`,
        bcrId: bcrId,
        submittedById: '00000000-0000-0000-0000-000000000001',
        submissionDate: bcr.createdAt,
        notes: 'Initial submission of the BCR'
      }
    });
    
    console.log('Created submission record:', submission);
    
    // Create a workflow activity record for the BCR
    const workflowActivityId = uuidv4();
    const workflowActivity = await prisma.bcrWorkflowActivity.create({
      data: {
        id: workflowActivityId,
        bcrId: bcrId,
        phase: 'submission',
        status: 'new_submission',
        action: 'BCR submitted',
        performedById: '00000000-0000-0000-0000-000000000001',
        performedAt: bcr.createdAt,
        notes: 'BCR submitted for review'
      }
    });
    
    console.log('Created workflow activity record:', workflowActivity);
    
    // Update the BCR with fully populated information
    const updatedBcr = await prisma.Bcrs.update({
      where: { id: bcrId },
      data: {
        description: 'This is a comprehensive test BCR to demonstrate the impact area functionality. It includes multiple impact areas and detailed justification. The changes will affect backend systems, frontend components, and API endpoints. This BCR is created as part of the testing process for the new Impact Areas feature.',
        status: 'new_submission',
        priority: 'high',
        impact: selectedImpactAreas.join(', '),
        notes: `
Initial submission: This BCR is created to test the impact areas functionality.
Impact areas affected: ${selectedImpactAreas.join(', ')}
Justification: The changes are needed to improve the user experience and fix several critical bugs.
Technical details: Will require updates to the database schema and frontend components.
Implementation plan: The changes will be implemented in phases, starting with the backend updates.
Testing strategy: Comprehensive testing will be performed to ensure all components work correctly.
Documentation: All changes will be documented in the technical specifications.
        `,
        targetDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
        updatedAt: new Date()
      }
    });
    
    console.log('Successfully updated test BCR with complete information');
    console.log('Updated BCR:', updatedBcr);
    
    return {
      bcr: updatedBcr,
      submission,
      workflowActivity
    };
  } catch (error) {
    console.error('Error fully populating test BCR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fullyPopulateBcr()
  .then((result) => {
    if (result) {
      console.log('Full population script completed successfully.');
      console.log('BCR ID:', result.bcr.id);
      console.log('BCR Number:', result.bcr.bcrNumber);
      console.log('Submission ID:', result.submission.id);
      console.log('Workflow Activity ID:', result.workflowActivity.id);
      console.log('\nView the BCR at:');
      console.log(`http://localhost:3000/direct/bcr-submissions/${result.bcr.id}`);
    } else {
      console.log('Script completed with errors.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
