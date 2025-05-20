/**
 * CSRF Protection Middleware
 * Provides CSRF protection for forms using csurf package
 */
const csrf = require('csurf');

// Configure CSRF protection with more specific settings
const csrfProtection = csrf({
  cookie: {
    key: '_csrf', // The name of the cookie
    path: '/',    // The path for the cookie
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
});

// Middleware to add CSRF token to response locals
const addCsrfToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

// Export the middleware
module.exports = (req, res, next) => {
  // Apply CSRF protection
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
