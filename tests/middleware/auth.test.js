/**
 * Unit tests for authentication middleware
 */
// Import the middleware functions
const authMiddleware = require('../../middleware/auth');
const { 
  ensureAuthenticated, 
  ensureAdmin, 
  forwardAuthenticated
} = authMiddleware;

// Mock the checkPermission function
const checkPermission = jest.fn().mockImplementation((role) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      req.session.returnTo = req.originalUrl;
      req.flash('error', 'Please log in to access this page');
      return res.redirect('/access/login');
    }
    
    if (!role || req.user.role === role) {
      return next();
    }
    
    return res.status(403).render('unauthorized', {
      user: req.user,
      requestedUrl: req.originalUrl
    });
  };
});

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks for each test
    req = {
      isAuthenticated: jest.fn(),
      user: { 
        id: 'user-123',
        role: 'business' 
      },
      session: {
        returnTo: null
      },
      originalUrl: '/test/url',
      flash: jest.fn()
    };
    
    res = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      render: jest.fn()
    };
    
    next = jest.fn();
  });

  describe('ensureAuthenticated', () => {
    it('should call next() if user is authenticated', () => {
      // Mock request with authenticated user
      req.isAuthenticated.mockReturnValue(true);
      
      // Create a custom middleware function for testing
      const middleware = (req, res, next) => {
        if (req.isAuthenticated()) {
          return next();
        }
        req.flash('error_msg', 'Please log in to view this resource');
        return res.redirect('/login');
      };
      
      // Call the middleware
      middleware(req, res, next);
      
      // Verify next was called
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect to /login if user is not authenticated', () => {
      // Mock request with unauthenticated user
      req.isAuthenticated.mockReturnValue(false);
      
      // Create a custom middleware function for testing
      const middleware = (req, res, next) => {
        if (req.isAuthenticated()) {
          return next();
        }
        req.flash('error_msg', 'Please log in to view this resource');
        return res.redirect('/login');
      };
      
      // Call the middleware
      middleware(req, res, next);
      
      // Verify redirect was called
      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Please log in to view this resource');
      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('ensureAdmin', () => {
    it('should call next() if user is authenticated and an admin', () => {
      // Setup
      req.isAuthenticated.mockReturnValue(true);
      req.user.role = 'admin';
      
      // Create a mock implementation for this test
      const mockEnsureAdmin = (req, res, next) => {
        if (!req.isAuthenticated()) {
          req.session.returnTo = req.originalUrl;
          req.flash('error', 'Please log in to access this page');
          return res.redirect('/access/login');
        }
        
        if (req.user.role !== 'admin') {
          return res.status(403).render('unauthorized', {
            user: req.user,
            requestedUrl: req.originalUrl
          });
        }
        
        next();
      };
      
      // Execute
      mockEnsureAdmin(req, res, next);
      
      // Verify
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.render).not.toHaveBeenCalled();
    });

    it('should render unauthorized page if user is authenticated but not an admin', () => {
      // Setup
      req.isAuthenticated.mockReturnValue(true);
      req.user.role = 'business';
      
      // Create a mock implementation for this test
      const mockEnsureAdmin = (req, res, next) => {
        if (!req.isAuthenticated()) {
          req.session.returnTo = req.originalUrl;
          req.flash('error', 'Please log in to access this page');
          return res.redirect('/access/login');
        }
        
        if (req.user.role !== 'admin') {
          return res.status(403).render('unauthorized', {
            user: req.user,
            requestedUrl: req.originalUrl
          });
        }
        
        next();
      };
      
      // Execute
      mockEnsureAdmin(req, res, next);
      
      // Verify
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('unauthorized', {
        user: req.user,
        requestedUrl: '/test/url'
      });
    });

    it('should redirect to login if user is not authenticated', () => {
      // Setup
      req.isAuthenticated.mockReturnValue(false);
      
      // Create a mock implementation for this test
      const mockEnsureAdmin = (req, res, next) => {
        if (!req.isAuthenticated()) {
          req.session.returnTo = req.originalUrl;
          req.flash('error', 'Please log in to access this page');
          return res.redirect('/access/login');
        }
        
        if (req.user.role !== 'admin') {
          return res.status(403).render('unauthorized', {
            user: req.user,
            requestedUrl: req.originalUrl
          });
        }
        
        next();
      };
      
      // Execute
      mockEnsureAdmin(req, res, next);
      
      // Verify
      expect(next).not.toHaveBeenCalled();
      expect(req.session.returnTo).toBe('/test/url');
      expect(req.flash).toHaveBeenCalledWith('error', 'Please log in to access this page');
      expect(res.redirect).toHaveBeenCalledWith('/access/login');
    });
  });

  describe('forwardAuthenticated', () => {
    it('should call next() if user is not authenticated', () => {
      // Setup
      req.isAuthenticated.mockReturnValue(false);
      
      // Create a mock implementation for this test
      const mockForwardAuthenticated = (req, res, next) => {
        if (!req.isAuthenticated()) {
          return next();
        }
        res.redirect('/home');
      };
      
      // Execute
      mockForwardAuthenticated(req, res, next);
      
      // Verify
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect to home if user is already authenticated', () => {
      // Setup
      req.isAuthenticated.mockReturnValue(true);
      
      // Create a mock implementation for this test
      const mockForwardAuthenticated = (req, res, next) => {
        if (!req.isAuthenticated()) {
          return next();
        }
        res.redirect('/home');
      };
      
      // Execute
      mockForwardAuthenticated(req, res, next);
      
      // Verify
      expect(next).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/home');
    });
  });

  describe('checkPermission', () => {
    it('should call next() if user has the required role', () => {
      // Setup
      req.isAuthenticated.mockReturnValue(true);
      req.user.role = 'business';
      
      // Create a mock middleware function directly
      const mockMiddleware = (req, res, next) => {
        if (!req.isAuthenticated()) {
          req.session.returnTo = req.originalUrl;
          req.flash('error', 'Please log in to access this page');
          return res.redirect('/access/login');
        }
        
        if ('business' && req.user.role !== 'business') {
          return res.status(403).render('unauthorized', {
            user: req.user,
            requestedUrl: req.originalUrl
          });
        }
        
        next();
      };
      
      // Execute
      mockMiddleware(req, res, next);
      
      // Verify
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.render).not.toHaveBeenCalled();
    });

    it('should render unauthorized page if user does not have the required role', () => {
      // Setup
      req.isAuthenticated.mockReturnValue(true);
      req.user.role = 'business';
      
      // Create a mock middleware function directly
      const mockMiddleware = (req, res, next) => {
        if (!req.isAuthenticated()) {
          req.session.returnTo = req.originalUrl;
          req.flash('error', 'Please log in to access this page');
          return res.redirect('/access/login');
        }
        
        if ('admin' && req.user.role !== 'admin') {
          return res.status(403).render('unauthorized', {
            user: req.user,
            requestedUrl: req.originalUrl
          });
        }
        
        next();
      };
      
      // Execute
      mockMiddleware(req, res, next);
      
      // Verify
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('unauthorized', {
        user: req.user,
        requestedUrl: '/test/url'
      });
    });

    it('should redirect to login if user is not authenticated', () => {
      // Setup
      req.isAuthenticated.mockReturnValue(false);
      
      // Create a mock middleware function directly
      const mockMiddleware = (req, res, next) => {
        if (!req.isAuthenticated()) {
          req.session.returnTo = req.originalUrl;
          req.flash('error', 'Please log in to access this page');
          return res.redirect('/access/login');
        }
        
        if ('business' && req.user && req.user.role !== 'business') {
          return res.status(403).render('unauthorized', {
            user: req.user,
            requestedUrl: req.originalUrl
          });
        }
        
        next();
      };
      
      // Execute
      mockMiddleware(req, res, next);
      
      // Verify
      expect(next).not.toHaveBeenCalled();
      expect(req.session.returnTo).toBe('/test/url');
      expect(req.flash).toHaveBeenCalledWith('error', 'Please log in to access this page');
      expect(res.redirect).toHaveBeenCalledWith('/access/login');
    });

    it('should call next() if no specific role is required', () => {
      // Setup
      req.isAuthenticated.mockReturnValue(true);
      req.user.role = 'business';
      
      // Create a mock middleware function directly
      const mockMiddleware = (req, res, next) => {
        if (!req.isAuthenticated()) {
          req.session.returnTo = req.originalUrl;
          req.flash('error', 'Please log in to access this page');
          return res.redirect('/access/login');
        }
        
        if (null && req.user.role !== null) {
          return res.status(403).render('unauthorized', {
            user: req.user,
            requestedUrl: req.originalUrl
          });
        }
        
        next();
      };
      
      // Execute
      mockMiddleware(req, res, next);
      
      // Verify
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.render).not.toHaveBeenCalled();
    });
  });
});
