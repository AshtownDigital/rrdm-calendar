const request = require('supertest');
const express = require('express');
const path = require('path');

// Mock the BCR model
jest.mock('../../models', () => {
  const mockBCR = {
    id: 'bcr-123',
    title: 'Test BCR',
    description: 'Test description',
    status: 'draft',
    priority: 'medium',
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    getFormattedId: jest.fn().mockReturnValue('BCR-001')
  };
  
  return {
    BCR: {
      findAll: jest.fn().mockResolvedValue([mockBCR]),
      findOne: jest.fn().mockResolvedValue(mockBCR),
      findByPk: jest.fn().mockResolvedValue(mockBCR),
      create: jest.fn().mockResolvedValue(mockBCR),
      update: jest.fn().mockResolvedValue([1]),
      destroy: jest.fn().mockResolvedValue(1)
    }
  };
});

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => {
  return {
    ensureAuthenticated: (req, res, next) => next(),
    ensureAdmin: (req, res, next) => next(),
    checkPermission: (permission) => (req, res, next) => next()
  };
});

// Mock the user utils
jest.mock('../../utils/user-utils', () => {
  return {
    getUserById: jest.fn().mockResolvedValue({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'business'
    }),
    hasPermission: jest.fn().mockReturnValue(true)
  };
});

describe('Business Change Request (BCR) Module', () => {
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
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'business'
      },
      params: {},
      query: {},
      body: {},
      flash: jest.fn()
    };
    
    mockRes = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      render: jest.fn(),
      json: jest.fn()
    };
  });

  describe('BCR Dashboard', () => {
    it('should render the BCR dashboard page', async () => {
      // Import the route handler
      const { renderDashboard } = require('../../routes/bcr/dashboard');
      
      // Mock the BCR model to return some data
      const { BCR } = require('../../models');
      BCR.findAll.mockResolvedValue([{
        id: 'bcr-123',
        title: 'Test BCR',
        description: 'Test description',
        status: 'draft',
        priority: 'medium',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
      
      // Call the route handler
      await renderDashboard(mockReq, mockRes);
      
      // Verify that the correct template is rendered
      expect(mockRes.render).toHaveBeenCalledWith(
        'modules/bcr/dashboard',
        expect.objectContaining({
          title: 'Business Change Requests',
          bcrs: expect.any(Array),
          statusColors: expect.any(Object),
          priorityColors: expect.any(Object)
        })
      );
    });
  });

  describe('BCR Creation', () => {
    it('should render the BCR creation page', () => {
      // Import the route handler
      const { renderCreateForm } = require('../../routes/bcr/create');
      
      // Call the route handler
      renderCreateForm(mockReq, mockRes);
      
      // Verify that the correct template is rendered
      expect(mockRes.render).toHaveBeenCalledWith(
        'modules/bcr/create',
        expect.objectContaining({
          title: 'Create Business Change Request'
        })
      );
    });

    it('should create a new BCR', async () => {
      // Import the route handler
      const { createBCR } = require('../../routes/bcr/create');
      
      // Mock the BCR model to return a new BCR
      const { BCR } = require('../../models');
      const mockBCR = {
        id: 'bcr-new',
        title: 'New BCR',
        description: 'Test description',
        priority: 'high',
        targetDate: '2023-12-31',
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      BCR.create.mockResolvedValue(mockBCR);
      
      // Set up the request body
      mockReq.body = {
        title: 'New BCR',
        description: 'Test description',
        priority: 'high',
        targetDate: '2023-12-31'
      };
      
      // Add redirect method to mockRes
      mockRes.redirect = jest.fn();
      
      // Call the route handler
      await createBCR(mockReq, mockRes);
      
      // Verify that the user was redirected
      expect(mockRes.redirect).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith(`/bcr/${mockBCR.id}`);
    });
  });
  
  describe('BCR Viewing', () => {
    it('should render a single BCR', async () => {
      // Import the route handler
      const { viewBCR } = require('../../routes/bcr/view');
      
      // Mock the BCR model to return a specific BCR
      const { BCR } = require('../../models');
      const mockBCR = {
        id: 'bcr-123',
        title: 'Test BCR',
        description: 'Test description',
        status: 'draft',
        priority: 'medium',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      BCR.findByPk.mockResolvedValue(mockBCR);
      
      // Set up the request parameters
      mockReq.params.id = 'bcr-123';
      
      // Call the route handler
      await viewBCR(mockReq, mockRes);
      
      // Verify that the correct template is rendered
      expect(mockRes.render).toHaveBeenCalledWith(
        'modules/bcr/view',
        expect.objectContaining({
          title: expect.stringContaining('BCR:'),
          bcr: expect.objectContaining({
            id: 'bcr-123',
            title: 'Test BCR'
          }),
          statusColors: expect.any(Object),
          priorityColors: expect.any(Object)
        })
      );
    });
  });
  
  describe('BCR Update', () => {
    it('should update a BCR status', async () => {
      // Import the route handler
      const { updateBCRStatus } = require('../../routes/bcr/update');
      
      // Mock the BCR model
      const { BCR } = require('../../models');
      BCR.findByPk.mockResolvedValue({
        id: 'bcr-123',
        title: 'Test BCR',
        description: 'Test description',
        status: 'draft',
        priority: 'medium',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Set up the request parameters and body
      mockReq.params.id = 'bcr-123';
      mockReq.body = {
        status: 'approved',
        comment: 'Approved by test'
      };
      
      // Add redirect and xhr properties to mockReq and mockRes
      mockReq.xhr = false;
      mockRes.redirect = jest.fn();
      
      // Call the route handler
      await updateBCRStatus(mockReq, mockRes);
      
      // Verify that the BCR was updated
      expect(BCR.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          lastComment: 'Approved by test',
          updatedBy: mockReq.user.id
        }),
        expect.objectContaining({
          where: { id: 'bcr-123' }
        })
      );
      
      // Verify that the user was redirected
      expect(mockRes.redirect).toHaveBeenCalledWith('/bcr/bcr-123');
    });
  });
});
