/**
 * Status model for MongoDB
 * Represents a workflow status in the BCR process
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StatusSchema = new Schema({
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
  color: {
    type: String,
    default: 'blue'
  },
  phaseId: {
    type: Schema.Types.ObjectId,
    ref: 'Phase'
  },
  trelloStatusId: {
    type: String
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
StatusSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Use a safer approach to prevent model compilation errors
let Status;
try {
  // Try to get the existing model
  Status = mongoose.model('Status');
} catch (error) {
  // If the model doesn't exist, create it
  Status = mongoose.model('Status', StatusSchema);
}

module.exports = Status;
