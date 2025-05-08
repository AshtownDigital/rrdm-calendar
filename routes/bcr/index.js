/**
 * BCR Routes
 * Routes for the BCR module
 */
const express = require('express');
const router = express.Router();

// Import controllers
const { 
  indexController, 
  submissionsController, 
  formController, 
  statusController,
  workflowController
} = require('../../controllers/bcr');

// Main BCR management page
router.get('/', indexController.index);

// Submissions list view
router.get('/submissions', submissionsController.listSubmissions);

// View BCR submission details
router.get('/submissions/:id', submissionsController.viewSubmission);

// Phase update confirmation page
router.get('/submissions/:id/phase-update-confirmation', submissionsController.phaseUpdateConfirmation);

// New BCR submission form
router.get('/submit', formController.showSubmitForm);

// Process new BCR submission
router.post('/submit', formController.processSubmission);

// BCR update confirmation page
router.get('/update-confirmation/:id', formController.showUpdateConfirmation);

// Edit BCR submission form
router.get('/edit/:id', formController.showEditForm);

// Update BCR status
router.post('/update-status/:id', statusController.updateStatus);

// BCR workflow management page
router.get('/workflow', workflowController.showWorkflow);

// Update BCR workflow configuration
router.post('/workflow', workflowController.updateWorkflow);

// Redirect old submission confirmation URLs to the BCR view page
router.get('/submission-confirmation/:id', (req, res) => {
  res.redirect(`/bcr/${req.params.id}`);
});

module.exports = router;
