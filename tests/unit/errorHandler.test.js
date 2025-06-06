/**
 * Error Handler Middleware Unit Tests
 */
const { ApiError, notFound, apiErrorHandler, webErrorHandler } = require('../../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/api/test',
      originalUrl: '/api/test'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      render: jest.fn()
    };
    next = jest.fn();
  });

  describe('ApiError class', () => {
    it('should create an ApiError with the correct properties', () => {
      const error = new ApiError(400, 'Bad Request', { field: 'name' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad Request');
      expect(error.details).toEqual({ field: 'name' });
      expect(error.isApiError).toBe(true);
    });
  });

  describe('notFound middleware', () => {
    it('should create a 404 error and pass it to next', () => {
      notFound(req, res, next);
      
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('Not Found');
    });
  });

  describe('apiErrorHandler middleware', () => {
    it('should handle API errors for API routes', () => {
      const error = new ApiError(400, 'Bad Request');
      apiErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Bad Request',
          status: 400
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass non-API routes to next middleware', () => {
      req.path = '/non-api';
      const error = new Error('Test Error');
      apiErrorHandler(error, req, res, next);
      
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('webErrorHandler middleware', () => {
    it('should handle errors for web routes', () => {
      req.path = '/non-api';
      req.user = { name: 'Test User' };
      const error = new Error('Test Error');
      error.statusCode = 500;
      
      webErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('error', {
        title: 'Error 500',
        message: 'Test Error',
        error: expect.anything(),
        details: null,
        user: req.user
      });
    });

    it('should handle Prisma errors for web routes', () => {
      req.path = '/non-api';
      req.user = { name: 'Test User' };
      
      // Create a mock Prisma error
      const error = {
        name: 'PrismaClientKnownRequestError',
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['email'] }
      };
      
      // Make instanceof work for our mock
      Object.setPrototypeOf(error, Error.prototype);
      error.constructor = { name: 'PrismaClientKnownRequestError' };
      
      webErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('error', {
        title: 'Error 500',
        message: 'A record with this information already exists',
        error: expect.anything(),
        details: { target: ['email'] },
        user: req.user
      });
    });

    it('should pass API routes to next middleware', () => {
      req.path = '/api/test';
      const error = new Error('Test Error');
      webErrorHandler(error, req, res, next);
      
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.render).not.toHaveBeenCalled();
    });
  });
});
