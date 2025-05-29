/**
 * BCR Workflow Routes
 * Handles routes for BCR workflow visualization and management
 */
const express = require('express');
const router = express.Router();
const workflowViewController = require('../../../controllers/modules/bcr/workflowViewController');
const auth = require('../../../middleware/auth');
const csrfProtection = require('../../../middleware/csrf');

// Workflow view route
router.get('/:id', auth.ensureAuthenticated, csrfProtection, (req, res) => {
  return workflowViewController.showWorkflowView(req, res);
});

// Next phase action route
router.post('/:id/next-phase', auth.ensureAuthenticated, csrfProtection, (req, res) => {
  return workflowViewController.handleNextPhase(req, res);
});

// Skip to phase action route
router.post('/:id/skip-to-phase', auth.ensureAuthenticated, csrfProtection, (req, res) => {
  return workflowViewController.handleSkipToPhase(req, res);
});

module.exports = router;
