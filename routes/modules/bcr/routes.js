/**
 * BCR Module Routes
 * Consolidated routes for all BCR management functionality
 */
const express = require('express');
const router = express.Router();
const csrfProtection = require('../../../middleware/csrf');

// Import controllers
const bcrController = require('../../../controllers/modules/bcr/controller');
const reviewController = require('../../../controllers/modules/bcr/reviewController');

// Root route - redirect to dashboard
router.get('/', (req, res) => {
  res.redirect('/bcr/dashboard');
});

// === Dashboard Routes ===
router.get('/dashboard', bcrController.dashboard);

// === Workflow Management Routes ===
router.get('/workflow', bcrController.showWorkflow);

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
