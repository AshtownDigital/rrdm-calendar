/**
 * Script to add predefined impact areas to the database
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

// Impact areas to add
const impactAreas = [
  {
    type: 'impactArea',
    name: 'Backend',
    value: 'Changes to databases, schema design, internal data handling, or system logic.',
    displayOrder: 1
  },
  {
    type: 'impactArea',
    name: 'Frontend',
    value: 'Updates to UI components, form elements, filters, labels, or layout.',
    displayOrder: 2
  },
  {
    type: 'impactArea',
    name: 'API',
    value: 'Creation, modification, or removal of API endpoints or request/response formats.',
    displayOrder: 3
  },
  {
    type: 'impactArea',
    name: 'CSV',
    value: 'Changes to data import/export templates, field order, column definitions.',
    displayOrder: 4
  },
  {
    type: 'impactArea',
    name: 'Reference Data',
    value: 'Additions, updates, or removals of reference data values (e.g., dropdown options).',
    displayOrder: 5
  },
  {
    type: 'impactArea',
    name: 'Documentation & Guidance',
    value: 'Updates to internal guidance, user manuals, technical specs, or public-facing help.',
    displayOrder: 6
  },
  {
    type: 'impactArea',
    name: 'Policy',
    value: 'Changes required due to external policy or legal/regulatory compliance updates.',
    displayOrder: 7
  },
  {
    type: 'impactArea',
    name: 'Funding',
    value: 'Modifications impacting funding calculations, eligibility, or reporting models.',
    displayOrder: 8
  }
];

// Function to add impact areas
async function addImpactAreas() {
  try {
    console.log('Adding impact areas...');
    
    // First, check if any of these impact areas already exist
    const existingAreas = await BcrConfig.find({ 
      type: 'impactArea',
      name: { $in: impactAreas.map(area => area.name) }
    });
    
    const existingAreaNames = existingAreas.map(area => area.name);
    console.log('Existing impact areas:', existingAreaNames);
    
    // Filter out existing areas
    const newAreas = impactAreas.filter(area => !existingAreaNames.includes(area.name));
    
    if (newAreas.length === 0) {
      console.log('All impact areas already exist. No new areas added.');
      return;
    }
    
    // Insert new areas
    const result = await BcrConfig.insertMany(newAreas);
    console.log(`Successfully added ${result.length} new impact areas:`);
    result.forEach(area => console.log(`- ${area.name}: ${area.value}`));
  } catch (error) {
    console.error('Error adding impact areas:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
addImpactAreas();
