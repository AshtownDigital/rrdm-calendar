/**
 * Script to debug urgency levels in the database
 */
require('dotenv').config();
const mongoose = require('mongoose');
const BcrConfig = require('../models/BcrConfig');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Function to debug urgency levels
async function debugUrgencyLevels() {
  try {
    console.log('Debugging urgency levels...');
    
    // Get all urgency levels
    const urgencyLevels = await BcrConfig.find({ type: 'urgencyLevel' });
    console.log(`Found ${urgencyLevels.length} urgency levels`);
    
    // Print detailed information about each urgency level
    urgencyLevels.forEach((level, index) => {
      console.log(`\nUrgency Level ${index + 1}:`);
      console.log(`  ID: ${level._id}`);
      console.log(`  Name: ${level.name}`);
      console.log(`  Value: ${level.value}`);
      console.log(`  Display Order: ${level.displayOrder}`);
      console.log(`  Is Active: ${level.isActive}`);
      console.log(`  Metadata: ${JSON.stringify(level.metadata || {})}`);
      console.log(`  Created At: ${level.createdAt}`);
      console.log(`  Updated At: ${level.updatedAt}`);
      
      // Check if the name is undefined or null
      if (!level.name) {
        console.log('  WARNING: Name is undefined or null!');
      }
    });
    
  } catch (error) {
    console.error('Error debugging urgency levels:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the function
debugUrgencyLevels();
