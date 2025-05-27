/**
 * Test script to directly create a submission in MongoDB
 * This helps identify issues with the Submission model
 */
const mongoose = require('mongoose');
const Submission = require('../models/Submission');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/rrdm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Create a test submission
async function createTestSubmission() {
  try {
    // Create a simple test submission
    const testSubmission = new Submission({
      fullName: 'Test User',
      emailAddress: 'test@example.com',
      submissionSource: 'Internal',
      briefDescription: 'Test submission created directly',
      justification: 'Testing the Submission model',
      urgencyLevel: 'Medium',
      impactAreas: ['Frontend', 'Backend'],
      attachments: 'No',
      declaration: true,
      // No submittedById to test if it's truly optional
    });

    // Save the submission
    const savedSubmission = await testSubmission.save();
    console.log('Test submission created successfully:');
    console.log(JSON.stringify(savedSubmission, null, 2));
  } catch (error) {
    console.error('Error creating test submission:');
    console.error(error.name + ':', error.message);
    console.error('Validation errors:', error.errors);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the test
createTestSubmission();
