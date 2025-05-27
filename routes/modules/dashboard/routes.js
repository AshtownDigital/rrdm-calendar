/**
 * Dashboard Module Routes
 * Handles application-wide dashboard and analytics
 */
const express = require('express');
const router = express.Router();
const dashboardController = require('../../../controllers/modules/dashboard/controller');

// Main system dashboard
router.get('/', dashboardController.index);

// System metrics and stats
router.get('/metrics', dashboardController.metrics);

// System status overview
router.get('/status', dashboardController.status);

module.exports = router;
