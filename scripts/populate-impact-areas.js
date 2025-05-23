/**
 * Script to populate the BCR Impact Areas in the database
 * This script creates the necessary impact areas in the BcrConfig collection
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Connect to MongoDB
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Define standard impact areas
const impactAreas = [
  {
    name: 'Funding',
    order: 10,
    description: 'Impact on funding arrangements'
  },
  {
    name: 'Policy',
    order: 20,
    description: 'Impact on policies and regulations'
  },
  {
    name: 'Processes',
    order: 30,
    description: 'Impact on business processes'
  },
  {
    name: 'Systems',
    order: 40,
    description: 'Impact on IT systems'
  },
  {
    name: 'Reporting',
    order: 50,
    description: 'Impact on reporting requirements'
  },
  {
    name: 'Users',
    order: 60,
    description: 'Impact on end users'
  },
  {
    name: 'Training',
    order: 70,
    description: 'Impact on training requirements'
  },
  {
    name: 'Other',
    order: 80,
    description: 'Other impact areas not listed above'
  }
];

/**
 * Create an impact area in the database
 * @param {Object} impactArea - Impact area data
 * @returns {Promise<Object>} - Created impact area
 */
async function createImpactArea(impactArea) {
  const now = new Date();
  
  // Create the impact area entry in the BcrConfig collection
  const BcrConfig = mongoose.model('BcrConfig');
  
  const createdImpactArea = await BcrConfig.create({
    type: 'impactArea',
    value: impactArea.name.toLowerCase().replace(/\s+/g, '_'),
    displayName: impactArea.name,
    displayOrder: impactArea.order,
    description: impactArea.description,
    createdAt: now,
    updatedAt: now
  });
  
  return createdImpactArea;
}

/**
 * Populate the database with impact areas using the BcrConfig collection
 */
async function populateImpactAreas() {
  try {
    await connectToMongoDB();
    
    console.log('Starting to populate impact areas...');
    
    // Define the BcrConfig schema if it doesn't exist
    if (!mongoose.models.BcrConfig) {
      const bcrConfigSchema = new mongoose.Schema({
        type: { type: String, required: true },
        value: { type: String, required: true },
        displayName: { type: String },
        displayOrder: { type: Number, default: 0 },
        description: { type: String },
        deleted: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      });
      mongoose.model('BcrConfig', bcrConfigSchema);
    }
    
    const BcrConfig = mongoose.model('BcrConfig');
    
    // First, clear existing impact areas
    console.log('Clearing existing impact areas...');
    await BcrConfig.deleteMany({ type: 'impactArea' });
    
    // Create impact areas
    console.log('Creating impact areas...');
    for (const impactArea of impactAreas) {
      await createImpactArea(impactArea);
    }
    
    console.log('Impact areas populated successfully!');
  } catch (error) {
    console.error('Error populating impact areas:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
populateImpactAreas().then(() => {
  console.log('Script execution completed');
}).catch(err => {
  console.error('Script execution failed:', err);
});
