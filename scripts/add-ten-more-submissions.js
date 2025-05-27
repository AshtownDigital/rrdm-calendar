/**
 * Script to create 10 additional BCR submissions with different statuses
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Import models directly
const { Submission, UrgencyLevel } = require('../models');

// Verify models are loaded
if (!Submission || !UrgencyLevel) {
  console.error('Error: Models not properly loaded');
  process.exit(1);
}

// Import the submission code generator
const { generateSubmissionCode, getSubmitterTypeCode } = require('../utils/submissionCodeGenerator');

// Create a dummy user ID
const dummyUserId = new mongoose.Types.ObjectId();

// Generate random date within the last 30 days
function getRandomDate() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()));
}

// Get random item from array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate 10 new submissions with varied data
const submissionData = [];
const statuses = ['Pending', 'Approved', 'Rejected', 'Paused', 'More Info Required'];
const urgencyLevels = ['Low', 'Medium', 'High', 'Planning'];
const impactAreaOptions = [
  'API', 'Database', 'Reference Data', 'Documentation & Guidance', 
  'Policy', 'Funding', 'CSV', 'Backend', 'Frontend', 'Security'
];
const submissionSources = ['Internal', 'External', 'Other'];
const organisations = [
  'RRDM Team', 'Partner Company', 'External Consultant', 
  'Ashtown Digital', 'Government Agency', 'Research Institute',
  'Technology Partner', 'Regulatory Body', 'Healthcare Provider',
  'Educational Institution'
];

// Generate 10 submissions with varied data
for (let i = 1; i <= 10; i++) {
  const status = getRandomItem(statuses);
  const submissionSource = getRandomItem(submissionSources);
  
  // Create a random selection of 1-3 impact areas
  const numImpactAreas = Math.floor(Math.random() * 3) + 1;
  const impactAreas = [];
  for (let j = 0; j < numImpactAreas; j++) {
    const area = getRandomItem(impactAreaOptions);
    if (!impactAreas.includes(area)) {
      impactAreas.push(area);
    }
  }
  
  const submission = {
    fullName: `Additional Test User ${i}`,
    emailAddress: `additional.test${i}@example.com`,
    submissionSource: submissionSource,
    organisation: getRandomItem(organisations),
    briefDescription: `Additional ${status} submission for testing #${i}`,
    justification: `This is an additional test submission with ${status} status (#${i})`,
    urgencyLevel: getRandomItem(urgencyLevels),
    impactAreas: impactAreas,
    attachments: 'No attachments for test submission',
    declaration: true,
    submittedById: dummyUserId,
    status: status,
    createdAt: getRandomDate()
  };
  
  // Add review information for non-pending submissions
  if (status !== 'Pending') {
    submission.reviewedAt = new Date(submission.createdAt.getTime() + Math.random() * (new Date().getTime() - submission.createdAt.getTime()));
    submission.reviewComments = `${status} - Additional test review comment for submission #${i}`;
  }
  
  submissionData.push(submission);
}

// Function to create test submissions
async function createAdditionalSubmissions() {
  try {
    console.log('Creating 10 additional BCR submissions...');
    
    // Create submissions
    const submissions = [];
    for (let i = 0; i < submissionData.length; i++) {
      const data = submissionData[i];
      
      // Create the submission
      const submission = new Submission(data);
      
      await submission.save();
      submissions.push(submission);
      
      console.log(`Created ${submission.status} submission: ${submission.submissionCode} from ${submission.submissionSource} source`);
    }
    
    console.log('Successfully created 10 additional test submissions with different statuses');
    
  } catch (error) {
    console.error('Error creating additional test submissions:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
createAdditionalSubmissions();
