// Script to test counters by creating test submissions and BCRs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generate a unique submission code
function generateSubmissionCode() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SUB-${year}${month}-${random}`;
}

async function createTestData() {
  try {
    console.log('Starting creation of test data for counter verification...');
    
    // Create test submissions with different statuses
    console.log('\nCreating test submissions...');
    
    // User ID for all submissions
    const userId = '00000000-0000-0000-0000-000000000001';
    
    // 1. Create pending submissions
    const pendingSubmission1 = await prisma.submission.create({
      data: {
        submissionCode: generateSubmissionCode(),
        fullName: 'Test User 1',
        emailAddress: 'test1@example.com',
        organisation: 'Test Org',
        submissionSource: 'Internal',
        briefDescription: 'Pending Submission 1',
        justification: 'This is needed for testing',
        attachments: 'None',
        declaration: true,
        urgencyLevel: 'Medium',
        impactAreas: ['Data', 'Infrastructure'],
        status: 'Pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        submittedById: userId
      }
    });
    console.log(`Created pending submission 1: ${pendingSubmission1.id}`);
    
    const pendingSubmission2 = await prisma.submission.create({
      data: {
        submissionCode: generateSubmissionCode(),
        fullName: 'Test User 2',
        emailAddress: 'test2@example.com',
        organisation: 'Test Org 2',
        submissionSource: 'External',
        briefDescription: 'Pending Submission 2',
        justification: 'This is needed for testing high urgency',
        attachments: 'None',
        declaration: true,
        urgencyLevel: 'High',
        impactAreas: ['Security', 'Compliance'],
        status: 'Pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        submittedById: userId
      }
    });
    console.log(`Created pending submission 2: ${pendingSubmission2.id}`);
    
    // 2. Create a rejected submission
    const rejectedSubmission = await prisma.submission.create({
      data: {
        submissionCode: generateSubmissionCode(),
        fullName: 'Test User 3',
        emailAddress: 'test3@example.com',
        organisation: 'Test Org 3',
        submissionSource: 'Internal',
        briefDescription: 'Rejected Submission',
        justification: 'This was rejected for testing',
        attachments: 'None',
        declaration: true,
        urgencyLevel: 'Low',
        impactAreas: ['User Experience'],
        status: 'Rejected',
        createdAt: new Date(),
        updatedAt: new Date(),
        submittedById: userId
      }
    });
    console.log(`Created rejected submission: ${rejectedSubmission.id}`);
    
    // 3. Create an approved submission with a BCR
    const approvedSubmission = await prisma.submission.create({
      data: {
        submissionCode: generateSubmissionCode(),
        fullName: 'Test User 4',
        emailAddress: 'test4@example.com',
        organisation: 'Test Org 4',
        submissionSource: 'External',
        briefDescription: 'Approved Submission',
        justification: 'This was approved for testing',
        attachments: 'None',
        declaration: true,
        urgencyLevel: 'Critical',
        impactAreas: ['Data', 'Security'],
        status: 'Approved',
        createdAt: new Date(),
        updatedAt: new Date(),
        submittedById: userId
      }
    });
    console.log(`Created approved submission: ${approvedSubmission.id}`);
    
    // Create a BCR linked to the approved submission
    const bcr = await prisma.bcr.create({
      data: {
        bcrCode: 'BCR-2025-001',
        title: 'Test BCR from Approved Submission',
        description: 'This is a test BCR created from an approved submission',
        status: 'approved',
        urgencyLevel: 'Critical',
        currentPhase: 'Design',
        requestedBy: 'Test User 4',
        assignedTo: 'BCR Manager',
        submissionId: approvedSubmission.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log(`Created BCR: ${bcr.id}`);
    
    // Update the approved submission to link it to the BCR
    await prisma.submission.update({
      where: { id: approvedSubmission.id },
      data: { bcrId: bcr.id }
    });
    console.log(`Linked approved submission to BCR`);
    
    // Create another BCR in a different status
    const implementedBcr = await prisma.bcr.create({
      data: {
        bcrCode: 'BCR-2025-002',
        title: 'Implemented BCR',
        description: 'This is a test implemented BCR',
        status: 'implemented',
        urgencyLevel: 'High',
        currentPhase: 'Completed',
        requestedBy: 'Test User 5',
        assignedTo: 'BCR Manager',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log(`Created implemented BCR: ${implementedBcr.id}`);
    
    // Verify counts
    const [
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      totalBcrs,
      activeBcrs,
      implementedBcrs
    ] = await Promise.all([
      prisma.submission.count({ where: { deletedAt: null } }),
      prisma.submission.count({ 
        where: { 
          bcrId: null, 
          deletedAt: null,
          status: { notIn: ['Rejected'] }
        } 
      }),
      prisma.submission.count({ 
        where: { 
          bcrId: { not: null }, 
          deletedAt: null 
        } 
      }),
      prisma.submission.count({ 
        where: { 
          status: 'Rejected', 
          deletedAt: null 
        } 
      }),
      prisma.bcr.count(),
      prisma.bcr.count({ 
        where: { 
          status: { notIn: ['rejected', 'implemented', 'closed'] }
        } 
      }),
      prisma.bcr.count({ where: { status: 'implemented' } })
    ]);
    
    console.log('\nVerification counts:');
    console.log(`- Total Submissions: ${totalSubmissions} (Expected: 4)`);
    console.log(`- Pending Submissions: ${pendingSubmissions} (Expected: 2)`);
    console.log(`- Approved Submissions: ${approvedSubmissions} (Expected: 1)`);
    console.log(`- Rejected Submissions: ${rejectedSubmissions} (Expected: 1)`);
    console.log(`- Total BCRs: ${totalBcrs} (Expected: 2)`);
    console.log(`- Active BCRs: ${activeBcrs} (Expected: 1)`);
    console.log(`- Implemented BCRs: ${implementedBcrs} (Expected: 1)`);
    
    console.log('\nTest data creation completed successfully');
    
    return {
      pendingSubmission1,
      pendingSubmission2,
      rejectedSubmission,
      approvedSubmission,
      bcr,
      implementedBcr
    };
  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
createTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to create test data:', error);
    process.exit(1);
  });
