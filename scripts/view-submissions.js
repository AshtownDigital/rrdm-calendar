/**
 * Script to view all submissions in the database
 * This will display the submissions with their new code format
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

// Function to view submissions
async function viewSubmissions() {
  try {
    console.log('Retrieving submissions from database...');
    
    // Get all submissions
    const submissions = await Submission.find().sort({ createdAt: -1 });
    
    console.log(`\nFound ${submissions.length} submissions:\n`);
    
    // Display submissions in a table format
    console.log('='.repeat(120));
    console.log('| SUBMISSION CODE      | STATUS            | SUBMITTER           | SOURCE    | URGENCY  | DESCRIPTION                      |');
    console.log('='.repeat(120));
    
    submissions.forEach(submission => {
      const code = submission.submissionCode.padEnd(20, ' ');
      const status = (submission.status || 'Pending').padEnd(18, ' ');
      const submitter = (submission.fullName || 'Unknown').substring(0, 19).padEnd(20, ' ');
      const source = (submission.submissionSource || 'Unknown').padEnd(10, ' ');
      const urgency = (submission.urgencyLevel || 'N/A').padEnd(9, ' ');
      const desc = (submission.briefDescription || 'No description').substring(0, 30).padEnd(32, ' ');
      
      console.log(`| ${code}| ${status}| ${submitter}| ${source}| ${urgency}| ${desc}|`);
    });
    
    console.log('='.repeat(120));
    
    // Display submission details
    console.log('\nSubmission Details:');
    submissions.forEach((submission, index) => {
      console.log(`\n${index + 1}. ${submission.submissionCode} (${submission.status || 'Pending'})`);
      console.log(`   Submitter: ${submission.fullName} (${submission.submissionSource})`);
      console.log(`   Organization: ${submission.organisation || 'Not specified'}`);
      console.log(`   Description: ${submission.briefDescription}`);
      console.log(`   Urgency: ${submission.urgencyLevel}`);
      console.log(`   Impact Areas: ${submission.impactAreas ? submission.impactAreas.join(', ') : 'None'}`);
      console.log(`   Created: ${submission.createdAt}`);
      console.log(`   Updated: ${submission.updatedAt}`);
      if (submission.reviewedAt) {
        console.log(`   Reviewed: ${submission.reviewedAt}`);
        console.log(`   Review Comments: ${submission.reviewComments || 'None'}`);
      }
      if (submission.bcrId) {
        console.log(`   BCR ID: ${submission.bcrId}`);
      }
    });
    
  } catch (error) {
    console.error('Error viewing submissions:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the function
viewSubmissions();
