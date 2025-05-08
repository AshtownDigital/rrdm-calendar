/**
 * API Router
 * 
 * Main entry point for all API routes with versioning support.
 * Legacy routes are maintained for backward compatibility.
 */
const express = require('express');
const router = express.Router();

// Import API versions
const apiV1 = require('./v1');

// Import legacy API route modules
const dashboardRoutes = require('./dashboard');
const itemsRoutes = require('./items');
const valuesRoutes = require('./values');
const releaseNotesRoutes = require('./release-notes');

// API version routes
router.use('/v1', apiV1);

// Legacy API routes (maintained for backward compatibility)
router.use('/dashboard', dashboardRoutes);
router.use('/items', itemsRoutes);
router.use('/values', valuesRoutes);
router.use('/release-notes', releaseNotesRoutes);

// API documentation route
router.get('/docs', (req, res) => {
  res.render('modules/api/documentation', {
    title: 'API Documentation',
    user: req.user
  });
});

// Root API route - display version information
router.get('/', (req, res) => {
  res.json({
    name: 'RRDM API',
    versions: ['v1'],
    currentVersion: 'v1',
    documentation: '/api/docs'
  });
});

module.exports = router;
