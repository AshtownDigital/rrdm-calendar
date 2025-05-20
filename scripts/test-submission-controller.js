/**
 * Script to test the BCR submission controller
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const submissionModel = require('../models/bcr-submission/model');
const { formatDate } = require('../utils/dateUtils');

// Mock request and response objects
const req = {
  user: { id: '00000000-0000-0000-0000-000000000001', name: 'Admin User' }
};

const res = {
  render: (view, data) => {
    console.log(`\nRendering view: ${view}`);
    console.log('Data passed to view:');
    console.log(JSON.stringify(data, null, 2));
  },
  status: (code) => {
    console.log(`\nStatus code: ${code}`);
    return res;
  }
};

// Function to simulate the list controller action
async function testListController() {
  try {
    console.log('Testing BCR submission list controller...');
    
    // Get all submissions
    const submissions = await submissionModel.getAllSubmissions();
    
    // Format dates for display
    const formattedSubmissions = submissions.map(submission => ({
      ...submission,
      createdAtFormatted: formatDate(submission.createdAt),
      reviewedAtFormatted: submission.reviewedAt ? formatDate(submission.reviewedAt) : null,
      deletedAtFormatted: submission.deletedAt ? formatDate(submission.deletedAt) : null,
      statusTag: getSubmissionStatusTag(submission)
    }));
    
    // Render the list page
    res.render('bcr-submission/list', {
      title: 'BCR Submissions',
      submissions: formattedSubmissions,
      csrfToken: 'mock-csrf-token',
      user: req.user
    });
  } catch (error) {
    console.error('Error testing list controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submissions list',
      error: error,
      user: req.user
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to get the appropriate status tag for a submission
function getSubmissionStatusTag(submission) {
  if (submission.deletedAt) {
    return 'govuk-tag govuk-tag--grey';
  } else if (submission.reviewedAt) {
    return 'govuk-tag govuk-tag--blue';
  } else {
    return 'govuk-tag govuk-tag--yellow';
  }
}

// Run the test
testListController();
