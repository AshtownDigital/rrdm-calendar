/**
 * Funding model for MongoDB
 * Based on the Prisma Fundings model
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FundingSchema = new Schema({
  trainingRoute: {
    type: String,
    required: true,
    maxlength: 255
  },
  academicYear: {
    type: String,
    required: true,
    maxlength: 255
  },
  fundingAmount: {
    type: Number,
    required: true
  },
  fundingType: {
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
  effectiveDate: {
    type: Date,
    required: true
  },
  expiryDate: {
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
  notes: {
    type: String
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

// Create compound index for trainingRoute and academicYear
FundingSchema.index({ trainingRoute: 1, academicYear: 1 });

// Update the updatedAt field on save
FundingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Funding = mongoose.model('Funding', FundingSchema);

module.exports = Funding;
