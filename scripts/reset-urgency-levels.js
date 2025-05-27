/**
 * Script to reset and recreate urgency levels in the database with a simpler approach
 */
require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define a simple schema for urgency levels
const UrgencyLevelSchema = new mongoose.Schema({
  name: String,
  description: String,
  color: String,
  displayOrder: Number,
  isActive: Boolean
});

// Create a model directly without using the existing BcrConfig
const UrgencyLevel = mongoose.model('UrgencyLevel', UrgencyLevelSchema);

// Urgency level definitions
const urgencyLevelData = [
  {
    name: 'Critical',
    description: 'Immediate action required. Significant business impact if not addressed within 1-2 days.',
    color: 'red',
    displayOrder: 1,
    isActive: true
  },
  {
    name: 'High',
    description: 'Urgent action required. Needs to be addressed within 1 week.',
    color: 'orange',
    displayOrder: 2,
    isActive: true
  },
  {
    name: 'Medium',
    description: 'Important but not urgent. Should be addressed within 2-4 weeks.',
    color: 'yellow',
    displayOrder: 3,
    isActive: true
  },
  {
    name: 'Low',
    description: 'Desirable change but not time-sensitive. Can be scheduled within 1-3 months.',
    color: 'green',
    displayOrder: 4,
    isActive: true
  },
  {
    name: 'Planning',
    description: 'For future planning purposes. No immediate action required.',
    color: 'blue',
    displayOrder: 5,
    isActive: true
  }
];

// Function to reset and recreate urgency levels
async function resetUrgencyLevels() {
  try {
    console.log('Resetting urgency levels...');
    
    // Drop the collection if it exists
    try {
      await mongoose.connection.db.dropCollection('urgencylevels');
      console.log('Dropped existing urgency levels collection');
    } catch (err) {
      console.log('No existing urgency levels collection to drop');
    }
    
    // Create new urgency levels
    const result = await UrgencyLevel.insertMany(urgencyLevelData);
    console.log(`Successfully created ${result.length} urgency levels:`);
    result.forEach(level => console.log(`- ${level.name}: ${level.description} (${level.color})`));
    
    console.log('All urgency levels reset successfully');
  } catch (error) {
    console.error('Error resetting urgency levels:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
resetUrgencyLevels();
