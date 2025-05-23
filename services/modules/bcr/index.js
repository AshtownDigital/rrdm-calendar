/**
 * BCR Module Services
 * Consolidated export of all BCR-related services
 */

// Import services
const counterService = require('./counterService');
const workflowService = require('./workflowService');

// Re-export services with clear naming
module.exports = {
  // Counter service for dashboard metrics
  counter: counterService,
  
  // Workflow service for phase/status management
  workflow: workflowService
};
