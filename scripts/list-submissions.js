/**
 * Test script to list BCR submissions
 * This script connects to the database and lists all submissions
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listSubmissions() {
  try {
    console.log('Fetching submissions from database...');
    
    // Query submissions from the database
    const submissions = await prisma.submission.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${submissions.length} submissions`);
    
    // Display each submission
    submissions.forEach((submission, index) => {
      console.log(`\n--- Submission ${index + 1} ---`);
      console.log(`ID: ${submission.id}`);
      console.log(`Code: ${submission.submissionCode}`);
      console.log(`Full Name: ${submission.fullName}`);
      console.log(`Email: ${submission.emailAddress}`);
      console.log(`Brief Description: ${submission.briefDescription}`);
      console.log(`Created At: ${submission.createdAt}`);
      console.log(`Impact Areas: ${submission.impactAreas}`);
      console.log(`Urgency Level: ${submission.urgencyLevel}`);
      console.log('------------------------');
    });
    
  } catch (error) {
    console.error('Error listing submissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
listSubmissions();
