/**
 * Script to fix the BCR submissions route
 */
require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const nunjucks = require('nunjucks');
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Import the Submission model
const Submission = require('../models/Submission');

// Set up Nunjucks templating
const viewPaths = [
  path.join(__dirname, '../views')
];

nunjucks.configure(viewPaths, {
  autoescape: true,
  express: app
});

app.set('view engine', 'njk');

// Helper function to get the appropriate status tag for a submission
function getSubmissionStatusTag(submission) {
  // Use standardized GOV.UK Design System tag colors
  if (!submission.status) {
    return { text: 'Unknown', class: 'govuk-tag govuk-tag--grey' };
  }
  
  switch (submission.status.toLowerCase()) {
    case 'pending':
      return { text: 'Pending', class: 'govuk-tag govuk-tag--blue' };
    case 'approved':
      return { text: 'Approved', class: 'govuk-tag govuk-tag--green' };
    case 'rejected':
      return { text: 'Rejected', class: 'govuk-tag govuk-tag--red' };
    case 'paused':
      return { text: 'Paused', class: 'govuk-tag govuk-tag--yellow' };
    case 'closed':
      return { text: 'Closed', class: 'govuk-tag govuk-tag--grey' };
    case 'more info required':
      return { text: 'More Info Required', class: 'govuk-tag govuk-tag--orange' };
    default:
      return { text: submission.status, class: 'govuk-tag' };
  }
}

// BCR submissions route
app.get('/bcr/submissions', async (req, res) => {
  try {
    console.log('BCR submissions route called');
    
    // Get all submissions
    const submissions = await Submission.find().sort({ createdAt: -1 });
    
    // Format submissions for display
    const formattedSubmissions = submissions.map(submission => {
      // Get status tag for display
      const statusTag = getSubmissionStatusTag(submission);
      
      return {
        id: submission._id || submission.id,
        submissionCode: submission.submissionCode || 'N/A',
        briefDescription: submission.briefDescription || 'No description provided',
        fullName: submission.fullName || 'Unknown',
        emailAddress: submission.emailAddress || 'No email provided',
        submissionSource: submission.submissionSource || 'Unknown',
        organisation: submission.organisation || 'Not specified',
        urgencyLevel: submission.urgencyLevel || 'Not specified',
        impactAreas: Array.isArray(submission.impactAreas) ? submission.impactAreas.join(', ') : 'None',
        displayStatus: statusTag.text,
        statusClass: statusTag.class,
        createdAt: submission.createdAt ? 
          new Date(submission.createdAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Unknown',
        updatedAt: submission.updatedAt ? 
          new Date(submission.updatedAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Unknown',
        reviewedAt: submission.reviewedAt ? 
          new Date(submission.reviewedAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Not reviewed'
      };
    });
    
    console.log(`Found ${formattedSubmissions.length} submissions`);
    
    // Render the submissions page
    res.render('modules/bcr/submissions/index', {
      title: 'BCR Submissions',
      submissions: formattedSubmissions,
      filters: req.query,
      connectionIssue: false,
      timedOut: false,
      user: { name: 'Test User', role: 'admin' }
    });
  } catch (error) {
    console.error('Error in BCR submissions route:', error);
    res.status(500).send('Error loading BCR submissions: ' + error.message);
  }
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}/bcr/submissions to view BCR submissions`);
});

// Handle server shutdown
process.on('SIGINT', () => {
  mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});
