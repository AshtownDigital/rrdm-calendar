/**
 * CSRF Protection Middleware
 * Provides CSRF protection for forms using csurf package
 */
const csrf = require('csurf');

// Configure CSRF protection with more specific settings
const csrfProtection = csrf({
  cookie: true, // Use cookies for CSRF tokens
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'] // Only check CSRF for state-changing methods
});

// Middleware to add CSRF token to response locals
const addCsrfToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

// Export the middleware
module.exports = (req, res, next) => {
  // Check if we're in a test environment where we want to bypass CSRF
  if (process.env.NODE_ENV === 'test') {
    console.log('CSRF protection disabled for testing environment');
    // Add a dummy CSRF token to response locals
    res.locals.csrfToken = 'dummy-csrf-token-for-testing';
    // Continue to the next middleware
    return next();
  }
  
  // Use proper CSRF protection for development and production
  csrfProtection(req, res, (err) => {
    if (err) {
      // Handle CSRF errors
      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('error', {
          title: 'Forbidden',
          message: 'Invalid CSRF token. Please try again.',
          error: {
            status: 403,
            stack: process.env.NODE_ENV === 'development' ? err.stack : ''
          },
          user: req.user
        });
      }
      return next(err);
    }
    
    // Add CSRF token to response locals
    addCsrfToken(req, res, next);
  });
};
