/**
 * Authentication middleware for RRDM application
 * Provides functions to check if a user is authenticated and has the correct role
 * 
 * This middleware supports the following user types:
 * - admin: Full access to all modules including Access Management
 * - business: Access to all modules except Access Management
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
  
  // If user is authenticated but not an admin, show unauthorized page
  if (req.isAuthenticated()) {
    return res.status(403).render('unauthorized', {
      user: req.user,
      requestedUrl: req.originalUrl
    });
  }
  
  // If user is not authenticated, redirect to login
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to access this page');
  res.redirect('/access/login');
};

// Middleware to check if user is authenticated and redirect if already logged in
const forwardAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/home');
};

// Middleware to check for specific role or permission
const checkPermission = (requiredRole) => {
  return (req, res, next) => {
    // First check if user is authenticated
    if (!req.isAuthenticated()) {
      req.session.returnTo = req.originalUrl;
      req.flash('error', 'Please log in to access this page');
      return res.redirect('/access/login');
    }
    
    // Then check if user has the required role
    if (requiredRole && req.user.role !== requiredRole) {
      return res.status(403).render('unauthorized', {
        user: req.user,
        requestedUrl: req.originalUrl
      });
    }
    
    // User is authenticated and has the required role
    return next();
  };
};

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
  forwardAuthenticated,
  checkPermission
};
