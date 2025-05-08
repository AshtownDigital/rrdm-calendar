/**
 * BCR Controllers Index
 * Exports all BCR controllers
 */

const indexController = require('./indexController');
const submissionsController = require('./submissionsController');
const formController = require('./formController');
const statusController = require('./statusController');
const workflowController = require('./workflowController');

module.exports = {
  indexController,
  submissionsController,
  formController,
  statusController,
  workflowController
};
