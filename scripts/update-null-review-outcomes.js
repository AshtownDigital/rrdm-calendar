/**
 * Script to update submissions with null reviewOutcome to 'Pending Review'
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateNullReviewOutcomes() {
  try {
    console.log('Updating submissions with null reviewOutcome...');
    
    // Find submissions with null reviewOutcome
    const nullSubmissions = await prisma.submission.findMany({
      where: { reviewOutcome: null }
    });
    
    console.log(`Found ${nullSubmissions.length} submissions with null reviewOutcome`);
    
    // Update each submission to have 'Pending Review' as reviewOutcome
    for (const submission of nullSubmissions) {
      await prisma.submission.update({
        where: { id: submission.id },
        data: { reviewOutcome: 'Pending Review' }
      });
      console.log(`Updated submission ${submission.submissionCode} to 'Pending Review'`);
    }
    
    console.log('All submissions updated successfully');
    
  } catch (error) {
    console.error('Error updating submissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updateNullReviewOutcomes();
