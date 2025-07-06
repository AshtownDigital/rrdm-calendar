const express = require('express');
const router = express.Router();

/**
 * Test route to verify GOV.UK login layout template
 */
router.get('/test-layout', (req, res) => {
  res.render('test-layout');
});

module.exports = router;
