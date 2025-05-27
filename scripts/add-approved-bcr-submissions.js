/**
 * Script to create approved BCR submissions with BCR numbers
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

// Generate BCR number in the format BCR-YYYY-XXXX
function generateBcrNumber(index) {
  const year = new Date().getFullYear();
  return `BCR-${year}-${String(index).padStart(4, '0')}`;
}

// Generate 5 approved submissions with BCR numbers
const submissionData = [];
const urgencyLevels = ['Low', 'Medium', 'High', 'Critical'];
const impactAreaOptions = [
  'API', 'Database', 'Reference Data', 'Documentation & Guidance', 
  'Policy', 'Funding', 'CSV', 'Backend', 'Frontend', 'Security'
];
const submissionSources = ['Internal', 'External'];
const organisations = [
  'RRDM Team', 'Partner Company', 'External Consultant', 
  'Ashtown Digital', 'Government Agency', 'Research Institute'
];

// Generate 5 approved submissions with BCR numbers
for (let i = 1; i <= 5; i++) {
  const submissionSource = getRandomItem(submissionSources);
  const submitterType = getSubmitterTypeCode(submissionSource);
  
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
    fullName: `BCR Test User ${i}`,
    emailAddress: `bcr.test${i}@example.com`,
    submissionSource: submissionSource,
    organisation: getRandomItem(organisations),
    briefDescription: `Approved submission for testing #${i}`,
    justification: `This is an approved test submission with a BCR number (#${i})`,
    urgencyLevel: getRandomItem(urgencyLevels),
    impactAreas: impactAreas,
    attachments: 'No attachments for test submission',
    declaration: true,
    submittedById: dummyUserId,
    status: 'Approved',
    bcrNumber: generateBcrNumber(i + 2), // Start from BCR-YYYY-0003
    submissionCode: `SUB-24/25-00${i}-${submitterType}`,
    createdAt: getRandomDate(),
    reviewedAt: new Date() // Reviewed today
  };
  
  submission.reviewComments = `Approved - This submission has been reviewed and approved with BCR number ${submission.bcrNumber}`;
  
  submissionData.push(submission);
}

// Function to create approved BCR submissions
async function createApprovedBcrSubmissions() {
  try {
    console.log('Creating approved BCR submissions...');
    
    // Create submissions
    const submissions = [];
    for (let i = 0; i < submissionData.length; i++) {
      const data = submissionData[i];
      
      // Check if a submission with this BCR number already exists
      const existingSubmission = await Submission.findOne({ bcrNumber: data.bcrNumber });
      if (existingSubmission) {
        console.log(`Submission with BCR number ${data.bcrNumber} already exists, skipping...`);
        continue;
      }
      
      // Create the submission
      const submission = new Submission(data);
      
      await submission.save();
      submissions.push(submission);
      
      console.log(`Created approved submission with BCR number: ${submission.bcrNumber}, code: ${submission.submissionCode}`);
    }
    
    console.log('Successfully created approved test submissions with BCR numbers');
    
  } catch (error) {
    console.error('Error creating approved BCR submissions:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
createApprovedBcrSubmissions();
