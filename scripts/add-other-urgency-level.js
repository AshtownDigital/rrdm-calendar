/**
 * Script to add an "Other" option to the urgency levels
 */
require('dotenv').config();
const mongoose = require('mongoose');
const UrgencyLevel = require('../models/UrgencyLevel');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Function to add the "Other" urgency level
async function addOtherUrgencyLevel() {
  try {
    console.log('Adding "Other" urgency level...');
    
    // Check if "Other" urgency level already exists
    const existingOther = await UrgencyLevel.findOne({ name: 'Other' });
    
    if (existingOther) {
      console.log('"Other" urgency level already exists');
      return;
    }
    
    // Get the highest display order
    const highestOrder = await UrgencyLevel.findOne().sort('-displayOrder');
    const nextOrder = highestOrder ? highestOrder.displayOrder + 1 : 6;
    
    // Create the "Other" urgency level
    const otherUrgencyLevel = new UrgencyLevel({
      name: 'Other',
      description: 'Specify a custom urgency level not covered by the standard options.',
      color: 'purple',
      displayOrder: nextOrder,
      isActive: true
    });
    
    await otherUrgencyLevel.save();
    console.log('Successfully added "Other" urgency level');
    
  } catch (error) {
    console.error('Error adding "Other" urgency level:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
addOtherUrgencyLevel();
