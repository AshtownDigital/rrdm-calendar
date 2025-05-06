const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Mock the models
jest.mock('../../models', () => {
  const mockReferenceData = [
    {
      id: 'ref-123',
      name: 'Test Item',
      type: 'test',
      description: 'Test description',
      createdBy: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'ref-456',
      name: 'Another Item',
      type: 'another',
      description: 'Another description',
      createdBy: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const mockReferenceValues = [
    {
      id: 'val-123',
      referenceDataId: 'ref-123',
      value: 'Test Value 1',
      description: 'Test value description',
      active: true,
      createdBy: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'val-456',
      referenceDataId: 'ref-123',
      value: 'Test Value 2',
      description: 'Another value description',
      active: true,
      createdBy: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  return {
    ReferenceData: {
      findAll: jest.fn().mockResolvedValue(mockReferenceData),
      findOne: jest.fn().mockImplementation((query) => {
        const id = query.where.id;
        return Promise.resolve(mockReferenceData.find(item => item.id === id) || null);
      }),
      findByPk: jest.fn().mockImplementation((id) => {
        return Promise.resolve(mockReferenceData.find(item => item.id === id) || null);
      }),
      create: jest.fn().mockImplementation((data) => {
        const newItem = {
          id: uuidv4(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockReferenceData.push(newItem);
        return Promise.resolve(newItem);
      }),
      update: jest.fn().mockResolvedValue([1]),
      destroy: jest.fn().mockResolvedValue(1)
    },
    ReferenceValue: {
      findAll: jest.fn().mockImplementation((query) => {
        const referenceDataId = query.where.referenceDataId;
        if (referenceDataId) {
          return Promise.resolve(mockReferenceValues.filter(value => value.referenceDataId === referenceDataId));
        }
        return Promise.resolve(mockReferenceValues);
      }),
      findOne: jest.fn().mockImplementation((query) => {
        const id = query.where.id;
        return Promise.resolve(mockReferenceValues.find(value => value.id === id) || null);
      }),
      findByPk: jest.fn().mockImplementation((id) => {
        return Promise.resolve(mockReferenceValues.find(value => value.id === id) || null);
      }),
      create: jest.fn().mockImplementation((data) => {
        const newValue = {
          id: uuidv4(),
          ...data,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockReferenceValues.push(newValue);
        return Promise.resolve(newValue);
      }),
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

// Mock user utils
jest.mock('../../utils/user-utils', () => {
  return {
    getUserById: jest.fn().mockResolvedValue({
      id: 'user-123',
      email: 'user@test.com',
      role: 'business'
    }),
    hasPermission: jest.fn().mockReturnValue(true)
  };
});

describe('Reference Data Module', () => {
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

  describe('Reference Data Dashboard', () => {
    it('should render the reference data dashboard page', () => {
      // Import the route handler
      const { renderDashboard } = require('../../routes/ref-data/dashboard');
      
      // Call the route handler
      renderDashboard(mockReq, mockRes);
      
      // Verify that the correct template is rendered
      expect(mockRes.render).toHaveBeenCalledWith(
        'modules/ref-data/dashboard',
        expect.objectContaining({
          title: 'Reference Data'
        })
      );
    });
  });

  describe('Reference Data Items', () => {
    it('should render the reference data items page', async () => {
      // Import the route handler
      const { listItems } = require('../../routes/ref-data/items');
      
      // Call the route handler
      await listItems(mockReq, mockRes);
      
      // Verify that the correct template is rendered
      expect(mockRes.render).toHaveBeenCalledWith(
        'modules/ref-data/items/list',
        expect.objectContaining({
          title: 'Reference Data Items',
          items: expect.arrayContaining([
            expect.objectContaining({
              id: 'ref-123',
              name: 'Test Item'
            })
          ])
        })
      );
    });

    it('should render a specific reference data item', async () => {
      // Import the route handler
      const { viewItem } = require('../../routes/ref-data/items');
      
      // Set up the request parameters
      mockReq.params.id = 'ref-123';
      
      // Call the route handler
      await viewItem(mockReq, mockRes);
      
      // Verify that the correct template is rendered
      expect(mockRes.render).toHaveBeenCalledWith(
        'modules/ref-data/items/view',
        expect.objectContaining({
          title: 'View Reference Data Item',
          item: expect.objectContaining({
            id: 'ref-123',
            name: 'Test Item'
          })
        })
      );
    });

    it('should create a new reference data item', async () => {
      // Import the route handler
      const { createItem } = require('../../routes/ref-data/items');
      
      // Set up the request body
      mockReq.body = {
        name: 'New Item',
        type: 'new',
        description: 'New item description'
      };
      
      // Call the route handler
      await createItem(mockReq, mockRes);
      
      // Verify that the item was created
      const { ReferenceData } = require('../../models');
      expect(ReferenceData.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Item',
          type: 'new',
          description: 'New item description',
          createdBy: 'user-123'
        })
      );
      
      // Verify the redirect
      expect(mockRes.redirect).toHaveBeenCalledWith('/ref-data/items');
    });
  });

  describe('Reference Data Values', () => {
    it('should render the reference data values page', async () => {
      // Import the route handler
      const { listValues } = require('../../routes/ref-data/values');
      
      // Set up the request parameters
      mockReq.params.itemId = 'ref-123';
      
      // Call the route handler
      await listValues(mockReq, mockRes);
      
      // Verify that the correct template is rendered
      expect(mockRes.render).toHaveBeenCalledWith(
        'modules/ref-data/values/list',
        expect.objectContaining({
          title: 'Reference Data Values',
          values: expect.arrayContaining([
            expect.objectContaining({
              id: 'val-123',
              value: 'Test Value 1'
            })
          ])
        })
      );
    });

    it('should create a new reference data value', async () => {
      // Import the route handler
      const { createValue } = require('../../routes/ref-data/values');
      
      // Set up the request parameters and body
      mockReq.params.itemId = 'ref-123';
      mockReq.body = {
        value: 'New Value',
        description: 'New value description'
      };
      
      // Call the route handler
      await createValue(mockReq, mockRes);
      
      // Verify that the value was created
      const { ReferenceValue } = require('../../models');
      expect(ReferenceValue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceDataId: 'ref-123',
          value: 'New Value',
          description: 'New value description',
          createdBy: 'user-123'
        })
      );
      
      // Verify the redirect
      expect(mockRes.redirect).toHaveBeenCalledWith('/ref-data/items/ref-123/values');
    });
  });

  describe('Reference Data Release Notes', () => {
    it('should render the release notes page', async () => {
      // Import the route handler
      const { listReleaseNotes } = require('../../routes/ref-data/release-notes');
      
      // Call the route handler
      await listReleaseNotes(mockReq, mockRes);
      
      // Verify that the correct template is rendered
      expect(mockRes.render).toHaveBeenCalledWith(
        'modules/ref-data/release-notes/list',
        expect.objectContaining({
          title: 'Release Notes'
        })
      );
    });
  });

  describe('Reference Data Restore Points', () => {
    it('should render the restore points page', async () => {
      // Import the route handler
      const { listRestorePoints } = require('../../routes/ref-data/restore-points');
      
      // Call the route handler
      await listRestorePoints(mockReq, mockRes);
      
      // Verify that the correct template is rendered
      expect(mockRes.render).toHaveBeenCalledWith(
        'modules/ref-data/restore-points/list',
        expect.objectContaining({
          title: 'Restore Points'
        })
      );
    });
  });
});
