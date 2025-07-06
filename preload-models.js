/**
 * Model preloader for ensuring all schemas are registered
 * before any controller or route uses them
 */
const mongoose = require('mongoose');

// Import and use central schema registry for robust model registration
const schemaRegistry = require('./models/schemas');

// Register all models through the registry first
console.log('Preloading all models via schema registry...');
const registeredModels = schemaRegistry.registerAll();

// Additional safety - directly require model modules to ensure they're loaded 
function loadModel(path) {
  try {
    console.log(`Loading model from ${path}...`);
    const model = require(path);
    console.log(`Successfully loaded model from ${path}: ${model.modelName || 'Unknown'}`);
    return model;
  } catch (err) {
    console.error(`Error loading model from ${path}:`, err);
    return null;
  }
}

// Load core models needed for populations - even though registry has registered them
// this ensures the model files are executed and cached
loadModel('./models/ImpactArea');
loadModel('./models/ReferenceDataArea');
loadModel('./models/Attachment');
loadModel('./models/RelatedDocument');
loadModel('./models/Submission');

// Load other models via models/index.js
require('./models/index');

// Final verification
const allRegisteredModels = Object.keys(mongoose.models);
console.log('All registered Mongoose models:', allRegisteredModels);

if (mongoose.models.ImpactArea) {
  console.log('✅ ImpactArea model successfully registered!');
} else {
  console.error('❌ ImpactArea model NOT registered - will cause population errors!');
}

module.exports = {
  ensureAllModelsLoaded: () => {
    // Extra verification at runtime when requested
    console.log('All models preloaded successfully');
    console.log('Currently registered models:', Object.keys(mongoose.models));
    console.log('ImpactArea model registered?', !!mongoose.models.ImpactArea);
  }
};
