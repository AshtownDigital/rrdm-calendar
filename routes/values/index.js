const express = require('express');
const router = express.Router();

// Redirect all values routes to the ref-data version
router.get('/', (req, res) => {
  res.redirect('/ref-data/values');
});

// Redirect specific item values routes
router.get('/:itemId', (req, res) => {
  res.redirect(`/ref-data/values/${req.params.itemId}`);
});

// Redirect value history routes
router.get('/:itemId/:valueId/history', (req, res) => {
  res.redirect(`/ref-data/values/${req.params.itemId}/${req.params.valueId}/history`);
});

module.exports = router;
