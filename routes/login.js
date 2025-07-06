const express = require('express');
const router = express.Router();

// GET login page
router.get('/login', (req, res) => {
  const errorMessages = req.flash('error');
  const warningMessages = req.flash('warning');
  res.render('login.njk', {
    error: errorMessages.length > 0 ? errorMessages[0] : null,
    warning: warningMessages.length > 0 ? warningMessages[0] : null,
    pin: ''
  });
});

const crypto = require('crypto');
const PIN_HASH = '9c3d1e3e3a6b7c3c6c8e7c8c3a3e1e3e3c6c8e7c8c3a3e1e3e3c6c8e7c8c3a3e1e3e3'; // placeholder, will set correct hash below

// The correct SHA-256 hash for '1254' (hex, lowercase)
const CORRECT_PIN = '1254';
const CORRECT_PIN_HASH = crypto.createHash('sha256').update(CORRECT_PIN).digest('hex');

// POST login
router.post('/login', (req, res) => {
  const { pin } = req.body;
  if (pin === CORRECT_PIN_HASH) {
    req.session.authenticated = true;
    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    return res.redirect(redirectTo);
  }
  req.flash('error', 'Incorrect PIN');
  return res.redirect('/login');
});

// GET logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
