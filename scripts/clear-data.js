/**
 * Script to clear all submissions and BCRs from the database
 * Run with: node scripts/clear-data.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Submission = require('../models/Submission');
const Bcr = require('../models/Bcr');

async function clearData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm');
    console.log('Connected to MongoDB successfully');

    // Delete all BCRs first (to maintain referential integrity)
    console.log('Deleting all BCRs...');
    const bcrResult = await Bcr.deleteMany({});
    console.log(`Deleted ${bcrResult.deletedCount} BCRs`);

    // Delete all submissions
    console.log('Deleting all submissions...');
    const submissionResult = await Submission.deleteMany({});
    console.log(`Deleted ${submissionResult.deletedCount} submissions`);

    console.log('All data cleared successfully');
  } catch (error) {
    console.error('Error clearing data:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
clearData();
