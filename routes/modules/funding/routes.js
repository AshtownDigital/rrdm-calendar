/**
 * Funding Module Routes
 * Consolidated routes for funding management functionality
 */
const express = require('express');
const router = express.Router();
const csrfProtection = require('../../../middleware/csrf');
const authService = require('../../../services/modules/access/authService');
const fundingController = require('../../../controllers/modules/funding/controller');

// Require authentication for all funding routes
router.use(authService.verifySession);

// Main funding dashboard
router.get('/', fundingController.index);

// Funding requirements page
router.get('/requirements', fundingController.requirements);

// Funding history page
router.get('/history', fundingController.history);

// Funding reports page
router.get('/reports', fundingController.reports);

// Generate funding report
router.post('/reports/generate', csrfProtection, fundingController.generateReport);

module.exports = router;
