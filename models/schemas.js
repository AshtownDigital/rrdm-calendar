/**
 * Core Schema Registry
 * Ensures all schemas are defined and registered in proper order
 * Use this module to import all schemas at once
 */
const mongoose = require('mongoose');

// Schema definitions (not models)
// Define schemas before registering models to avoid circular dependencies

// ImpactArea Schema
const ImpactAreaSchema = new mongoose.Schema({
  recordNumber: {
    type: Number,
    default: null
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Keep updatedAt fresh
ImpactAreaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-increment recordNumber
ImpactAreaSchema.pre('save', async function(next) {
  if (this.isNew && !this.recordNumber) {
    try {
      const last = await this.constructor.findOne({}, {}, { sort: { recordNumber: -1 } });
      this.recordNumber = last ? last.recordNumber + 1 : 1;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// ReferenceDataArea Schema
const ReferenceDataAreaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Attachment Schema
const AttachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalname: String,
  mimetype: String,
  size: Number,
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

// RelatedDocument Schema
const RelatedDocumentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  description: String,
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// Export schema definitions
module.exports = {
  schemas: {
    ImpactAreaSchema,
    ReferenceDataAreaSchema,
    AttachmentSchema,
    RelatedDocumentSchema
  },
  
  // Force registration of all models
  registerAll: function() {
    // Register models in proper order
    try {
      mongoose.model('ImpactArea', ImpactAreaSchema);
      console.log('Registered ImpactArea model from schema registry');
    } catch (e) {
      if (e.name === 'OverwriteModelError') {
        console.log('ImpactArea model already registered');
      } else {
        console.error('Failed to register ImpactArea model:', e);
      }
    }
    
    try {
      mongoose.model('ReferenceDataArea', ReferenceDataAreaSchema);
      console.log('Registered ReferenceDataArea model from schema registry');
    } catch (e) {
      if (e.name === 'OverwriteModelError') {
        console.log('ReferenceDataArea model already registered');
      } else {
        console.error('Failed to register ReferenceDataArea model:', e);
      }
    }
    
    try {
      mongoose.model('Attachment', AttachmentSchema);
      console.log('Registered Attachment model from schema registry');
    } catch (e) {
      if (e.name === 'OverwriteModelError') {
        console.log('Attachment model already registered');
      } else {
        console.error('Failed to register Attachment model:', e);
      }
    }
    
    try {
      mongoose.model('RelatedDocument', RelatedDocumentSchema);
      console.log('Registered RelatedDocument model from schema registry');
    } catch (e) {
      if (e.name === 'OverwriteModelError') {
        console.log('RelatedDocument model already registered');
      } else {
        console.error('Failed to register RelatedDocument model:', e);
      }
    }
    
    // Return the registered models
    return {
      ImpactArea: mongoose.model('ImpactArea'),
      ReferenceDataArea: mongoose.model('ReferenceDataArea'),
      Attachment: mongoose.model('Attachment'),
      RelatedDocument: mongoose.model('RelatedDocument')
    };
  }
};
