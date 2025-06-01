/**
 * BCR Module Routes
 * Consolidated routes for all BCR management functionality
 */
const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../../../middleware/csrf');

// Import controllers
const bcrController = require('../../../controllers/modules/bcr/controller');
const reviewController = require('../../../controllers/modules/bcr/reviewController');
const updateBcrController = require('../../../controllers/modules/bcr/updateBcrController');
const updateWorkflowController = require('../../../controllers/modules/bcr/updateWorkflowController');

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
router.get('/submissions/:id', bcrController.viewSubmission);
router.get('/submissions/:id/review', csrfProtection, reviewController.renderReviewForm);
router.post('/submissions/:id/review', csrfProtection, reviewController.processReview);

// === Impact Areas Routes ===
// Main impact areas route to list all impact areas
router.get('/impact-areas', bcrController.listImpactAreas);
router.get('/impact-areas/list', bcrController.listImpactAreas);
router.get('/impact-areas/new', csrfProtection, bcrController.newImpactAreaForm);
router.post('/impact-areas/new', csrfProtection, bcrController.createImpactArea);
router.get('/impact-areas/:id/edit', csrfProtection, bcrController.editImpactAreaForm);
router.post('/impact-areas/:id/edit', csrfProtection, bcrController.updateImpactArea);
router.get('/impact-areas/:id/delete', csrfProtection, bcrController.deleteImpactAreaConfirm);
router.post('/impact-areas/:id/delete', csrfProtection, bcrController.deleteImpactArea);

// === Business Change Request Routes (Post-Approval) ===
router.get('/business-change-requests', bcrController.listApprovedBcrs); // New route for listing only BCRs
router.get('/business-change-requests/:id', bcrController.viewBcr); // New route for viewing a specific BCR
router.get('/bcr-view/:id', bcrController.viewBcr); // New detailed view route for BCRs
router.get('/bcr-view/:id/workflow-progress', bcrController.viewWorkflowProgress); // Dedicated page for workflow progress
router.get('/business-change-requests/:id/review', csrfProtection, reviewController.renderReviewForm); // Route for reviewing a BCR
router.post('/business-change-requests/:id/review', csrfProtection, reviewController.processReview); // Route for processing a BCR review
// Routes for updating the workflow
router.get('/business-change-requests/:id/update-workflow', csrfProtection, updateWorkflowController.renderUpdateWorkflowForm);
router.post('/business-change-requests/:id/update-workflow', csrfProtection, updateWorkflowController.processUpdateWorkflow);
// Simple test route for debugging
router.get('/test-update', (req, res) => {
  console.log('Test update route hit');
  res.send(`
    <html>
      <head><title>BCR Update Test</title></head>
      <body>
        <h1>BCR Update Test</h1>
        <p>This is a test page for the BCR update functionality.</p>
        <form action="/bcr/test-update-post" method="post">
          <button type="submit">Test Update</button>
        </form>
      </body>
    </html>
  `);
});

// Routes for updating BCR workflow
router.get('/business-change-requests/:id/update', (req, res, next) => {
  console.log('Update route hit with params:', req.params);
  next();
}, csrfProtection, updateBcrController.renderUpdateForm); // Route for updating a BCR workflow

router.post('/business-change-requests/:id/update', (req, res, next) => {
  console.log('Update POST route hit with params:', req.params);
  next();
}, csrfProtection, updateBcrController.processUpdate); // Route for processing a BCR workflow update
router.get('/:id', bcrController.viewSubmission); // Keep for backward compatibility
router.get('/:id/update', bcrController.viewSubmission);
router.post('/:id/update', csrfProtection, bcrController.viewSubmission);

// === Confirmation and Warning Routes ===
router.get('/:id/confirm', (req, res) => {
  const action = req.query.action || 'update';
  const message = req.query.message || 'Action completed successfully';
  
  res.render('bcr/confirm', {
    title: 'Confirmation',
    message,
    action,
    bcrId: req.params.id,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    user: req.user
  });
});

router.get('/:id/warning', (req, res) => {
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
    bcrId: req.params.id,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    user: req.user
  });
});

module.exports = router;
