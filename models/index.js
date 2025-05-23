/**
 * Models index file
 * Exports all MongoDB models for RRDM application
 */
const User = require('./User');
const Bcr = require('./Bcr');
const BcrConfig = require('./BcrConfig');
const Submission = require('./Submission');
const BcrWorkflowActivity = require('./BcrWorkflowActivity');
const WorkflowPhase = require('./WorkflowPhase');
const ImpactedArea = require('./ImpactedArea');
const Funding = require('./Funding');
const ReferenceData = require('./ReferenceData');
const AuditLog = require('./AuditLog');

module.exports = {
  User,
  Bcr,
  BcrConfig,
  Submission,
  BcrWorkflowActivity,
  WorkflowPhase,
  ImpactedArea,
  Funding,
  ReferenceData,
  AuditLog
};
