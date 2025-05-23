/**
 * BcrWorkflowActivity model for MongoDB
 * Based on the Prisma BcrWorkflowActivity model
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BcrWorkflowActivitySchema = new Schema({
  bcrId: {
    type: Schema.Types.ObjectId,
    ref: 'Bcr',
    required: true
  },
  phase: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  performedById: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
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

// Update the updatedAt field on save
BcrWorkflowActivitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const BcrWorkflowActivity = mongoose.model('BcrWorkflowActivity', BcrWorkflowActivitySchema);

module.exports = BcrWorkflowActivity;
