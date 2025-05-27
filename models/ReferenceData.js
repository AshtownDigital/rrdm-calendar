/**
 * ReferenceData model for MongoDB
 * Based on the Prisma ReferenceData model
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReferenceDataSchema = new Schema({
  name: {
    type: String,
    required: true,
    maxlength: 255
  },
  code: {
    type: String,
    required: true,
    unique: true,
    maxlength: 255
  },
  category: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  validFrom: {
    type: Date
  },
  validTo: {
    type: Date
  },
  createdById: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedById: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
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

// Create indexes for efficient querying
ReferenceDataSchema.index({ category: 1 });

// Update the updatedAt field on save
ReferenceDataSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Increment version on update
ReferenceDataSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.version += 1;
  }
  next();
});

const ReferenceData = mongoose.model('ReferenceData', ReferenceDataSchema);

module.exports = ReferenceData;
