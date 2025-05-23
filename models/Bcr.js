/**
 * BCR (Business Change Request) model for MongoDB
 * Based on the Prisma Bcr model
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BcrSchema = new Schema({
  recordNumber: {
    type: Number,
    required: true
  },
  bcrCode: {
    type: String,
    required: true,
    unique: true
  },
  submissionId: {
    type: Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },
  currentPhase: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  urgencyLevel: {
    type: String,
    required: true
  },
  impactedAreas: {
    type: [String],
    required: true
  },
  workflowHistory: {
    type: Schema.Types.Mixed,
    default: []
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
BcrSchema.index({ recordNumber: 1 });
BcrSchema.index({ status: 1 });
BcrSchema.index({ submissionId: 1 });

// Update the updatedAt field on save
BcrSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-increment recordNumber
BcrSchema.pre('save', async function(next) {
  if (this.isNew && !this.recordNumber) {
    try {
      const lastBcr = await this.constructor.findOne({}, {}, { sort: { 'recordNumber': -1 } });
      this.recordNumber = lastBcr ? lastBcr.recordNumber + 1 : 1;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const Bcr = mongoose.model('Bcr', BcrSchema);

module.exports = Bcr;
