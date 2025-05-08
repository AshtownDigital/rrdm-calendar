/**
 * Authentication Controller Tests
 */
const { authController } = require('../../../controllers/access');
const passport = require('passport');
const { prisma } = require('../../../config/database');

// Mock dependencies
jest.mock('passport', () => ({
  authenticate: jest.fn((strategy, options, callback) => {
    return (req, res, next) => {
      if (callback) {
        const user = req.body.email === 'valid@example.com' ? { id: '1', name: 'Test User' } : false;
        const info = user ? {} : { message: 'Invalid credentials' };
        return callback(null, user, info)(req, res, next);
      }
      return next();
    };
  })
}));

jest.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

// Mock Express request and response
const mockRequest = (body = {}, session = {}) => {
  const req = {
    body,
    session,
    flash: jest.fn(),
    logout: jest.fn(cb => cb()),
    logIn: jest.fn((user, cb) => cb(null))
  };
  return req;
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

describe('Authentication Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showLoginForm', () => {
    it('should render the login form', () => {
      const req = mockRequest();
      const res = mockResponse();
      
      authController.showLoginForm(req, res);
      
      expect(res.render).toHaveBeenCalledWith('login', {
        title: 'Login',
        layout: 'layouts/auth'
      });
    });
  });
  
  describe('processLogin', () => {
    it('should authenticate valid credentials and redirect to dashboard', () => {
      const req = mockRequest({ email: 'valid@example.com', password: 'password123' });
      const res = mockResponse();
      const next = jest.fn();
      
      authController.processLogin(req, res, next);
      
      expect(passport.authenticate).toHaveBeenCalled();
      expect(req.logIn).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });
    
    it('should handle invalid credentials and redirect back to login', () => {
      const req = mockRequest({ email: 'invalid@example.com', password: 'wrongpassword' });
      const res = mockResponse();
      const next = jest.fn();
      
      authController.processLogin(req, res, next);
      
      expect(passport.authenticate).toHaveBeenCalled();
      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Invalid credentials');
      expect(res.redirect).toHaveBeenCalledWith('/access/login');
    });
  });
  
  describe('logout', () => {
    it('should log the user out and redirect to login page', () => {
      const req = mockRequest();
      const res = mockResponse();
      
      authController.logout(req, res);
      
      expect(req.logout).toHaveBeenCalled();
      expect(req.flash).toHaveBeenCalledWith('success_msg', 'You are logged out');
      expect(res.redirect).toHaveBeenCalledWith('/access/login');
    });
  });
});
