/**
 * BCR Controllers Index
 * Exports all BCR controllers
 * Updated to match route definitions in docs/bcr/ROUTE_DEFINITIONS.md
 */

// Import existing controllers
const submissionsController = require('./submissionsController');

// Import new controllers
const bcrController = require('./bcrController');
const impactedAreasController = require('./impactedAreasController');
const authController = require('./authController');
const dashboardController = require('./dashboardController');
const workflowController = require('./workflowController');

module.exports = {
  submissionsController,
  bcrController,
  impactedAreasController,
  authController,
  dashboardController,
  workflowController
};
