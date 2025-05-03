/**
 * Authentication middleware for RRDM application
 * Provides functions to check if a user is authenticated and has the correct role
 */

// Middleware to check if user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Store the original URL to redirect after login
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to access this page');
  res.redirect('/access/login');
};

// Middleware to check if user is an admin
const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  
  req.flash('error', 'You do not have permission to access this page');
  res.redirect('/home');
};

// Middleware to check if user is authenticated and redirect if already logged in
const forwardAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/home');
};

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
  forwardAuthenticated
};
