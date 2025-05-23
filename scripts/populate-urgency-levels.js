/**
 * Script to populate the BCR Urgency Levels in the database
 * This script creates the necessary urgency levels in the BcrConfig collection
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

// Define standard urgency levels
const urgencyLevels = [
  {
    name: 'Low',
    order: 10,
    description: 'Low urgency - can be addressed in normal course of business'
  },
  {
    name: 'Medium',
    order: 20,
    description: 'Medium urgency - should be addressed within standard timeframes'
  },
  {
    name: 'High',
    order: 30,
    description: 'High urgency - requires expedited handling'
  },
  {
    name: 'Critical',
    order: 40,
    description: 'Critical urgency - requires immediate attention'
  }
];

/**
 * Create a urgency level in the database
 * @param {Object} urgencyLevel - Urgency level data
 * @returns {Promise<Object>} - Created urgency level
 */
async function createUrgencyLevel(urgencyLevel) {
  const now = new Date();
  
  // Create the urgency level entry in the BcrConfig collection
  const BcrConfig = mongoose.model('BcrConfig');
  
  const createdUrgencyLevel = await BcrConfig.create({
    type: 'urgencyLevel',
    value: urgencyLevel.name.toLowerCase().replace(/\s+/g, '_'),
    displayName: urgencyLevel.name,
    displayOrder: urgencyLevel.order,
    description: urgencyLevel.description,
    createdAt: now,
    updatedAt: now
  });
  
  return createdUrgencyLevel;
}

/**
 * Populate the database with urgency levels using the BcrConfig collection
 */
async function populateUrgencyLevels() {
  try {
    await connectToMongoDB();
    
    console.log('Starting to populate urgency levels...');
    
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
    
    // First, clear existing urgency levels
    console.log('Clearing existing urgency levels...');
    await BcrConfig.deleteMany({ type: 'urgencyLevel' });
    
    // Create urgency levels
    console.log('Creating urgency levels...');
    for (const urgencyLevel of urgencyLevels) {
      await createUrgencyLevel(urgencyLevel);
    }
    
    console.log('Urgency levels populated successfully!');
  } catch (error) {
    console.error('Error populating urgency levels:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
populateUrgencyLevels().then(() => {
  console.log('Script execution completed');
}).catch(err => {
  console.error('Script execution failed:', err);
});
