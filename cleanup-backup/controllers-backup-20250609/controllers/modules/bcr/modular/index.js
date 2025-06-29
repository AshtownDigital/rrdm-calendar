/**
 * BCR Module Controllers Index
 * Exports all BCR module controllers for easy importing
 */

const dashboardController = require('./dashboardController');
const submissionController = require('./submissionController');
const workflowController = require('./workflowController');
const bcrController = require('./bcrController');
const viewController = require('./viewController');

// Export all controllers
module.exports = {
  dashboardController,
  submissionController,
  workflowController,
  bcrController,
  viewController,
};
