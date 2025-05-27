/**
 * Script to replace impact areas in the database with new ones
 * Run with: node scripts/replace-impact-areas-mongodb.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define the BcrConfig schema
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

// Create the model
const BcrConfig = mongoose.models.BcrConfig || mongoose.model('BcrConfig', bcrConfigSchema);

async function replaceImpactAreas() {
  try {
    console.log('Replacing impact areas in the database...');
    
    // Define the new impact areas
    const newImpactAreas = [
      { name: 'Backend', description: 'Changes to databases, schema design, internal data handling, or system logic.', order: 10 },
      { name: 'Frontend', description: 'Updates to UI components, form elements, filters, labels, or layout.', order: 20 },
      { name: 'API', description: 'Creation, modification, or removal of API endpoints or request/response formats.', order: 30 },
      { name: 'CSV', description: 'Changes to data import/export templates, field order, column definitions.', order: 40 },
      { name: 'Reference Data', description: 'Additions, updates, or removals of reference data values (e.g., dropdown options).', order: 50 },
      { name: 'Documentation & Guidance', description: 'Updates to internal guidance, user manuals, technical specs, or public-facing help.', order: 60 },
      { name: 'Policy', description: 'Changes required due to external policy or legal/regulatory compliance updates.', order: 70 },
      { name: 'Funding', description: 'Modifications impacting funding calculations, eligibility, or reporting models.', order: 80 },
      { name: 'Other', description: 'Other', order: 90 }
    ];
    
    // Delete existing impact areas (soft delete by marking as deleted)
    console.log('Soft deleting existing impact areas...');
    await BcrConfig.updateMany(
      { type: 'impactArea' },
      { deleted: true }
    );
    
    // Create the new impact areas
    console.log('Creating new impact areas...');
    for (const area of newImpactAreas) {
      // Convert spaces to lowercase and dashes for the value
      const value = area.name.toLowerCase().replace(/\s+&\s+/g, '-and-').replace(/\s+/g, '-');
      
      await BcrConfig.create({
        type: 'impactArea',
        value: value,
        displayName: area.name,
        displayOrder: area.order,
        description: area.description,
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Created impact area: ${area.name}`);
    }
    
    console.log('Impact areas replaced successfully!');
    
    // Display the new impact areas
    const impactAreas = await BcrConfig.find({ type: 'impactArea', deleted: false }).sort({ displayOrder: 1 });
    console.log('\nNew Impact Areas:');
    impactAreas.forEach(area => {
      console.log(`- ${area.displayName}: ${area.description} (Order: ${area.displayOrder})`);
    });
    
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error replacing impact areas:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
replaceImpactAreas();
