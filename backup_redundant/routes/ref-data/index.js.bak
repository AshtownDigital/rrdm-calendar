const express = require('express');
const router = express.Router();

// Import sub-routes
const dashboardRouter = require('./dashboard');
const itemsRouter = require('./items');
const valuesRouter = require('./values');
const releaseNotesRouter = require('./release-notes');
const restorePointsRouter = require('./restore-points');
const dfeDataRouter = require('./dfe-data');

// Use sub-routes
router.use('/dashboard', dashboardRouter);
router.use('/items', itemsRouter);
router.use('/values', valuesRouter);
router.use('/release-notes', releaseNotesRouter);
router.use('/restore-points', restorePointsRouter);
router.use('/dfe-data', dfeDataRouter);

// Redirect root to dashboard
router.get('/', (req, res) => {
  res.redirect('/ref-data/dashboard');
});

module.exports = router;
