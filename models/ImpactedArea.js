/**
 * ImpactedArea model for MongoDB
 * Based on the Prisma ImpactedArea model
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImpactedAreaSchema = new Schema({
  recordNumber: {
    type: Number,
    required: true
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
ImpactedAreaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-increment recordNumber
ImpactedAreaSchema.pre('save', async function(next) {
  if (this.isNew && !this.recordNumber) {
    try {
      const lastRecord = await this.constructor.findOne({}, {}, { sort: { 'recordNumber': -1 } });
      this.recordNumber = lastRecord ? lastRecord.recordNumber + 1 : 1;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const ImpactedArea = mongoose.model('ImpactedArea', ImpactedAreaSchema);

module.exports = ImpactedArea;
