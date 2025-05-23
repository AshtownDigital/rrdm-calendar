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
const counterService = require('../../services/counterService'); // Added counter service

// BCR Dashboard with simplified fallback for performance
router.get('/dashboard', async (req, res) => {
  try {
    // Set a timeout for the complex dashboard
    const dashboardTimeout = setTimeout(() => {
      if (!res.headersSent) {
        console.log('Dashboard view timeout - using simplified view');
        
        // Render a simplified dashboard without complex queries
        return res.render('bcr/dashboard-simple', {
          title: 'BCR Dashboard (Simplified View)',
          user: req.user,
          simplified: true,
          csrfToken: req.csrfToken ? req.csrfToken() : '',
          message: 'Using simplified view due to performance optimization'
        });
      }
    }, 5000); // 5 second timeout for the complex dashboard
    
    // Try to render the full dashboard
    try {
      await dashboardController.dashboard(req, res);
      clearTimeout(dashboardTimeout);
    } catch (error) {
      // If there's an error in the full dashboard, use the simplified one
      console.error('Error in full dashboard view:', error);
      
      if (!res.headersSent) {
        clearTimeout(dashboardTimeout);
        
        return res.render('bcr/dashboard-simple', {
          title: 'BCR Dashboard (Simplified View)',
          user: req.user,
          simplified: true,
          error: error.message,
          csrfToken: req.csrfToken ? req.csrfToken() : '',
          message: 'Using simplified view due to an error in the full dashboard'
        });
      }
    }
  } catch (outerError) {
    console.error('Critical error in dashboard route:', outerError);
    
    if (!res.headersSent) {
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Critical error loading BCR dashboard',
        error: process.env.NODE_ENV === 'development' ? outerError : {},
        user: req.user
      });
    }
  }
});

// Removed the fast dashboard route as requested - keeping only the standard dashboard

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
