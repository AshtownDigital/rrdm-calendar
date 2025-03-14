// API routes index for Vercel serverless functions
const express = require('express');
const router = express.Router();

// Import API route modules
const dashboardRoutes = require('./dashboard');
const itemsRoutes = require('./items');
const valuesRoutes = require('./values');
const releaseNotesRoutes = require('./release-notes');

// Use API route modules
router.use('/dashboard', dashboardRoutes);
router.use('/items', itemsRoutes);
router.use('/values', valuesRoutes);
router.use('/release-notes', releaseNotesRoutes);

module.exports = router;
