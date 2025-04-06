const express = require('express');
const router = express.Router();

// Import sub-routes
const dashboardRouter = require('./dashboard');
const itemsRouter = require('./items');
const valuesRouter = require('./values');
const releaseNotesRouter = require('./release-notes');
const restorePointsRouter = require('./restore-points');

// Use sub-routes
router.use('/dashboard', dashboardRouter);
router.use('/items', itemsRouter);
router.use('/values', valuesRouter);
router.use('/release-notes', releaseNotesRouter);
router.use('/restore-points', restorePointsRouter);

// Redirect root to dashboard
router.get('/', (req, res) => {
  res.redirect('/ref-data/dashboard');
});

module.exports = router;
