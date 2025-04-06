const express = require('express');
const router = express.Router();

// Redirect all release-notes routes to the ref-data version
router.get('/', (req, res) => {
  const year = req.query.year || '';
  const view = req.query.view || 'list';
  res.redirect(`/ref-data/release-notes?year=${year}&view=${view}`);
});

module.exports = router;
