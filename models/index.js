/**
 * Models index file
 * Exports all MongoDB models for RRDM application
 */
const mongoose = require('mongoose');

// Function to register models
function registerModels() {
  // Only register if not already registered
  if (!mongoose.models.User) {
    require('./User');
  }
  if (!mongoose.models.Bcr) {
    require('./Bcr');
  }
  if (!mongoose.models.BcrConfig) {
    require('./BcrConfig');
  }
  if (!mongoose.models.Submission) {
    require('./Submission');
  }
  if (!mongoose.models.Status) {
    require('./Status');
  }
  if (!mongoose.models.BcrWorkflowActivity) {
    require('./BcrWorkflowActivity');
  }
  if (!mongoose.models.WorkflowPhase) {
    require('./WorkflowPhase');
  }
  if (!mongoose.models.ImpactedArea) {
    require('./ImpactedArea');
  }
  if (!mongoose.models.ImpactArea) {
    require('./ImpactArea');
  }
  if (!mongoose.models.ReferenceDataArea) {
    require('./ReferenceDataArea');
  }
  if (!mongoose.models.Funding) {
    require('./Funding');
  }
  if (!mongoose.models.ReferenceData) {
    require('./ReferenceData');
  }
  if (!mongoose.models.AuditLog) {
    require('./AuditLog');
  }
  if (!mongoose.models.UrgencyLevel) {
    require('./UrgencyLevel');
  }
  if (!mongoose.models.AcademicYear) {
    require('./academicYear');
  }
}

// Register models immediately
registerModels();

// Export models
module.exports = mongoose.models;
