/**
 * BCR Module Routes
 * Consolidated routes for all BCR management functionality
 */
const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../../../middleware/csrf');
// We need to load the controller for the monolithic router but don't use it directly here
const migrationRouter = require('../../../scripts/migration/controller-migration');
const modularRouter = require('./modular');

// Create a migration router that can switch between monolithic and modular controllers
const { createMigrationRouter } = migrationRouter;

// Define which routes have been migrated to modular controllers
const migratedRoutes = [
  { path: '/bcr/dashboard', method: 'GET' },
  { path: '/bcr/business-change-requests', method: 'GET' },
  { path: '/bcr/business-change-requests/:bcrId', method: 'GET' },
  { path: '/bcr/business-change-requests/:id/workflow-progress', method: 'GET' },
  { path: '/bcr/workflow', method: 'GET' },
  { path: '/bcr/workflow-progress/:id', method: 'GET' },
  { path: '/bcr/workflow-progress/:id', method: 'POST' },
  { path: '/bcr/statistics', method: 'GET' },
  { path: '/submissions/new', method: 'GET' },
  { path: '/submissions/new', method: 'POST' },
  { path: '/submissions', method: 'GET' },
  { path: '/submissions/:id', method: 'GET' },
  { path: '/submissions/:id/edit', method: 'GET' },
  { path: '/submissions/:id/edit', method: 'POST' },
  { path: '/bcrs', method: 'GET' },
  { path: '/bcrs/:id', method: 'GET' },
  { path: '/business-change-requests', method: 'GET' },
  { path: '/business-change-requests/:bcrId', method: 'GET' }
];

// Create a migration router that will use either the monolithic or modular controller
const bcrMigrationRouter = createMigrationRouter({
  monolithicRouter: router,
  modularRouter: modularRouter,
  migratedRoutes: migratedRoutes,
  enableModular: true // Set to true to use modular controllers for migrated routes
});

// Import controllers
const bcrController = require('../../../controllers/bcrController');
const reviewController = require('../../../controllers/reviewController');
const updateBcrController = require('../../../controllers/updateBcrController');
const releaseAssignmentController = require('../../../controllers/releaseAssignmentController');
const updateWorkflowController = require('../../../controllers/updateWorkflowController');

// Import workflow routes
const workflowRoutes = require('./workflow');

// Root route - redirect to dashboard
router.get('/', (req, res) => {
  res.redirect('/bcr/dashboard');
});

// === Dashboard Routes ===
router.get('/dashboard', bcrController.dashboard);

// === Workflow Management Routes ===
router.get('/workflow', bcrController.showWorkflow);

// Mount the workflow routes
router.use('/workflow', workflowRoutes);

// === Submission Routes (Pre-BCR) ===
router.get('/submit', bcrController.newSubmissionForm);
router.post('/submit', csrfProtection, bcrController.createSubmission);
router.get('/submissions', bcrController.listSubmissions);
router.get('/submissions/dashboard', bcrController.submissionDashboard); // Add specific route for submissions dashboard
router.get('/submissions/:submissionId', bcrController.viewSubmission);
router.get('/submissions/:submissionId/review', csrfProtection, reviewController.renderReviewForm);
router.post('/submissions/:submissionId/review', csrfProtection, reviewController.processReview);

// === Impact Areas Routes ===
// Main impact areas route to list all impact areas
router.get('/impact-areas', bcrController.listImpactAreas);
router.get('/impact-areas/list', bcrController.listImpactAreas);
router.get('/impact-areas/new', csrfProtection, bcrController.newImpactAreaForm);
router.post('/impact-areas/new', csrfProtection, bcrController.createImpactArea);
router.get('/impact-areas/:impactAreaId/edit', csrfProtection, bcrController.editImpactAreaForm);
router.post('/impact-areas/:impactAreaId/edit', csrfProtection, bcrController.updateImpactArea);
router.get('/impact-areas/:impactAreaId/delete', csrfProtection, bcrController.deleteImpactAreaConfirm);
router.post('/impact-areas/:impactAreaId/delete', csrfProtection, bcrController.deleteImpactArea);

// === Business Change Request Routes (Post-Approval) ===
// Most specific routes first
router.get('/business-change-requests/:bcrId/assign-release', csrfProtection, releaseAssignmentController.renderAssignReleaseForm);
router.post('/business-change-requests/:bcrId/assign-release', csrfProtection, releaseAssignmentController.processAssignRelease);

router.get('/business-change-requests/:bcrId/update-workflow', csrfProtection, updateWorkflowController.renderUpdateWorkflowForm);
router.post('/business-change-requests/:bcrId/update-workflow', csrfProtection, updateWorkflowController.processUpdateWorkflow);

router.get('/business-change-requests/:bcrId/update-status', csrfProtection, updateBcrController.renderUpdateForm);
router.post('/business-change-requests/:bcrId/update-status', csrfProtection, updateBcrController.processUpdate);

router.get('/business-change-requests/:bcrId/update', csrfProtection, updateBcrController.renderUpdateForm);
router.post('/business-change-requests/:bcrId/update', csrfProtection, updateBcrController.processUpdate);

router.get('/business-change-requests/:bcrId/review', csrfProtection, reviewController.renderReviewForm);
router.post('/business-change-requests/:bcrId/review', csrfProtection, reviewController.processReview);

// Main BCR list route
router.get('/business-change-requests', bcrController.listApprovedBcrs);

// Legacy routes - redirect to new URL pattern
router.get('/bcr-view/:legacyBcrId/workflow-progress', (req, res) => {
  res.redirect(`/bcr/business-change-requests/${req.params.legacyBcrId}/update-workflow`);
});
router.get('/bcr-view/:legacyBcrId', (req, res) => {
  res.redirect(`/bcr/business-change-requests/${req.params.legacyBcrId}`);
});

// Main BCR view route - must be last
router.get('/business-change-requests/:bcrId', bcrController.viewBcr);

// === Confirmation and Warning Routes ===
router.get('/business-change-requests/:bcrId/confirm', (req, res) => {
  const action = req.query.action || 'update';
  const message = req.query.message || 'Action completed successfully';
  
  res.render('bcr/confirm', {
    title: 'Confirmation',
    message,
    action,
    bcrId: req.params.bcrId,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    user: req.user
  });
});

router.get('/business-change-requests/:bcrId/warning', (req, res) => {
  const action = req.query.action || 'delete';
  let message = 'Are you sure you want to proceed with this action?';
  let title = 'Warning';
  
  if (action === 'delete') {
    message = 'Are you sure you want to delete this BCR? This action cannot be undone.';
    title = 'Delete BCR';
  }
  
  res.render('bcr/warning', {
    title,
    message,
    action,
    bcrId: req.params.bcrId,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    user: req.user
  });
});

// Export the migration router instead of the original router
module.exports = bcrMigrationRouter;
