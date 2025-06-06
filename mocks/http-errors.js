/**
 * Mock implementation of http-errors for testing
 */

// Base HTTP Error class
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = this.constructor.name;
    this.message = message || 'Error';
    this.status = status;
    this.statusCode = status;
    this.expose = status < 500;
  }
}

// Create specific error classes
class BadRequestError extends HttpError {
  constructor(message) {
    super(400, message || 'Bad Request');
  }
}

class UnauthorizedError extends HttpError {
  constructor(message) {
    super(401, message || 'Unauthorized');
  }
}

class ForbiddenError extends HttpError {
  constructor(message) {
    super(403, message || 'Forbidden');
  }
}

class NotFoundError extends HttpError {
  constructor(message) {
    super(404, message || 'Not Found');
  }
}

class MethodNotAllowedError extends HttpError {
  constructor(message) {
    super(405, message || 'Method Not Allowed');
  }
}

class ConflictError extends HttpError {
  constructor(message) {
    super(409, message || 'Conflict');
  }
}

class InternalServerError extends HttpError {
  constructor(message) {
    super(500, message || 'Internal Server Error');
  }
}

class NotImplementedError extends HttpError {
  constructor(message) {
    super(501, message || 'Not Implemented');
  }
}

class BadGatewayError extends HttpError {
  constructor(message) {
    super(502, message || 'Bad Gateway');
  }
}

class ServiceUnavailableError extends HttpError {
  constructor(message) {
    super(503, message || 'Service Unavailable');
  }
}

// Main factory function
const createError = (status, message, properties) => {
  const err = new HttpError(status, message);
  
  if (properties) {
    Object.assign(err, properties);
  }
  
  return err;
};

// Add convenience methods for common status codes
createError[400] = (message, properties) => createError(400, message, properties);
createError[401] = (message, properties) => createError(401, message, properties);
createError[403] = (message, properties) => createError(403, message, properties);
createError[404] = (message, properties) => createError(404, message, properties);
createError[405] = (message, properties) => createError(405, message, properties);
createError[409] = (message, properties) => createError(409, message, properties);
createError[500] = (message, properties) => createError(500, message, properties);
createError[501] = (message, properties) => createError(501, message, properties);
createError[502] = (message, properties) => createError(502, message, properties);
createError[503] = (message, properties) => createError(503, message, properties);

// Add named exports
createError.HttpError = HttpError;
createError.BadRequest = BadRequestError;
createError.Unauthorized = UnauthorizedError;
createError.Forbidden = ForbiddenError;
createError.NotFound = NotFoundError;
createError.MethodNotAllowed = MethodNotAllowedError;
createError.Conflict = ConflictError;
createError.InternalServerError = InternalServerError;
createError.NotImplemented = NotImplementedError;
createError.BadGateway = BadGatewayError;
createError.ServiceUnavailable = ServiceUnavailableError;

// Export the mock
module.exports = createError;
