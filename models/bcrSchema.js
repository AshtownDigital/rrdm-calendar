// Deprecated: BCR schema is now managed by Prisma. This file is no longer used.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const BcrSchema = new Schema({
  bcrNumber: { type: String, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  impact: { type: String },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  targetDate: { type: Date },
  implementationDate: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
BcrSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = BcrSchema;
