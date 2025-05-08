/**
 * Security Middleware
 * 
 * This middleware provides security enhancements for the application.
 * It includes headers, CSP, and other security features.
 */
const helmet = require('helmet');
const csurf = require('csurf');
const { logger } = require('../services/logger');

/**
 * Configure security headers using Helmet
 * @returns {Function} - Express middleware
 */
function securityHeaders() {
  // Configure Helmet options based on environment
  const isProd = process.env.NODE_ENV === 'production';
  
  const helmetOptions = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "*.gov.uk"], // Allow GOV.UK scripts
        styleSrc: ["'self'", "'unsafe-inline'", "*.gov.uk"], // Allow GOV.UK styles
        imgSrc: ["'self'", "data:", "*.gov.uk"], // Allow GOV.UK images
        fontSrc: ["'self'", "data:", "*.gov.uk"], // Allow GOV.UK fonts
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProd ? [] : null // Only in production
      }
    },
    frameguard: {
      action: 'deny'
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    }
  };
  
  // Only enable HSTS in production
  if (isProd) {
    helmetOptions.hsts = {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true
    };
  }
  
  return helmet(helmetOptions);
}

/**
 * Configure CSRF protection
 * @returns {Function} - Express middleware
 */
function csrfProtection() {
  return csurf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  });
}

/**
 * CSRF error handler
 * @returns {Function} - Express middleware
 */
function csrfErrorHandler() {
  return (err, req, res, next) => {
    if (err.code !== 'EBADCSRFTOKEN') {
      return next(err);
    }
    
    // Log CSRF validation failure
    logger.warn('CSRF validation failed', {
      ip: req.ip,
      path: req.originalUrl || req.url,
      method: req.method,
      userId: req.user ? req.user.id : 'anonymous'
    });
    
    // Handle CSRF error
    if (req.xhr || req.path.startsWith('/api/')) {
      // API request - return JSON error
      res.status(403).json({
        success: false,
        error: {
          message: 'CSRF validation failed',
          status: 403
        }
      });
    } else {
      // Web request - redirect to error page
      req.flash('error_msg', 'Security validation failed. Please try again.');
      res.redirect('/error');
    }
  };
}

/**
 * Add CSRF token to response locals for templates
 * @returns {Function} - Express middleware
 */
function csrfTokenMiddleware() {
  return (req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  };
}

/**
 * Configure security for API routes
 * @returns {Array} - Array of Express middleware
 */
function apiSecurity() {
  return [
    helmet({
      contentSecurityPolicy: false // API doesn't need CSP
    })
  ];
}

/**
 * Configure security for web routes
 * @returns {Array} - Array of Express middleware
 */
function webSecurity() {
  return [
    securityHeaders(),
    csrfProtection(),
    csrfTokenMiddleware()
  ];
}

module.exports = {
  securityHeaders,
  csrfProtection,
  csrfErrorHandler,
  csrfTokenMiddleware,
  apiSecurity,
  webSecurity
};
