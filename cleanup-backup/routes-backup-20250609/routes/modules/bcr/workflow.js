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
router.get('/:bcrId', auth.ensureAuthenticated, enhancedCsrfProtection, workflowViewController.showWorkflowView);

// Handle phase transitions
router.post('/:bcrId/next-phase', auth.ensureAuthenticated, enhancedCsrfProtection, workflowViewController.handleNextPhase);

// Handle phase skipping
router.post('/:bcrId/skip-to-phase', auth.ensureAuthenticated, enhancedCsrfProtection, workflowViewController.handleSkipToPhase);

module.exports = router;
