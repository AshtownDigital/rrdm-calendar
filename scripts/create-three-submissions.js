/**
 * Script to create 3 test submissions without BCRs
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createThreeSubmissions() {
  try {
    console.log('Creating 3 test submissions...');
    
    // Get current year and next year for submission code
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const nextYear = (parseInt(currentYear) + 1).toString().padStart(2, '0');
    const yearCode = `${currentYear}/${nextYear}`;
    
    // Count existing submissions to determine the next number
    const submissionCount = await prisma.submission.count();
    
    const submissions = [];
    
    // Create 3 test submissions with different urgency levels
    const urgencyLevels = ['Low', 'Medium', 'High'];
    const descriptions = [
      'Test submission with low urgency',
      'Test submission with medium urgency',
      'Test submission with high urgency'
    ];
    
    for (let i = 0; i < 3; i++) {
      const submissionNumber = (submissionCount + i + 1).toString().padStart(3, '0');
      const submissionCode = `SUB-${yearCode}-${submissionNumber}`;
      const now = new Date();
      
      // Create the submission
      const submission = await prisma.submission.create({
        data: {
          submissionCode,
          fullName: `Test User ${i + 1}`,
          emailAddress: `test${i + 1}@example.com`,
          submissionSource: 'Internal',
          briefDescription: descriptions[i],
          justification: `This is a test submission ${i + 1} with ${urgencyLevels[i]} urgency.`,
          urgencyLevel: urgencyLevels[i],
          impactAreas: [
            '2567742d-97bd-404a-bb84-e52a674d1dd0', // Funding
            '2f06f203-33e0-4992-89db-9bffd592fac4'  // Policy
          ],
          affectedReferenceDataArea: `Test Reference Data Area ${i + 1}`,
          technicalDependencies: 'None - this is a test',
          relatedDocuments: 'None',
          attachments: 'No',
          additionalNotes: `This is test submission ${i + 1} created via script`,
          declaration: true,
          reviewOutcome: 'Pending Review', // Set default review outcome
          createdAt: now,
          updatedAt: now,
          submittedById: '00000000-0000-0000-0000-000000000001' // Admin user ID
        }
      });
      
      submissions.push(submission);
      console.log(`Created submission ${i + 1}: ${submissionCode}`);
    }
    
    console.log('\nAll submissions created successfully:');
    submissions.forEach((sub, index) => {
      console.log(`\nSubmission ${index + 1}:`);
      console.log(`ID: ${sub.id}`);
      console.log(`Code: ${sub.submissionCode}`);
      console.log(`Urgency: ${sub.urgencyLevel}`);
      console.log(`Review Outcome: ${sub.reviewOutcome || 'Not set'}`);
    });
    
  } catch (error) {
    console.error('Error creating test submissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createThreeSubmissions();
