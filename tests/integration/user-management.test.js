const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Mock the models
jest.mock('../../models', () => {
  const mockUsers = [
    {
      id: 'admin-123',
      email: 'admin@test.com',
      name: 'Admin User',
      password: 'hashedPassword',
      role: 'admin',
      active: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'user-123',
      email: 'user@test.com',
      name: 'Regular User',
      password: 'hashedPassword',
      role: 'business',
      active: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  return {
    User: {
      findAll: jest.fn().mockResolvedValue(mockUsers),
      findOne: jest.fn().mockImplementation((query) => {
        const email = query.where.email;
        return Promise.resolve(mockUsers.find(user => user.email === email) || null);
      }),
      findByPk: jest.fn().mockImplementation((id) => {
        return Promise.resolve(mockUsers.find(user => user.id === id) || null);
      }),
      create: jest.fn().mockImplementation((data) => {
        const newUser = {
          id: uuidv4(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockUsers.push(newUser);
        return Promise.resolve(newUser);
      }),
      update: jest.fn().mockResolvedValue([1]),
      destroy: jest.fn().mockResolvedValue(1)
    }
  };
});

// Mock bcrypt
jest.mock('bcryptjs', () => {
  return {
    genSalt: jest.fn().mockResolvedValue('mock-salt'),
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn().mockImplementation((plainPassword, hashedPassword) => {
      return Promise.resolve(plainPassword === 'correctPassword');
    })
  };
});

// Mock passport
jest.mock('passport', () => {
  return {
    authenticate: jest.fn().mockImplementation(() => {
      return (req, res, next) => {
        req.user = {
          id: 'admin-123',
          email: 'admin@test.com',
          role: 'admin'
        };
        next();
      };
    }),
    initialize: jest.fn().mockReturnValue((req, res, next) => next()),
    session: jest.fn().mockReturnValue((req, res, next) => next())
  };
});

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => {
  return {
    ensureAuthenticated: (req, res, next) => {
      if (req.user) {
        return next();
      }
      res.redirect('/access/login');
    },
    ensureAdmin: (req, res, next) => {
      if (req.user && req.user.role === 'admin') {
        return next();
      }
      res.status(403).send('Forbidden');
    },
    checkPermission: (permission) => (req, res, next) => next()
  };
});

// Mock user utils
jest.mock('../../utils/user-utils', () => {
  return {
    getUserById: jest.fn().mockResolvedValue({
      id: 'admin-123',
      email: 'admin@test.com',
      role: 'admin'
    }),
    hasPermission: jest.fn().mockReturnValue(true)
  };
});

// Mock db user utils
jest.mock('../../utils/db-user-utils', () => {
  return {
    getAllUsers: jest.fn().mockResolvedValue([
      {
        id: 'admin-123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        active: true
      },
      {
        id: 'user-123',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'business',
        active: true
      }
    ]),
    findUserByEmail: jest.fn().mockImplementation((email) => {
      const users = [
        {
          id: 'admin-123',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'admin',
          active: true
        },
        {
          id: 'user-123',
          email: 'user@test.com',
          name: 'Regular User',
          role: 'business',
          active: true
        }
      ];
      return Promise.resolve(users.find(user => user.email === email) || null);
    }),
    findUserById: jest.fn().mockImplementation((id) => {
      const users = [
        {
          id: 'admin-123',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'admin',
          active: true
        },
        {
          id: 'user-123',
          email: 'user@test.com',
          name: 'Regular User',
          role: 'business',
          active: true
        }
      ];
      return Promise.resolve(users.find(user => user.id === id) || null);
    }),
    createUser: jest.fn().mockImplementation((userData) => {
      return Promise.resolve({
        id: uuidv4(),
        ...userData,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }),
    updateUser: jest.fn().mockResolvedValue(true),
    toggleUserActive: jest.fn().mockResolvedValue(true),
    deleteUser: jest.fn().mockResolvedValue(true),
    updateLastLogin: jest.fn().mockResolvedValue(true)
  };
});

describe('User Management Integration', () => {
  let app;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a new Express app for each test
    app = express();
    
    // Mock request and response objects
    mockReq = {
      user: {
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'admin'
      },
      params: {},
      query: {},
      body: {},
      flash: jest.fn(),
      session: {
        destroy: jest.fn((callback) => callback())
      }
    };
    
    mockRes = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      render: jest.fn(),
      json: jest.fn()
    };
  });

  describe('User Listing', () => {
    it('should display all users', async () => {
      // Import the route handler
      const { manageUsers } = require('../../routes/access/manage');
      
      // Call the route handler
      await manageUsers(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.render).toHaveBeenCalledWith(
        'access/manage',
        expect.objectContaining({
          title: 'User Management',
          users: expect.arrayContaining([
            expect.objectContaining({
              email: 'admin@test.com',
              role: 'admin'
            }),
            expect.objectContaining({
              email: 'user@test.com',
              role: 'business'
            })
          ])
        })
      );
    });
  });

  describe('User Creation', () => {
    it('should create a new user', async () => {
      // Import the route handler
      const { createUser } = require('../../routes/access/create');
      
      // Set up the request body
      mockReq.body = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'business'
      };
      
      // Call the route handler
      await createUser(mockReq, mockRes);
      
      // Verify the user was created
      const dbUserUtils = require('../../utils/db-user-utils');
      expect(dbUserUtils.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          name: 'New User',
          role: 'business'
        })
      );
      
      // Verify the redirect
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });

    it('should validate required fields', async () => {
      // Import the route handler
      const { createUser } = require('../../routes/access/create');
      
      // Set up the request body with missing fields
      mockReq.body = {};
      
      // Call the route handler
      await createUser(mockReq, mockRes);
      
      // Verify the flash message
      expect(mockReq.flash).toHaveBeenCalledWith('error', expect.any(String));
      
      // Verify the redirect back to the form
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/create');
    });
  });

  describe('User Deactivation', () => {
    it('should deactivate a user', async () => {
      // Import the route handler
      const { revokeUser } = require('../../routes/access/manage');
      
      // Set up the request parameters
      mockReq.params.id = 'user-123';
      
      // Call the route handler
      await revokeUser(mockReq, mockRes);
      
      // Verify the user was deactivated
      const dbUserUtils = require('../../utils/db-user-utils');
      expect(dbUserUtils.toggleUserActive).toHaveBeenCalledWith('user-123', false);
      
      // Verify the redirect
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
  });

  describe('User Reactivation', () => {
    it('should reactivate a user', async () => {
      // Import the route handler
      const { restoreUser } = require('../../routes/access/manage');
      
      // Set up the request parameters
      mockReq.params.id = 'user-123';
      
      // Call the route handler
      await restoreUser(mockReq, mockRes);
      
      // Verify the user was reactivated
      const dbUserUtils = require('../../utils/db-user-utils');
      expect(dbUserUtils.toggleUserActive).toHaveBeenCalledWith('user-123', true);
      
      // Verify the redirect
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
  });

  describe('User Deletion', () => {
    it('should delete a user', async () => {
      // Import the route handler
      const { deleteUser } = require('../../routes/access/manage');
      
      // Set up the request parameters
      mockReq.params.id = 'user-123';
      
      // Call the route handler
      await deleteUser(mockReq, mockRes);
      
      // Verify the user was deleted
      const dbUserUtils = require('../../utils/db-user-utils');
      expect(dbUserUtils.deleteUser).toHaveBeenCalledWith('user-123');
      
      // Verify the redirect
      expect(mockRes.redirect).toHaveBeenCalledWith('/access/manage');
    });
  });
});
