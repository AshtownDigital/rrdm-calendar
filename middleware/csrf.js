/**
 * CSRF Protection Middleware
 * Provides CSRF protection for forms using csurf package
 */
const csrf = require('csurf');
const { logger } = require('../utils/logger');

// Configure CSRF protection with more specific settings
const csrfProtection = csrf({
  cookie: true, // Use cookies for CSRF tokens
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'] // Only check CSRF for state-changing methods
});

// Enhanced CSRF protection middleware with detailed logging
const enhancedCsrfProtection = (req, res, next) => {
  logger.info('Request path:', req.path);
  logger.info('Request method:', req.method);
  logger.info('CSRF token in body:', req.body && req.body._csrf ? 'Present' : 'Not present');
  logger.info('CSRF token in query:', req.query && req.query._csrf ? 'Present' : 'Not present');
  logger.info('CSRF token in headers:', req.headers && req.headers['csrf-token'] ? 'Present' : 'Not present');
  logger.info('CSRF token in headers (x-csrf-token):', req.headers && req.headers['x-csrf-token'] ? 'Present' : 'Not present');
  logger.info('CSRF token in headers (x-xsrf-token):', req.headers && req.headers['x-xsrf-token'] ? 'Present' : 'Not present');
  
  // Check if we're in a test environment where we want to bypass CSRF
  if (process.env.NODE_ENV === 'test') {
    logger.info('CSRF protection disabled for testing environment');
    // Add a dummy CSRF token to response locals
    res.locals.csrfToken = 'dummy-csrf-token-for-testing';
    // Continue to the next middleware
    return next();
  }
  
  // Use proper CSRF protection for development and production
  csrfProtection(req, res, (err) => {
    if (err) {
      // Handle CSRF errors
      logger.error('CSRF validation failed:', err);
      logger.error('Request body:', req.body);
      logger.error('Request headers:', req.headers);
      
      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('error', {
          title: 'Forbidden',
          message: 'Invalid CSRF token. Please try again.',
          error: {
            status: 403,
            stack: process.env.NODE_ENV === 'development' ? err.stack : ''
          },
          user: req.user,
          url: req.originalUrl
        });
      }
      return next(err);
    }
    
    // Add CSRF token to response locals
    res.locals.csrfToken = req.csrfToken();
    logger.info('CSRF token generated and added to res.locals');
    next();
  });
};

// Export both the raw CSRF protection middleware and the enhanced version
module.exports = {
  csrfProtection,
  enhancedCsrfProtection
};
