/**
 * Phase model for MongoDB
 * Represents a workflow phase in the BCR process
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PhaseSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  displayOrder: {
    type: Number,
    required: true,
    default: 0
  },
  inProgressStatusId: {
    type: Schema.Types.ObjectId,
    ref: 'Status'
  },
  completedStatusId: {
    type: Schema.Types.ObjectId,
    ref: 'Status'
  },
  trelloStatusId: {
    type: String
  },
  color: {
    type: String,
    default: 'blue'
  },
  deleted: {
    type: Boolean,
    default: false
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
PhaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Use a safer approach to prevent model compilation errors
let Phase;
try {
  // Try to get the existing model
  Phase = mongoose.model('Phase');
} catch (error) {
  // If the model doesn't exist, create it
  Phase = mongoose.model('Phase', PhaseSchema);
}

module.exports = Phase;
