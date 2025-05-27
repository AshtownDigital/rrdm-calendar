/**
 * Urgency Level model for MongoDB
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UrgencyLevelSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
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
UrgencyLevelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const UrgencyLevel = mongoose.model('UrgencyLevel', UrgencyLevelSchema);

module.exports = UrgencyLevel;
