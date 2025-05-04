const express = require('express');
const router = express.Router();

// Home page route
router.get('/', (req, res) => {
  // Use the home template that extends the base layout
  res.render('modules/home/home', {
    user: req.user,
    serviceName: 'Register Team Internal Services'
  });
});

module.exports = router;
