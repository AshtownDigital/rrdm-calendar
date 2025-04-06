const express = require('express');
const router = express.Router();

// Redirect all restore-points routes to the ref-data version
router.get('/', (req, res) => {
  res.redirect('/ref-data/restore-points');
});

// Redirect API endpoints for restore points
router.post('/create', (req, res) => {
  res.redirect(307, '/ref-data/restore-points/create');
});

router.post('/restore/:id', (req, res) => {
  res.redirect(307, `/ref-data/restore-points/restore/${req.params.id}`);
});

module.exports = router;
