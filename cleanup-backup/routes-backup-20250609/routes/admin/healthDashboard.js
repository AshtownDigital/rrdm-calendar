/**
 * Health Dashboard Routes
 * 
 * Routes for the admin health dashboard, displaying system health,
 * Redis status, and session information.
 */
const express = require('express');
const router = express.Router();
const healthDashboardController = require('../../controllers/admin/healthDashboardController');
const { ensureAuthenticated, ensureAdmin } = require('../../middleware/auth');

// Apply authentication and admin middleware to all routes
router.use(ensureAuthenticated);
router.use(ensureAdmin);

// Health dashboard route
router.get('/', healthDashboardController.renderHealthDashboard);

module.exports = router;
