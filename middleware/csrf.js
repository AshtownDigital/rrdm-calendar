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

// Enhanced CSRF protection middleware with detailed logging
const enhancedCsrfProtection = (req, res, next) => {
  console.log('=== CSRF PROTECTION MIDDLEWARE STARTED ===');
  console.log('Request path:', req.path);
  console.log('Request method:', req.method);
  console.log('CSRF token in body:', req.body && req.body._csrf ? 'Present' : 'Not present');
  console.log('CSRF token in query:', req.query && req.query._csrf ? 'Present' : 'Not present');
  console.log('CSRF token in headers:', req.headers && req.headers['csrf-token'] ? 'Present' : 'Not present');
  console.log('CSRF token in headers (x-csrf-token):', req.headers && req.headers['x-csrf-token'] ? 'Present' : 'Not present');
  console.log('CSRF token in headers (x-xsrf-token):', req.headers && req.headers['x-xsrf-token'] ? 'Present' : 'Not present');
  
  csrfProtection(req, res, (err) => {
    if (err) {
      // Handle CSRF errors
      console.error('=== CSRF VALIDATION FAILED ===');
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      console.error('Request body:', req.body);
      console.error('Request headers:', req.headers);
      
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
    res.locals.csrfToken = req.csrfToken();
    console.log('=== CSRF VALIDATION PASSED ===');
    console.log('CSRF token generated and added to res.locals');
    next();
  });
};

// Export both the raw CSRF protection middleware and the enhanced version
module.exports = {
  csrfProtection,
  enhancedCsrfProtection
};
