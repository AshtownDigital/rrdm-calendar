/**
 * Script to create a test BCR submission
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestSubmission() {
  try {
    console.log('Creating test BCR submission...');
    
    // Get current year and next year for submission code
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const nextYear = (parseInt(currentYear) + 1).toString().padStart(2, '0');
    const yearCode = `${currentYear}/${nextYear}`;
    
    // Count existing submissions to determine the next number
    const submissionCount = await prisma.submission.count();
    const submissionNumber = (submissionCount + 1).toString().padStart(3, '0');
    const submissionCode = `SUB-${yearCode}-${submissionNumber}`;
    
    // Create the test submission
    const now = new Date();
    const submission = await prisma.submission.create({
      data: {
        submissionCode,
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        submissionSource: 'Internal',
        briefDescription: 'Test BCR submission for system verification',
        justification: 'This is a test submission to verify the BCR submission process is working correctly.',
        urgencyLevel: 'Medium',
        impactAreas: ['c7c76da8-3b82-409e-aeab-55f9f616e6dd', '2bf9a082-1d49-4338-9d3e-85acafebd77c'], // Funding and Systems impact areas
        affectedReferenceDataArea: 'Test Reference Data Area',
        technicalDependencies: 'None - this is a test',
        relatedDocuments: 'None',
        attachments: 'No',
        additionalNotes: 'This is a test submission created via script',
        declaration: true,
        // reviewOutcome is now handled by the system
        createdAt: now,
        updatedAt: now,
        submittedById: '00000000-0000-0000-0000-000000000001' // Admin user ID
      }
    });
    
    console.log('Test submission created successfully:');
    console.log(submission);
    
    // Create a BCR record linked to this submission
    const bcrCode = `BCR-${yearCode}-${submissionNumber}`;
    const bcr = await prisma.bcr.create({
      data: {
        bcrCode,
        submissionId: submission.id,
        currentPhase: 'Initial Assessment',
        status: 'Submitted',
        urgencyLevel: 'Medium',
        impactedAreas: ['c7c76da8-3b82-409e-aeab-55f9f616e6dd', '2bf9a082-1d49-4338-9d3e-85acafebd77c'],
        workflowHistory: JSON.stringify([{
          phase: 'Submission',
          status: 'Submitted',
          timestamp: now.toISOString(),
          userId: '00000000-0000-0000-0000-000000000001',
          userName: 'System'
        }]),
        createdAt: now,
        updatedAt: now
      }
    });
    
    console.log('BCR record created successfully:');
    console.log(bcr);
    
    // Update the submission with the BCR ID
    await prisma.submission.update({
      where: { id: submission.id },
      data: { bcrId: bcr.id }
    });
    
    console.log('Submission updated with BCR ID');
    
  } catch (error) {
    console.error('Error creating test submission:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createTestSubmission();
