/**
 * Release Management Routes
 */
const express = require('express');
const router = express.Router();

// Dashboard
router.get('/', (req, res) => {
  res.render('modules/release-management/dashboard', {
    title: 'Release Management Dashboard',
    user: req.user
  });
});

module.exports = router;
