/**
 * Script to manually approve a submission and create a BCR
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { Submission, Bcr } = require('../models');
const workflowService = require('../models/modules/bcr/workflowService');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Generate a unique BCR code
const generateBcrCode = () => {
  const timestamp = new Date().getTime().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BCR-${timestamp}-${randomPart}`;
};

// Function to approve a submission and create a BCR
async function approveSubmission(submissionId) {
  try {
    console.log(`Approving submission ${submissionId}...`);
    
    // Find the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      console.error(`Submission not found with ID: ${submissionId}`);
      return;
    }
    
    console.log(`Found submission: ${submission.submissionCode}`);
    
    // Get the last BCR record to determine the next record number
    const lastBcr = await Bcr.findOne().sort({ recordNumber: -1 });
    const nextRecordNumber = lastBcr ? lastBcr.recordNumber + 1 : 1;
    
    console.log(`Creating BCR with record number: ${nextRecordNumber}`);
    
    // Create a new BCR record
    const bcr = new Bcr({
      recordNumber: nextRecordNumber,
      bcrCode: generateBcrCode(),
      submissionId: submission._id,
      currentPhase: 'Initial',
      status: 'Active',
      urgencyLevel: submission.urgencyLevel,
      impactedAreas: submission.impactAreas,
      workflowHistory: [{
        phase: 'Initial',
        status: 'Active',
        timestamp: new Date(),
        comments: 'BCR created from approved submission',
        userId: submission.submittedById
      }]
    });
    
    // Save the BCR
    const savedBcr = await bcr.save();
    
    // Update the submission
    submission.status = 'Approved';
    submission.bcrId = savedBcr._id;
    submission.reviewedAt = new Date();
    submission.reviewComments = 'Approved and BCR created';
    
    // Save the updated submission
    await submission.save();
    
    console.log(`Successfully approved submission ${submission.submissionCode}`);
    console.log(`Created BCR #${savedBcr.recordNumber} (${savedBcr.bcrCode})`);
    
  } catch (error) {
    console.error('Error approving submission:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Get the submission ID from command line arguments
const submissionId = process.argv[2];

if (!submissionId) {
  console.error('Please provide a submission ID as a command line argument');
  process.exit(1);
}

// Run the function
approveSubmission(submissionId);
