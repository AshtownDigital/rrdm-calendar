/**
 * AuditLog model for MongoDB
 * Based on the Prisma AuditLog model
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditLogSchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resourceType: {
    type: String,
    required: true
  },
  resourceId: {
    type: String,
    required: true
  },
  details: {
    type: Map,
    of: Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  }
});

// Create indexes for efficient querying
AuditLogSchema.index({ timestamp: 1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = AuditLog;
