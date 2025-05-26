/**
 * Script to fix impact area names in the database
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

// Impact area names mapping
const impactAreaNames = {
  'Backend': 'Changes to databases, schema design, internal data handling, or system logic.',
  'Frontend': 'Updates to UI components, form elements, filters, labels, or layout.',
  'API': 'Creation, modification, or removal of API endpoints or request/response formats.',
  'CSV': 'Changes to data import/export templates, field order, column definitions.',
  'Reference Data': 'Additions, updates, or removals of reference data values (e.g., dropdown options).',
  'Documentation & Guidance': 'Updates to internal guidance, user manuals, technical specs, or public-facing help.',
  'Policy': 'Changes required due to external policy or legal/regulatory compliance updates.',
  'Funding': 'Modifications impacting funding calculations, eligibility, or reporting models.'
};

// Function to fix impact area names
async function fixImpactAreaNames() {
  try {
    console.log('Fixing impact area names...');
    
    // Get all impact areas
    const impactAreas = await BcrConfig.find({ type: 'impactArea' });
    console.log(`Found ${impactAreas.length} impact areas to fix`);
    
    // Update each impact area
    for (const area of impactAreas) {
      // Find the name based on the description
      const description = area.value;
      let name = null;
      
      for (const [key, value] of Object.entries(impactAreaNames)) {
        if (value === description) {
          name = key;
          break;
        }
      }
      
      if (name) {
        console.log(`Updating area with description "${description.substring(0, 30)}..." to name "${name}"`);
        area.name = name;
        await area.save();
        console.log(`  - Updated successfully`);
      } else {
        console.log(`Could not find a name for area with description: ${description}`);
      }
    }
    
    console.log('All impact area names fixed successfully');
  } catch (error) {
    console.error('Error fixing impact area names:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
fixImpactAreaNames();
