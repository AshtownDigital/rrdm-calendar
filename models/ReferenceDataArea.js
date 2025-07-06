/**
 * ReferenceDataArea model – lightweight alias for legacy ReferenceData used by
 * the new Submissions relationships.
 * If a full ReferenceData schema already exists we simply re-export it under a
 * new model name so Mongoose populate() can resolve it.
 */
const mongoose = require('mongoose');

// Use the central schema registry to ensure proper registration order
const schemaRegistry = require('./schemas');

// Either get existing model or register through the registry
let model;
try {
  // Try to get already registered model first
  model = mongoose.model('ReferenceDataArea');
} catch (e) {
  if (e.name === 'MissingSchemaError') {
    // If model not registered, force registration of all schemas
    const models = schemaRegistry.registerAll();
    model = models.ReferenceDataArea;
  } else {
    throw e;
  }
}

module.exports = model;
