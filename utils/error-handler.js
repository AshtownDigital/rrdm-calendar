/**
 * Comprehensive Error Handling Utility
 * 
 * This utility provides standardized error handling for the RRDM application,
 * including specialized handlers for database operations, API endpoints,
 * and authentication flows.
 */
// Import Prisma error types safely
let PrismaClientKnownRequestError, PrismaClientValidationError;
try {
  const { Prisma } = require('@prisma/client');
  PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;
  PrismaClientValidationError = Prisma.PrismaClientValidationError;
} catch (e) {
  // Create fallback error classes if Prisma is not available
  PrismaClientKnownRequestError = class PrismaClientKnownRequestError extends Error {
    constructor(message, { code, meta }) {
      super(message);
      this.code = code;
      this.meta = meta;
    }
  };
  PrismaClientValidationError = class PrismaClientValidationError extends Error {};
}

// Set up logging with fallback
let logger;
try {
  const loggerModule = require('../services/logger');
  logger = loggerModule.logger;
} catch (error) {
  console.warn('Warning: Logger not available in error handler, using console fallback');
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
}

/**
 * Error types for categorization
 */
const ErrorTypes = {
  DATABASE: 'DATABASE_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE_ERROR',
};

/**
 * Maps Prisma error codes to user-friendly messages
 */
const prismaErrorMap = {
  P2002: 'A unique constraint would be violated on this operation.',
  P2003: 'Foreign key constraint failed on the field.',
  P2025: 'Record not found.',
  // Add more mappings as needed
};

/**
 * Handles database errors, particularly from Prisma
 * @param {Error} error - The caught error
 * @param {Object} options - Additional options for error handling
 * @returns {Object} Standardized error object
 */
const handleDatabaseError = (error, options = {}) => {
  const { logLevel = 'error', includeStack = true } = options;
  
  let errorInfo = {
    type: ErrorTypes.DATABASE,
    message: 'A database error occurred',
    originalError: error.message,
    code: error.code || 'UNKNOWN',
  };

  if (error instanceof PrismaClientKnownRequestError) {
    errorInfo.code = error.code;
    errorInfo.meta = error.meta;
    errorInfo.message = prismaErrorMap[error.code] || 'A database error occurred';
  } else if (error instanceof PrismaClientValidationError) {
    errorInfo.type = ErrorTypes.VALIDATION;
    errorInfo.message = 'Invalid data provided to database operation';
  }

  if (includeStack && error.stack) {
    errorInfo.stack = error.stack;
  }

  // Log the error
  logger[logLevel]('Database error', {
    service: 'rrdm-app',
    error: errorInfo
  });

  return errorInfo;
};

/**
 * Handles API endpoint errors
 * @param {Error} error - The caught error
 * @param {Object} res - Express response object
 * @param {Object} options - Additional options for error handling
 */
const handleApiError = (error, res, options = {}) => {
  const { 
    logLevel = 'error', 
    includeStack = false,
    defaultStatusCode = 500,
    defaultMessage = 'An unexpected error occurred'
  } = options;

  let errorResponse = {
    success: false,
    error: defaultMessage
  };

  let statusCode = defaultStatusCode;

  // Handle different error types
  if (error.type === ErrorTypes.VALIDATION) {
    statusCode = 400;
    errorResponse.error = error.message || 'Validation error';
  } else if (error.type === ErrorTypes.AUTHENTICATION) {
    statusCode = 401;
    errorResponse.error = error.message || 'Authentication error';
  } else if (error.type === ErrorTypes.AUTHORIZATION) {
    statusCode = 403;
    errorResponse.error = error.message || 'Authorization error';
  } else if (error.type === ErrorTypes.NOT_FOUND) {
    statusCode = 404;
    errorResponse.error = error.message || 'Resource not found';
  } else if (error.type === ErrorTypes.EXTERNAL_SERVICE) {
    statusCode = 502;
    errorResponse.error = error.message || 'External service error';
  }

  // Add error code if available
  if (error.code) {
    errorResponse.code = error.code;
  }

  // Log the error
  logger[logLevel](`API error: ${statusCode}`, {
    service: 'rrdm-app',
    statusCode,
    error: includeStack && error.stack ? error.stack : error.message
  });

  return res.status(statusCode).json(errorResponse);
};

/**
 * Handles errors in web routes (HTML responses)
 * @param {Error} error - The caught error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} options - Additional options for error handling
 */
const handleWebError = (error, req, res, options = {}) => {
  const { 
    logLevel = 'error',
    defaultStatusCode = 500,
    defaultMessage = 'An unexpected error occurred',
    viewPath = 'errors/error'
  } = options;

  let statusCode = defaultStatusCode;
  let errorMessage = defaultMessage;

  // Handle different error types
  if (error.type === ErrorTypes.VALIDATION) {
    statusCode = 400;
    errorMessage = error.message || 'Invalid input provided';
  } else if (error.type === ErrorTypes.AUTHENTICATION) {
    statusCode = 401;
    errorMessage = error.message || 'Authentication required';
  } else if (error.type === ErrorTypes.AUTHORIZATION) {
    statusCode = 403;
    errorMessage = error.message || 'Access denied';
  } else if (error.type === ErrorTypes.NOT_FOUND) {
    statusCode = 404;
    errorMessage = error.message || 'Resource not found';
  }

  // Log the error
  logger[logLevel](`Web error: ${statusCode}`, {
    service: 'rrdm-app',
    statusCode,
    path: req.path,
    error: error.stack || error.message
  });

  // Add error message to flash if available
  if (req.flash) {
    req.flash('error_msg', errorMessage);
  }

  // Render error page or redirect
  if (statusCode === 401 && !req.path.startsWith('/access/')) {
    return res.redirect('/access/login');
  } else if (statusCode === 404) {
    return res.status(404).render('errors/404', {
      message: errorMessage,
      title: 'Page not found'
    });
  } else {
    return res.status(statusCode).render(viewPath, {
      message: errorMessage,
      status: statusCode,
      title: 'Error'
    });
  }
};

/**
 * Creates a standardized error object
 * @param {string} message - Error message
 * @param {string} type - Error type from ErrorTypes
 * @param {Object} additionalInfo - Any additional error information
 * @returns {Error} Enhanced error object
 */
const createError = (message, type = ErrorTypes.SERVER, additionalInfo = {}) => {
  const error = new Error(message);
  error.type = type;
  
  // Add any additional properties
  Object.keys(additionalInfo).forEach(key => {
    error[key] = additionalInfo[key];
  });
  
  return error;
};

/**
 * Async route handler wrapper to catch errors
 * @param {Function} fn - The route handler function
 * @returns {Function} Wrapped route handler with error catching
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ErrorTypes,
  handleDatabaseError,
  handleApiError,
  handleWebError,
  createError,
  asyncHandler
};
