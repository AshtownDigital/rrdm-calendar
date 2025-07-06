/**
 * RelatedDocument model – stores links or references to documents associated with a Submission
 */
const mongoose = require('mongoose');

// Use the central schema registry to ensure proper registration order
const schemaRegistry = require('./schemas');

// Either get existing model or register through the registry
let model;
try {
  // Try to get already registered model first
  model = mongoose.model('RelatedDocument');
} catch (e) {
  if (e.name === 'MissingSchemaError') {
    // If model not registered, force registration of all schemas
    const models = schemaRegistry.registerAll();
    model = models.RelatedDocument;
  } else {
    throw e;
  }
}

module.exports = model;
