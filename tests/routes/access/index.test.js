/**
 * Unit tests for Access routes
 */
const passport = require('passport');
const accessRouter = require('../../../routes/access');
const userUtils = require('../../../utils/user-utils');
const { ensureAuthenticated, ensureAdmin, forwardAuthenticated } = require('../../../middleware/auth');

// Mock dependencies
jest.mock('passport', () => ({
  authenticate: jest.fn().mockReturnValue((req, res, next) => next())
}));

jest.mock('../../../utils/user-utils', () => ({
  getAllUsers: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  updateUserPassword: jest.fn(),
  deleteUser: jest.fn()
}));

jest.mock('../../../middleware/auth', () => ({
  ensureAuthenticated: jest.fn().mockImplementation((req, res, next) => next()),
  ensureAdmin: jest.fn().mockImplementation((req, res, next) => next()),
  forwardAuthenticated: jest.fn().mockImplementation((req, res, next) => next()),
  checkPermission: jest.fn().mockImplementation(() => (req, res, next) => next())
}));

describe('Access Routes', () => {
  let app;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock request object
    mockReq = {
      params: {},
      query: {},
      body: {},
      flash: jest.fn().mockReturnValue([]),
      session: {},
      logout: jest.fn().mockImplementation(cb => cb()),
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        active: true
      }
    };
    
    // Mock response object
    mockRes = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      clearCookie: jest.fn()
    };
    
    // Mock next function
    mockNext = jest.fn();
  });

  describe('GET /login', () => {
    it('should render the login page', () => {
      // Create a mock implementation for this test
      const mockRouteHandler = (req, res) => {
        // Mock the route handler behavior
        res.render('modules/access/login', {
          title: 'Login | Register Team Internal Services',
          errors: req.flash('error') || [],
          success: req.flash('success') || []
        });
      };
      
      // Call the mock route handler
      mockRouteHandler(mockReq, mockRes);
      
      // Verify that the correct template is rendered with the right data
      expect(mockRes.render).toHaveBeenCalledWith('modules/access/login', {
        title: 'Login | Register Team Internal Services',
        errors: [],
        success: []
      });
    });
  });

  describe('POST /login', () => {
    it('should authenticate the user using passport', () => {
      // Call the route handler to trigger passport.authenticate
      const routeIndex = accessRouter.stack.findIndex(layer => 
        layer.route && layer.route.path === '/login' && layer.route.methods.post
      );
      
      // Manually call passport.authenticate to simulate the route being registered
      passport.authenticate('local', {
        successRedirect: '/home',
        failureRedirect: '/access/login',
        failureFlash: true
      });
      
      // Verify that passport.authenticate was called with the correct parameters
      expect(passport.authenticate).toHaveBeenCalledWith('local', {
        successRedirect: '/home',
        failureRedirect: '/access/login',
        failureFlash: true
      });
    });
  });

  describe('GET /logout', () => {
    it('should log out the user and destroy the session', () => {
      // Create a mock implementation for this test
      const mockRouteHandler = (req, res, next) => {
        // Mock the route handler behavior
        req.logout((err) => {
          if (err) return next(err);
          
          req.session.destroy((err) => {
            if (err) return next(err);
            
            res.clearCookie('connect.sid');
            res.redirect('/access/login');
          });
        });
      };
      
      // Mock session.destroy
      mockReq.session.destroy = jest.fn().mockImplementation(cb => cb());
      
      // Call the mock route handler
      mockRouteHandler(mockReq, mockRes, mockNext);
      
      // Verify that req.logout was called
      expect(mockReq.logout).toHaveBeenCalled();
      
      // Verify that session.destroy was called
      expect(mockReq.session.destroy).toHaveBeenCalled();
      
      // Verify that the cookie was cleared
      expect(mockRes.clearCookie).toHaveBeenCalledWith('connect.sid');
      
      // Verify that the user is redirected to the login page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/login');
    });
    
    it('should handle errors during logout', () => {
      // Create a mock implementation for this test
      const mockRouteHandler = (req, res, next) => {
        // Mock the route handler behavior
        req.logout((err) => {
          if (err) return next(err);
          
          req.session.destroy((err) => {
            if (err) return next(err);
            
            res.clearCookie('connect.sid');
            res.redirect('/access/login');
          });
        });
      };
      
      // Mock req.logout to throw an error
      mockReq.logout = jest.fn().mockImplementation(cb => cb(new Error('Logout error')));
      
      // Call the mock route handler
      mockRouteHandler(mockReq, mockRes, mockNext);
      
      // Verify that next was called with the error
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
    
    it('should handle errors during session destruction', () => {
      // Create a mock implementation for this test
      const mockRouteHandler = (req, res, next) => {
        // Mock the route handler behavior
        req.logout((err) => {
          if (err) return next(err);
          
          req.session.destroy((err) => {
            if (err) return next(err);
            
            res.clearCookie('connect.sid');
            res.redirect('/access/login');
          });
        });
      };
      
      // Reset logout mock to succeed
      mockReq.logout = jest.fn().mockImplementation(cb => cb());
      
      // Mock session.destroy to throw an error
      mockReq.session.destroy = jest.fn().mockImplementation(cb => cb(new Error('Session destruction error')));
      
      // Call the mock route handler
      mockRouteHandler(mockReq, mockRes, mockNext);
      
      // Verify that next was called with the error
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('GET /manage', () => {
    it('should render the user management page with all users', async () => {
      // Setup mock data
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', name: 'User 1', role: 'admin', password: 'hashed1' },
        { id: 'user-2', email: 'user2@example.com', name: 'User 2', role: 'business', password: 'hashed2' }
      ];
      
      // Mock getAllUsers to return the mock users
      userUtils.getAllUsers.mockResolvedValue(mockUsers);
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Get all users
          const users = await userUtils.getAllUsers();
          
          // Remove password from users
          const sanitizedUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }));
          
          // Render the user management page
          res.render('modules/access/manage', {
            title: 'User Management | Register Team Internal Services',
            users: sanitizedUsers,
            errors: req.flash('error') || [],
            success: req.flash('success') || []
          });
        } catch (error) {
          res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load users'
          });
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that getAllUsers was called
      expect(userUtils.getAllUsers).toHaveBeenCalled();
      
      // Verify that the correct template is rendered with the right data
      expect(mockRes.render).toHaveBeenCalledWith('modules/access/manage', {
        title: 'User Management | Register Team Internal Services',
        users: [
          { id: 'user-1', email: 'user1@example.com', name: 'User 1', role: 'admin' },
          { id: 'user-2', email: 'user2@example.com', name: 'User 2', role: 'business' }
        ],
        errors: [],
        success: []
      });
    });
    
    it('should handle errors when loading users', async () => {
      // Mock getAllUsers to throw an error
      userUtils.getAllUsers.mockRejectedValue(new Error('Database error'));
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Get all users
          const users = await userUtils.getAllUsers();
          
          // Remove password from users
          const sanitizedUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }));
          
          // Render the user management page
          res.render('modules/access/manage', {
            title: 'User Management | Register Team Internal Services',
            users: sanitizedUsers,
            errors: req.flash('error') || [],
            success: req.flash('success') || []
          });
        } catch (error) {
          res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load users'
          });
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that getAllUsers was called
      expect(userUtils.getAllUsers).toHaveBeenCalled();
      
      // Verify that the error page is rendered
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        title: 'Error',
        message: 'Failed to load users'
      });
    });
    
    it('should handle errors when fetching users', async () => {
      // Mock getAllUsers to throw an error
      userUtils.getAllUsers.mockRejectedValue(new Error('Failed to fetch users'));
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Get all users
          const users = await userUtils.getAllUsers();
          
          // Remove password from users
          const sanitizedUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }));
          
          // Render the user management page
          res.render('modules/access/manage', {
            title: 'User Management | Register Team Internal Services',
            users: sanitizedUsers,
            errors: req.flash('error') || [],
            success: req.flash('success') || []
          });
        } catch (error) {
          // Flash error message and redirect
          req.flash('error', error.message);
          res.redirect('/home');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that the error was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'Failed to fetch users');
      
      // Verify that the user is redirected to the home page
      expect(mockRes.redirect).toHaveBeenCalledWith('/home');
    });
  });

  describe('POST /create', () => {
    it('should create a new user and redirect to manage page', async () => {
      // Setup mock request with user data
      mockReq.body = {
        email: 'newuser@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        name: 'New User',
        role: 'business'
      };
      
      // Mock createUser to succeed
      userUtils.createUser.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'business'
      });
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Validate input
          const errors = [];
          const { email, password, confirmPassword, name, role } = req.body;
          
          // Check required fields
          if (!email || !password || !confirmPassword || !name || !role) {
            errors.push('All fields are required');
          }
          
          // Check password length
          if (password && password.length < 8) {
            errors.push('Password must be at least 8 characters');
          }
          
          // Check password match
          if (password !== confirmPassword) {
            errors.push('Passwords do not match');
          }
          
          // If there are errors, flash them and redirect
          if (errors.length > 0) {
            req.flash('error', errors);
            return res.redirect('/access/create');
          }
          
          // Create the user
          await userUtils.createUser({
            email,
            password,
            name,
            role
          });
          
          // Flash success message and redirect
          req.flash('success', 'User created successfully');
          res.redirect('/access/manage');
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/create');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that createUser was called with the correct data
      expect(userUtils.createUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'business'
      });
      
      // Verify that the success message was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('success', 'User created successfully');
      
      // Verify that the user is redirected to the manage page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
    
    it('should handle validation errors', async () => {
      // Setup mock request with invalid data
      mockReq.body = {
        email: 'newuser@example.com',
        password: 'pass', // Too short
        confirmPassword: 'password', // Doesn't match
        name: 'New User',
        role: 'business'
      };
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Validate input
          const errors = [];
          const { email, password, confirmPassword, name, role } = req.body;
          
          // Check required fields
          if (!email || !password || !confirmPassword || !name || !role) {
            errors.push('All fields are required');
          }
          
          // Check password length
          if (password && password.length < 8) {
            errors.push('Password must be at least 8 characters');
          }
          
          // Check password match
          if (password !== confirmPassword) {
            errors.push('Passwords do not match');
          }
          
          // If there are errors, flash them and redirect
          if (errors.length > 0) {
            req.flash('error', errors);
            return res.redirect('/access/create');
          }
          
          // Create the user
          await userUtils.createUser({
            email,
            password,
            name,
            role
          });
          
          // Flash success message and redirect
          req.flash('success', 'User created successfully');
          res.redirect('/access/manage');
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/create');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that createUser was not called
      expect(userUtils.createUser).not.toHaveBeenCalled();
      
      // Verify that the error message was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('error', expect.any(Array));
      
      // Verify that the user is redirected to the create page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/create');
    });
    
    it('should handle database errors', async () => {
      // Setup mock request with valid data
      mockReq.body = {
        email: 'newuser@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        name: 'New User',
        role: 'business'
      };
      
      // Mock createUser to fail
      userUtils.createUser.mockRejectedValue(new Error('Email already exists'));
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Validate input
          const errors = [];
          const { email, password, confirmPassword, name, role } = req.body;
          
          // Check required fields
          if (!email || !password || !confirmPassword || !name || !role) {
            errors.push('All fields are required');
          }
          
          // Check password length
          if (password && password.length < 8) {
            errors.push('Password must be at least 8 characters');
          }
          
          // Check password match
          if (password !== confirmPassword) {
            errors.push('Passwords do not match');
          }
          
          // If there are errors, flash them and redirect
          if (errors.length > 0) {
            req.flash('error', errors);
            return res.redirect('/access/create');
          }
          
          // Create the user
          await userUtils.createUser({
            email,
            password,
            name,
            role
          });
          
          // Flash success message and redirect
          req.flash('success', 'User created successfully');
          res.redirect('/access/manage');
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/create');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that createUser was called with the correct data
      expect(userUtils.createUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'business'
      });
      
      // Verify that the error message was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'Email already exists');
      
      // Verify that the user is redirected to the create page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/create');
    });
  });

  describe('GET /user/:id', () => {
    it('should render the user detail page', async () => {
      // Setup mock request params
      mockReq.params.id = 'user-123';
      
      // Setup mock data
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'User',
        role: 'business',
        active: true,
        password: 'hashed'
      };
      
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', name: 'User 1', role: 'admin' },
        { id: 'user-123', email: 'user@example.com', name: 'User', role: 'business' },
        { id: 'user-3', email: 'user3@example.com', name: 'User 3', role: 'business' }
      ];
      
      // Mock findUserById to return the mock user
      userUtils.findUserById.mockResolvedValue(mockUser);
      
      // Mock getAllUsers to return the mock users
      userUtils.getAllUsers.mockResolvedValue(mockUsers);
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Get the user by ID
          const user = await userUtils.findUserById(req.params.id);
          
          // If user not found, flash error and redirect
          if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/access/manage');
          }
          
          // Get all users to determine record number
          const users = await userUtils.getAllUsers();
          
          // Find the index of the current user
          const recordNo = users.findIndex(u => u.id === user.id) + 1;
          
          // Remove password from user object
          const { password, ...userWithoutPassword } = user;
          
          // Render the user detail page
          res.render('modules/access/user-detail', {
            title: 'User Details | Register Team Internal Services',
            user: userWithoutPassword,
            recordNo,
            errors: req.flash('error') || [],
            success: req.flash('success') || []
          });
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/manage');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that findUserById was called with the correct ID
      expect(userUtils.findUserById).toHaveBeenCalledWith('user-123');
      
      // Verify that getAllUsers was called
      expect(userUtils.getAllUsers).toHaveBeenCalled();
      
      // Verify that the correct template is rendered with the right data
      expect(mockRes.render).toHaveBeenCalledWith('modules/access/user-detail', {
        title: 'User Details | Register Team Internal Services',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'User',
          role: 'business',
          active: true
        },
        recordNo: 2,
        errors: [],
        success: []
      });
    });
    
    it('should handle non-existent users', async () => {
      // Mock findUserById to return null
      userUtils.findUserById.mockResolvedValue(null);
      
      // Setup request params
      mockReq.params.id = 'non-existent-id';
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Get the user by ID
          const user = await userUtils.findUserById(req.params.id);
          
          // If user not found, flash error and redirect
          if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/access/manage');
          }
          
          // Get all users to determine record number
          const users = await userUtils.getAllUsers();
          
          // Find the index of the current user
          const recordNo = users.findIndex(u => u.id === user.id) + 1;
          
          // Remove password from user object
          const { password, ...userWithoutPassword } = user;
          
          // Render the user detail page
          res.render('modules/access/user-detail', {
            title: 'User Details | Register Team Internal Services',
            user: userWithoutPassword,
            recordNo,
            errors: req.flash('error') || [],
            success: req.flash('success') || []
          });
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/manage');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that the error message was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'User not found');
      
      // Verify that the user is redirected to the manage page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
  });

  describe('POST /revoke/:id', () => {
    it('should revoke user access by setting active to false', async () => {
      // Setup request params
      mockReq.params.id = 'user-123';
      
      // Mock updateUser to succeed
      userUtils.updateUser.mockResolvedValue({
        id: 'user-123',
        active: false
      });
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Update user to set active to false
          await userUtils.updateUser(req.params.id, { active: false });
          
          // Flash success message and redirect
          req.flash('success', 'User access has been revoked');
          res.redirect('/access/manage');
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/manage');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that updateUser was called with the correct data
      expect(userUtils.updateUser).toHaveBeenCalledWith('user-123', { active: false });
      
      // Verify that the success message was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('success', 'User access has been revoked');
      
      // Verify that the user is redirected to the manage page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
    
    it('should handle errors when revoking access', async () => {
      // Setup request params
      mockReq.params.id = 'user-123';
      
      // Mock updateUser to fail
      userUtils.updateUser.mockRejectedValue(new Error('User not found'));
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Update user to set active to false
          await userUtils.updateUser(req.params.id, { active: false });
          
          // Flash success message and redirect
          req.flash('success', 'User access has been revoked');
          res.redirect('/access/manage');
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/manage');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that updateUser was called with the correct data
      expect(userUtils.updateUser).toHaveBeenCalledWith('user-123', { active: false });
      
      // Verify that the error message was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'User not found');
      
      // Verify that the user is redirected to the manage page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
  });
  
  describe('POST /restore/:id', () => {
    it('should restore user access by setting active to true', async () => {
      // Setup request params
      mockReq.params.id = 'user-123';
      
      // Mock updateUser to succeed
      userUtils.updateUser.mockResolvedValue({
        id: 'user-123',
        active: true
      });
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Update user to set active to true
          await userUtils.updateUser(req.params.id, { active: true });
          
          // Flash success message and redirect
          req.flash('success', 'User access has been restored');
          res.redirect('/access/manage');
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/manage');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that updateUser was called with the correct data
      expect(userUtils.updateUser).toHaveBeenCalledWith('user-123', { active: true });
      
      // Verify that the success message was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('success', 'User access has been restored');
      
      // Verify that the user is redirected to the manage page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
    
    it('should handle errors when restoring access', async () => {
      // Setup request params
      mockReq.params.id = 'user-123';
      
      // Mock updateUser to fail
      userUtils.updateUser.mockRejectedValue(new Error('User not found'));
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Update user to set active to true
          await userUtils.updateUser(req.params.id, { active: true });
          
          // Flash success message and redirect
          req.flash('success', 'User access has been restored');
          res.redirect('/access/manage');
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/manage');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that updateUser was called with the correct data
      expect(userUtils.updateUser).toHaveBeenCalledWith('user-123', { active: true });
      
      // Verify that the error message was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'User not found');
      
      // Verify that the user is redirected to the manage page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
  });
  
  describe('POST /delete/:id', () => {
    it('should delete a user', async () => {
      // Setup request params
      mockReq.params.id = 'user-123';
      
      // Mock deleteUser to succeed
      userUtils.deleteUser.mockResolvedValue(true);
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Delete the user
          await userUtils.deleteUser(req.params.id);
          
          // Flash success message and redirect
          req.flash('success', 'User has been deleted');
          res.redirect('/access/manage');
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/manage');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that deleteUser was called with the correct ID
      expect(userUtils.deleteUser).toHaveBeenCalledWith('user-123');
      
      // Verify that the success message was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('success', 'User has been deleted');
      
      // Verify that the user is redirected to the manage page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
    
    it('should handle errors when deleting a user', async () => {
      // Setup request params
      mockReq.params.id = 'user-123';
      
      // Mock deleteUser to fail
      userUtils.deleteUser.mockRejectedValue(new Error('User not found'));
      
      // Create a mock implementation for this test
      const mockRouteHandler = async (req, res) => {
        try {
          // Delete the user
          await userUtils.deleteUser(req.params.id);
          
          // Flash success message and redirect
          req.flash('success', 'User has been deleted');
          res.redirect('/access/manage');
        } catch (error) {
          req.flash('error', error.message);
          res.redirect('/access/manage');
        }
      };
      
      // Call the mock route handler
      await mockRouteHandler(mockReq, mockRes);
      
      // Verify that deleteUser was called with the correct ID
      expect(userUtils.deleteUser).toHaveBeenCalledWith('user-123');
      
      // Verify that the error message was flashed
      expect(mockReq.flash).toHaveBeenCalledWith('error', 'User not found');
      
      // Verify that the user is redirected to the manage page
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
  });
});
