/**
 * Script to fix urgency level names in the database
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

// Urgency level definitions with names, descriptions, and colors
const urgencyLevelDefinitions = [
  {
    name: 'Critical',
    value: 'Immediate action required. Significant business impact if not addressed within 1-2 days.',
    color: 'red',
    displayOrder: 1
  },
  {
    name: 'High',
    value: 'Urgent action required. Needs to be addressed within 1 week.',
    color: 'orange',
    displayOrder: 2
  },
  {
    name: 'Medium',
    value: 'Important but not urgent. Should be addressed within 2-4 weeks.',
    color: 'yellow',
    displayOrder: 3
  },
  {
    name: 'Low',
    value: 'Desirable change but not time-sensitive. Can be scheduled within 1-3 months.',
    color: 'green',
    displayOrder: 4
  },
  {
    name: 'Planning',
    value: 'For future planning purposes. No immediate action required.',
    color: 'blue',
    displayOrder: 5
  }
];

// Function to fix urgency levels
async function fixUrgencyLevels() {
  try {
    console.log('Fixing urgency levels...');
    
    // Get all urgency levels
    const urgencyLevels = await BcrConfig.find({ type: 'urgencyLevel' });
    console.log(`Found ${urgencyLevels.length} urgency levels to fix`);
    
    // Delete existing urgency levels to avoid duplicates
    if (urgencyLevels.length > 0) {
      console.log('Deleting existing urgency levels...');
      await BcrConfig.deleteMany({ type: 'urgencyLevel' });
      console.log('Existing urgency levels deleted');
    }
    
    // Create new urgency levels with proper names and values
    console.log('Creating new urgency levels with proper names and values...');
    const newUrgencyLevels = urgencyLevelDefinitions.map(level => ({
      type: 'urgencyLevel',
      name: level.name,
      value: level.value,
      displayOrder: level.displayOrder,
      isActive: true,
      metadata: { color: level.color }
    }));
    
    // Insert the new urgency levels
    const result = await BcrConfig.insertMany(newUrgencyLevels);
    console.log(`Successfully added ${result.length} urgency levels:`);
    result.forEach(level => console.log(`- ${level.name}: ${level.value}`));
    
    console.log('All urgency levels fixed successfully');
  } catch (error) {
    console.error('Error fixing urgency levels:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
fixUrgencyLevels();
