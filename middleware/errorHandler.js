/**
 * Centralized Error Handler Middleware
 * 
 * This middleware provides consistent error handling across the application.
 * It handles different types of errors and formats responses appropriately.
 */
const { Prisma } = require('@prisma/client');
const PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isApiError = true;
  }
}

/**
 * Not Found error handler - called when no route matches
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * API error handler - formats JSON responses for API routes
 */
const apiErrorHandler = (err, req, res, next) => {
  // Only handle API routes
  if (!req.path.startsWith('/api/')) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  
  // Format the error response
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'Server Error',
      status: statusCode
    }
  };

  // Add error details if available
  if (err.details) {
    errorResponse.error.details = err.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // Log the error
  console.error(`API Error: ${err.message}`, err.stack);
  
  // Send the response
  return res.status(statusCode).json(errorResponse);
};

/**
 * Web error handler - renders error page for web routes
 */
const webErrorHandler = (err, req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  
  // Log the error
  console.error(`Web Error: ${err.message}`, err.stack);
  
  // Format error message based on type
  let errorMessage = err.message || 'An unexpected error occurred';
  let errorDetails = null;
  
  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        errorMessage = 'A record with this information already exists';
        break;
      case 'P2025':
        errorMessage = 'Record not found';
        statusCode = 404;
        break;
      default:
        errorMessage = 'Database error';
    }
    errorDetails = err.meta;
  }

  // Render the error page
  res.status(statusCode).render('error', {
    title: `Error ${statusCode}`,
    message: errorMessage,
    error: process.env.NODE_ENV === 'development' ? err : {},
    details: errorDetails,
    user: req.user
  });
};

module.exports = {
  ApiError,
  notFound,
  apiErrorHandler,
  webErrorHandler
};
