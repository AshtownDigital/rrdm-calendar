/**
 * Script to update impact areas in the database
 * - Adds isActive field set to true for all impact areas
 * - Ensures name field is properly set
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

// Function to update impact areas
async function updateImpactAreas() {
  try {
    console.log('Updating impact areas...');
    
    // Get all impact areas
    const impactAreas = await BcrConfig.find({ type: 'impactArea' });
    console.log(`Found ${impactAreas.length} impact areas to update`);
    
    // Update each impact area
    for (const area of impactAreas) {
      console.log(`Updating area: ${area.name}`);
      
      // Add isActive field set to true
      area.isActive = true;
      
      // Make sure the name is properly set
      if (!area.name) {
        console.log(`  - Area has no name, setting from value: ${area.value}`);
        area.name = area.value;
      }
      
      // Save the updated area
      await area.save();
      console.log(`  - Updated successfully`);
    }
    
    console.log('All impact areas updated successfully');
  } catch (error) {
    console.error('Error updating impact areas:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
updateImpactAreas();
