/**
 * Script to add predefined urgency levels to the database
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

// Urgency levels to add
const urgencyLevels = [
  {
    type: 'urgencyLevel',
    name: 'Critical',
    value: 'Immediate action required. Significant business impact if not addressed within 1-2 days.',
    displayOrder: 1,
    isActive: true
  },
  {
    type: 'urgencyLevel',
    name: 'High',
    value: 'Urgent action required. Needs to be addressed within 1 week.',
    displayOrder: 2,
    isActive: true
  },
  {
    type: 'urgencyLevel',
    name: 'Medium',
    value: 'Important but not urgent. Should be addressed within 2-4 weeks.',
    displayOrder: 3,
    isActive: true
  },
  {
    type: 'urgencyLevel',
    name: 'Low',
    value: 'Desirable change but not time-sensitive. Can be scheduled within 1-3 months.',
    displayOrder: 4,
    isActive: true
  },
  {
    type: 'urgencyLevel',
    name: 'Planning',
    value: 'For future planning purposes. No immediate action required.',
    displayOrder: 5,
    isActive: true
  }
];

// Function to add urgency levels
async function addUrgencyLevels() {
  try {
    console.log('Adding urgency levels...');
    
    // First, check if any of these urgency levels already exist
    const existingLevels = await BcrConfig.find({ 
      type: 'urgencyLevel',
      name: { $in: urgencyLevels.map(level => level.name) }
    });
    
    const existingLevelNames = existingLevels.map(level => level.name);
    console.log('Existing urgency levels:', existingLevelNames);
    
    // Filter out existing levels
    const newLevels = urgencyLevels.filter(level => !existingLevelNames.includes(level.name));
    
    if (newLevels.length === 0) {
      console.log('All urgency levels already exist. No new levels added.');
      return;
    }
    
    // Insert new levels
    const result = await BcrConfig.insertMany(newLevels);
    console.log(`Successfully added ${result.length} new urgency levels:`);
    result.forEach(level => console.log(`- ${level.name}: ${level.value}`));
  } catch (error) {
    console.error('Error adding urgency levels:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
addUrgencyLevels();
