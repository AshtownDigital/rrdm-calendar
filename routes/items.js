const express = require('express');
const router = express.Router();

// Redirect all items routes to the ref-data version
router.get('/', (req, res) => {
  res.redirect('/ref-data/items');
});

// Redirect specific item routes
router.get('/:id', (req, res) => {
  const year = req.query.year || '';
  res.redirect(`/ref-data/items/${req.params.id}?year=${year}`);
});

// Redirect item history routes
router.get('/:id/history', (req, res) => {
  const year = req.query.year || '';
  res.redirect(`/ref-data/items/${req.params.id}/history?year=${year}`);
});

// Redirect item values routes
router.get('/:id/values', (req, res) => {
  const year = req.query.year || '';
  res.redirect(`/ref-data/items/${req.params.id}/values?year=${year}`);
});

module.exports = router;
