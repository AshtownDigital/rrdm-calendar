/**
 * WorkflowPhase model for MongoDB
 * Based on the Prisma WorkflowPhase model
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WorkflowPhaseSchema = new Schema({
  order: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  currentStatus: {
    type: String,
    required: true
  },
  completedStatus: {
    type: String,
    required: true
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
WorkflowPhaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const WorkflowPhase = mongoose.model('WorkflowPhase', WorkflowPhaseSchema);

module.exports = WorkflowPhase;
