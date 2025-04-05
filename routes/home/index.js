const express = require('express');
const router = express.Router();

// Home page route
router.get('/', (req, res) => {
  // Use the standalone home page template with custom navigation
  res.render('modules/home/home-page');
});

module.exports = router;
