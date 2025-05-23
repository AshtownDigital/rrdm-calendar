/**
 * BCR Configuration model for MongoDB
 */
const mongoose = require('mongoose');
const { Schema } = mongoose;

const BcrConfigSchema = new Schema({
  type: {
    type: String,
    required: true,
    // Expanded to include all possible types from the PostgreSQL database
    enum: ['impactArea', 'urgencyLevel', 'role', 'impactArea_description', 'phase', 'status', 'phase-status']
  },
  name: {
    type: String,
    required: true
  },
  value: {
    type: Schema.Types.Mixed
  },
  displayOrder: {
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

// Create a compound index on type and name for faster lookups
BcrConfigSchema.index({ type: 1, name: 1 });

// Update the updatedAt field on save
BcrConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const BcrConfig = mongoose.model('BcrConfig', BcrConfigSchema);

module.exports = BcrConfig;
