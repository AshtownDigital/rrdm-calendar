/**
 * BCR Workflow Routes
 * Handles routes for BCR workflow visualization and management
 */
const express = require('express');
const router = express.Router();
const workflowViewController = require('../../../controllers/modules/bcr/workflowViewController');
const auth = require('../../../middleware/auth');
const { enhancedCsrfProtection } = require('../../../middleware/csrf');

// Workflow view route
router.get('/:id', auth.ensureAuthenticated, enhancedCsrfProtection, workflowViewController.showWorkflowView);

// Next phase action route
router.post('/:id/next-phase', auth.ensureAuthenticated, enhancedCsrfProtection, workflowViewController.handleNextPhase);

// Skip to phase action route
router.post('/:id/skip-to-phase', auth.ensureAuthenticated, enhancedCsrfProtection, workflowViewController.handleSkipToPhase);

module.exports = router;
