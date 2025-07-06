/**
 * BCR Module Routes (Modularized Version)
 * Routes for the BCR module using modularized controllers
 */

const express = require('express');
const router = express.Router();

// Import controllers
const dashboardController = require('../../../controllers/modules/bcr/modular/dashboardController');
const submissionController = require('../../../controllers/modules/bcr/modular/submissionController');
const viewController = require('../../../controllers/modules/bcr/modular/viewController');
const workflowController = require('../../../controllers/modules/bcr/modular/workflowController');

// Import middleware
const { checkDbConnection, withTimeout } = require('../../../middleware/dbConnectionCheck');
const { ensureAuthenticated } = require('../../../middleware/auth');

// Apply global middleware for all BCR routes
router.use(checkDbConnection);
router.use(withTimeout(5000)); // 5 second timeout for database operations

// Dashboard routes
router.get('/', dashboardController.dashboard);
router.get('/dashboard', dashboardController.dashboard);
router.get('/statistics', dashboardController.statistics);

// Workflow routes
router.get('/workflow', workflowController.showWorkflow);
router.get('/workflow-progress/:id', workflowController.viewWorkflowProgress);
router.post('/workflow-progress/:id', ensureAuthenticated, workflowController.updateWorkflowStatus);

// Submission routes


router.get('/submissions', submissionController.listSubmissions);
router.get('/submissions/:id', submissionController.viewSubmission);
router.get('/submissions/:id/edit', ensureAuthenticated, submissionController.editSubmissionForm);
router.post('/submissions/:id/edit', ensureAuthenticated, submissionController.updateSubmission);

// BCR routes
router.get('/bcrs', viewController.listApprovedBcrs);
router.get('/bcrs/:id', viewController.viewBcr);

// Business Change Request routes
router.get('/business-change-requests', viewController.listApprovedBcrs);
router.get('/business-change-requests/:bcrId', viewController.viewBcr);
router.get('/business-change-requests/:id/workflow-progress', workflowController.viewWorkflowProgress);

module.exports = router;
