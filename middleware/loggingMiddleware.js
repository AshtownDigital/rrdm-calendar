/**
 * Logging Middleware
 * 
 * This middleware provides request logging and integrates with the logger service.
 * It captures HTTP request/response information for monitoring and debugging.
 */
const morgan = require('morgan');
const { logHttpRequest } = require('../services/logger');

/**
 * Create a Morgan token for response time in milliseconds
 */
morgan.token('response-time-ms', (req, res) => {
  return res.responseTime ? `${res.responseTime}ms` : '-';
});

/**
 * Create a Morgan token for user ID
 */
morgan.token('user-id', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

/**
 * Create a Morgan token for request body (sanitized)
 */
morgan.token('request-body', (req) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return '-';
  }
  
  // Create a sanitized copy of the request body
  const sanitized = { ...req.body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credentials'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return JSON.stringify(sanitized);
});

/**
 * Response time middleware
 * Calculates the response time and attaches it to the response object
 */
function responseTime(req, res, next) {
  const startTime = process.hrtime();
  
  // Function to finalize the response
  function finalize() {
    // Calculate response time in milliseconds
    const diff = process.hrtime(startTime);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    res.responseTime = time.toFixed(2);
    
    // Log the request using the logger service
    logHttpRequest(req, res, res.responseTime);
  }
  
  // Add response listeners
  res.on('finish', finalize);
  res.on('close', finalize);
  
  next();
}

/**
 * Create the logging middleware
 * @param {string} format - Morgan log format
 * @returns {Array} - Array of middleware functions
 */
function createLoggingMiddleware(format = 'combined') {
  return [
    // Add response time calculation
    responseTime,
    
    // Add Morgan logging
    morgan(format, {
      // Skip logging for health check endpoints
      skip: (req) => req.originalUrl === '/health' || req.originalUrl === '/api/health'
    })
  ];
}

/**
 * Error logging middleware
 * This should be used after the error handler middleware
 */
function errorLogger(err, req, res, next) {
  // Get the logger service
  const { logger } = require('../services/logger');
  
  // Log the error with appropriate metadata
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl || req.url,
    status: res.statusCode,
    userId: req.user ? req.user.id : 'anonymous',
    requestId: req.id
  });
  
  next(err);
}

module.exports = {
  createLoggingMiddleware,
  errorLogger
};
