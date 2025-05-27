/**
 * Script to assign BCR numbers to approved submissions
 * This will help us test the BCR dashboard's "Recent BCRs" section
 */
require('dotenv').config();
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

// Function to generate a BCR number
function generateBcrNumber(submission) {
  const date = new Date();
  const year = date.getFullYear();
  // Use the submission record number with leading zeros
  const recordNumber = String(submission.recordNumber).padStart(4, '0');
  return `BCR-${year}-${recordNumber}`;
}

// Function to assign BCR numbers to approved submissions
async function assignBcrNumbers() {
  try {
    console.log('Finding approved submissions without BCR numbers...');
    
    // Find all approved submissions that don't have a BCR number
    const submissions = await Submission.find({
      status: 'Approved',
      bcrNumber: { $exists: false }
    });
    
    console.log(`Found ${submissions.length} approved submissions without BCR numbers`);
    
    // Assign BCR numbers to each submission
    for (const submission of submissions) {
      const bcrNumber = generateBcrNumber(submission);
      
      // Update the submission with the BCR number
      await Submission.findByIdAndUpdate(submission._id, {
        bcrNumber: bcrNumber
      });
      
      console.log(`Assigned BCR number ${bcrNumber} to submission ${submission.submissionCode}`);
    }
    
    console.log('BCR numbers assigned successfully');
    
  } catch (error) {
    console.error('Error assigning BCR numbers:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
assignBcrNumbers();
