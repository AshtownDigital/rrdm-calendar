/**
 * Debug script for BCR submission list
 * This script helps diagnose issues with the BCR submission list page
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSubmissionList() {
  try {
    console.log('=== DEBUG: BCR SUBMISSION LIST ===');
    
    // 1. Check if there are any submissions in the database
    console.log('\n1. Checking for submissions in the database...');
    const submissionCount = await prisma.submission.count();
    console.log(`Total submissions in database: ${submissionCount}`);
    
    // 2. Get all submissions with no filters
    console.log('\n2. Getting all submissions with no filters...');
    const allSubmissions = await prisma.submission.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Retrieved ${allSubmissions.length} submissions`);
    allSubmissions.forEach((sub, i) => {
      console.log(`\nSubmission ${i + 1}:`);
      console.log(`ID: ${sub.id}`);
      console.log(`Code: ${sub.submissionCode}`);
      console.log(`Full Name: ${sub.fullName}`);
      console.log(`Deleted At: ${sub.deletedAt}`);
      console.log(`Created At: ${sub.createdAt}`);
    });
    
    // 3. Check with the specific where condition used in the controller
    console.log('\n3. Checking with the specific where condition used in the controller...');
    const whereConditions = { deletedAt: null };
    const filteredSubmissions = await prisma.submission.findMany({
      where: whereConditions,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Retrieved ${filteredSubmissions.length} submissions with deletedAt: null`);
    filteredSubmissions.forEach((sub, i) => {
      console.log(`\nSubmission ${i + 1}:`);
      console.log(`ID: ${sub.id}`);
      console.log(`Code: ${sub.submissionCode}`);
      console.log(`Full Name: ${sub.fullName}`);
    });
    
    // 4. Check if there are any issues with the impactedArea relationships
    console.log('\n4. Checking impactedArea relationships...');
    if (filteredSubmissions.length > 0) {
      const submission = filteredSubmissions[0];
      console.log(`Checking impact areas for submission: ${submission.submissionCode}`);
      console.log(`Impact Areas: ${JSON.stringify(submission.impactAreas)}`);
      
      if (submission.impactAreas && submission.impactAreas.length > 0) {
        const impactedAreas = await prisma.impactedArea.findMany({
          where: {
            id: {
              in: submission.impactAreas
            }
          }
        });
        
        console.log(`Found ${impactedAreas.length} matching impact areas`);
        impactedAreas.forEach(area => {
          console.log(`- ${area.name}: ${area.id}`);
        });
      } else {
        console.log('No impact areas found for this submission');
      }
    }
    
    // 5. Check user relationship
    console.log('\n5. Checking user relationship...');
    if (filteredSubmissions.length > 0) {
      const submission = filteredSubmissions[0];
      console.log(`Checking user for submission: ${submission.submissionCode}`);
      console.log(`Submitted By ID: ${submission.submittedById}`);
      
      const user = await prisma.users.findUnique({
        where: { id: submission.submittedById }
      });
      
      if (user) {
        console.log(`Found user: ${user.name} (${user.email})`);
      } else {
        console.log('No matching user found!');
      }
    }
    
  } catch (error) {
    console.error('Error in debug script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugSubmissionList();
