/**
 * Script to check if the Submission model is working correctly
 * and if we can retrieve submissions from the database
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

// Function to check submissions
async function checkSubmissions() {
  try {
    console.log('Checking submissions...');
    
    // Count total submissions
    const count = await Submission.countDocuments();
    console.log(`Total submissions in database: ${count}`);
    
    // Get all submissions
    const submissions = await Submission.find().sort({ createdAt: -1 });
    
    console.log('\nRecent submissions:');
    submissions.slice(0, 5).forEach(submission => {
      console.log(`- ${submission.submissionCode} (${submission.status}): ${submission.briefDescription.substring(0, 50)}...`);
      console.log(`  Submitted by: ${submission.fullName} (${submission.submissionSource})`);
      console.log(`  Created: ${submission.createdAt}`);
      console.log('');
    });
    
    // Check submissions by status
    const statusCounts = {};
    const statuses = ['Pending', 'Approved', 'Rejected', 'Paused', 'Closed', 'More Info Required'];
    
    for (const status of statuses) {
      const statusCount = await Submission.countDocuments({ status });
      statusCounts[status] = statusCount;
    }
    
    console.log('Submissions by status:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`- ${status}: ${count}`);
    }
    
  } catch (error) {
    console.error('Error checking submissions:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the function
checkSubmissions();
