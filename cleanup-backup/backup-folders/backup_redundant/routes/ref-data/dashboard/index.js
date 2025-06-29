/**
 * Reference Data Dashboard Routes
 */
const express = require('express');
const router = express.Router();
const { dashboardController } = require('../../../controllers/reference-data');

// Dashboard route
router.get('/', dashboardController.showDashboard);

module.exports = router;
