/**
 * BCR Management Routes
 * Handles routes for BCR management
 */
const express = require('express');
const router = express.Router();
const viewController = require('../../controllers/bcr/viewController');
const updateController = require('../../controllers/bcr/updateController');
const dashboardController = require('../../controllers/bcr/dashboardController');
const workflowController = require('../../controllers/bcr/workflowController');
const csrfProtection = require('../../middleware/csrf');

// BCR Dashboard
router.get('/dashboard', dashboardController.dashboard);

// BCR Workflow Management
router.get('/workflow', workflowController.showWorkflow);

// View BCR detail
router.get('/:id', viewController.view);

// Show phase update form
router.get('/:id/update', updateController.updateForm);

// Submit phase update
router.post('/:id/update', csrfProtection, updateController.update);

// Render confirmation view (inline handler)
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

// Render warning view (inline handler)
router.get('/:id/warning', (req, res) => {
  const action = req.query.action || 'delete';
  let message = 'Are you sure you want to proceed with this action?';
  let title = 'Warning';
  
  if (action === 'delete') {
    title = 'Delete BCR';
    message = 'Are you sure you want to delete this BCR? This action cannot be undone.';
  } else if (action === 'phase-rollback') {
    title = 'Phase Rollback';
    message = 'Are you sure you want to roll back the phase for this BCR? This may affect workflow history.';
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
