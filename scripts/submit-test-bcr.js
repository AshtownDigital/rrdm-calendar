/**
 * Script to create a test BCR submission
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { Submission } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Generate a unique submission code
const generateSubmissionCode = () => {
  const timestamp = new Date().getTime().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BCR-${timestamp}-${randomPart}`;
};

// Function to create a test BCR submission
async function createTestSubmission() {
  try {
    console.log('Creating test BCR submission...');
    
    // First, create a test user if needed for submittedById reference
    let userId;
    try {
      const User = mongoose.model('User');
      const testUser = await User.findOne({ email: 'test.user@example.com' });
      if (testUser) {
        userId = testUser._id;
        console.log('Using existing test user:', userId);
      } else {
        const newUser = new User({
          name: 'Test User',
          email: 'test.user@example.com',
          role: 'user',
          password: 'password123' // This would normally be hashed
        });
        const savedUser = await newUser.save();
        userId = savedUser._id;
        console.log('Created new test user:', userId);
      }
    } catch (error) {
      console.error('Error finding/creating test user:', error);
      // Create a dummy ObjectId if user creation fails
      userId = new mongoose.Types.ObjectId();
      console.log('Using dummy user ID:', userId);
    }

    // Create test submission data with all required fields
    const testSubmission = new Submission({
      submissionCode: generateSubmissionCode(),
      fullName: 'Test User',
      emailAddress: 'test.user@example.com',
      submissionSource: 'Internal', // Using one of our new options
      organisation: 'Ashtown Digital',
      briefDescription: 'This is a test BCR submission to verify form functionality',
      justification: 'Testing the BCR submission process to ensure all fields are working correctly, including the new urgency levels and submission source options.',
      urgencyLevel: 'Medium', // Using one of our urgency levels
      impactAreas: ['Backend', 'Frontend'], // Using some of our impact areas
      status: 'Draft',
      submittedAt: new Date(),
      recordNumber: Math.floor(Math.random() * 10000) + 1,
      // Adding the required fields that were missing
      attachments: 'No attachments for test submission',
      declaration: true,
      submittedById: userId
    });
    
    // Save the submission to the database
    const savedSubmission = await testSubmission.save();
    console.log('Successfully created test BCR submission:');
    console.log(JSON.stringify(savedSubmission, null, 2));
    
    console.log('Test submission created with ID:', savedSubmission._id);
    console.log('Submission code:', savedSubmission.submissionCode);
    
  } catch (error) {
    console.error('Error creating test submission:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
createTestSubmission();
