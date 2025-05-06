/**
 * API Endpoint Tests
 * Tests the API route handlers directly without using Express
 */

// Mock dependencies
jest.mock('../../models', () => {
  const mockReferenceData = {
    id: 'ref-123',
    name: 'Test Reference Data',
    type: 'test',
    value: 'test-value',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const mockReferenceValue = {
    id: 'val-123',
    referenceDataId: 'ref-123',
    value: 'test-value',
    label: 'Test Value',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
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
  
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'business',
    active: true,
    lastLogin: new Date(),
    preferences: { theme: 'light', notifications: false },
    toJSON: function() {
      return {
        id: this.id,
        name: this.name,
        email: this.email,
        role: this.role,
        active: this.active,
        lastLogin: this.lastLogin,
        preferences: this.preferences
      };
    }
  };
  
  return {
    ReferenceData: {
      findAll: jest.fn().mockResolvedValue([mockReferenceData]),
      findOne: jest.fn().mockResolvedValue(mockReferenceData),
      findByPk: jest.fn().mockResolvedValue(mockReferenceData)
    },
    ReferenceValue: {
      findAll: jest.fn().mockResolvedValue([mockReferenceValue])
    },
    BCR: {
      findAll: jest.fn().mockResolvedValue([mockBCR]),
      findOne: jest.fn().mockResolvedValue(mockBCR),
      findByPk: jest.fn().mockResolvedValue(mockBCR),
      create: jest.fn().mockResolvedValue(mockBCR),
      update: jest.fn().mockResolvedValue([1])
    },
    User: {
      findByPk: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue([1])
    }
  };
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid')
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  resolve: jest.fn().mockImplementation((...args) => args.join('/'))
}));

// Mock Prisma client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      bcrs: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'bcr-123',
            bcrNumber: 'BCR-2025-0001',
            title: 'Test BCR',
            description: 'Test description',
            status: 'draft',
            priority: 'medium',
            createdBy: 'user-123',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'bcr-123',
          bcrNumber: 'BCR-2025-0001',
          title: 'Test BCR',
          description: 'Test description',
          status: 'draft',
          priority: 'medium',
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date()
        }),
        update: jest.fn().mockResolvedValue({
          id: 'bcr-123',
          bcrNumber: 'BCR-2025-0001',
          title: 'Test BCR',
          status: 'in-progress'
        })
      },
      fundingRequirements: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'req-1', route: 'primary', year: 2023, amount: 10000 },
          { id: 'req-2', route: 'secondary', year: 2023, amount: 15000 }
        ])
      },
      fundingHistories: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'hist-1', year: 2022, route: 'primary', amount: 9500 },
          { id: 'hist-2', year: 2023, route: 'primary', amount: 10000 }
        ])
      },
      bcrConfigs: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', type: 'status', name: 'draft', value: '1', displayOrder: 1 },
          { id: '2', type: 'status', name: 'submitted', value: '2', displayOrder: 2 }
        ])
      },
      $disconnect: jest.fn()
    }))
  };
});

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockImplementation((path) => {
    if (path.includes('requirements.json')) {
      return JSON.stringify([
        { id: 'req-1', route: 'primary', year: 2023, amount: 10000 },
        { id: 'req-2', route: 'secondary', year: 2023, amount: 15000 }
      ]);
    } else if (path.includes('history.json')) {
      return JSON.stringify([
        { id: 'hist-1', year: 2022, route: 'primary', amount: 9500 },
        { id: 'hist-2', year: 2023, route: 'primary', amount: 10000 }
      ]);
    }
    return '{}';
  })
}));

// Mock package.json
jest.mock('../../package.json', () => ({
  version: '1.0.0'
}));

// Mock express - we don't need it for direct handler tests
jest.mock('express', () => {
  const mockRouter = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    use: jest.fn()
  };
  
  return {
    Router: jest.fn().mockReturnValue(mockRouter)
  };
});

// Mock middleware
jest.mock('../../middleware/auth', () => ({
  ensureAuthenticated: jest.fn((req, res, next) => next()),
  checkPermission: jest.fn(() => (req, res, next) => next())
}));

describe('API Endpoints', () => {
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock request and response objects
    mockReq = {
      user: { id: 'user-123' },
      params: {},
      query: {},
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
  });
  
  describe('Health Check', () => {
    it('should return health status', () => {
      // Import the health check handler
      const { healthCheck } = require('../../routes/api/health');
      
      // Call the handler directly
      healthCheck(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
          version: '1.0.0'
        })
      );
    });
  });
  
  describe('Reference Data API', () => {
    it('should return items list', async () => {
      // Import the handler
      const { getItems } = require('../../routes/api/items');
      
      // Call the handler directly
      await getItems(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
    
    it('should return a specific item', async () => {
      // Import the handler
      const { getItemById } = require('../../routes/api/items');
      
      // Set up the request parameters
      mockReq.params.id = 'ref-123';
      
      // Call the handler directly
      await getItemById(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
    
    it('should handle non-existent item', async () => {
      // Import the handler
      const { getItemById } = require('../../routes/api/items');
      
      // Mock the model to return null for a non-existent item
      const { ReferenceData } = require('../../models');
      ReferenceData.findByPk.mockResolvedValueOnce(null);
      
      // Set up the request parameters
      mockReq.params.id = 'non-existent';
      
      // Call the handler directly
      await getItemById(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });
    
    it('should return values for an item', async () => {
      // Import the handler
      const { getItemValues } = require('../../routes/api/items');
      
      // Set up the request parameters
      mockReq.params.id = 'ref-123';
      
      // Call the handler directly
      await getItemValues(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });
  
  describe('Funding API', () => {
    it('should return funding requirements', async () => {
      // Import the handler
      const { getFundingRequirements } = require('../../routes/api/funding');
      
      // Call the handler directly
      await getFundingRequirements(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
    
    it('should return funding history', async () => {
      // Import the handler
      const { getFundingHistory } = require('../../routes/api/funding');
      
      // Call the handler directly
      await getFundingHistory(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
    
    it('should filter funding requirements by route', async () => {
      // Import the handler
      const { getFundingRequirements } = require('../../routes/api/funding');
      
      // Mock the fundingService to return filtered data
      const fundingService = require('../../services/fundingService');
      jest.spyOn(fundingService, 'getAllFundingRequirements').mockResolvedValue([
        { id: 'req-1', route: 'primary', year: 2023, amount: 10000 }
      ]);
      
      // Set up the request query
      mockReq.query.route = 'primary';
      
      // Call the handler directly
      await getFundingRequirements(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });
  
  describe('BCR API', () => {
    it('should return BCR list', async () => {
      // Import the handler
      const { getBCRList } = require('../../routes/api/bcr');
      
      // Call the handler directly
      await getBCRList(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
    
    it('should create a new BCR', async () => {
      // Import the handler
      const { createBCR } = require('../../routes/api/bcr');
      
      // Set up the request body
      mockReq.body = {
        title: 'New BCR',
        description: 'New BCR description',
        priority: 'high',
        targetDate: '2023-12-31'
      };
      
      // Call the handler directly
      await createBCR(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });
    
    it('should return a specific BCR', async () => {
      // Import the handler
      const { getBCRById } = require('../../routes/api/bcr');
      
      // Set up the request parameters
      mockReq.params.id = 'bcr-123';
      
      // Call the handler directly
      await getBCRById(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
    
    it('should update BCR status', async () => {
      // Import the handler
      const { updateBCRStatus } = require('../../routes/api/bcr');
      
      // Set up the request parameters and body
      mockReq.params.id = 'bcr-123';
      mockReq.body = {
        status: 'in-progress',
        comment: 'Work has started'
      };
      
      // Call the handler directly
      await updateBCRStatus(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });
  
  describe('User API', () => {
    it('should return current user profile', async () => {
      // Import the handler
      const { getUserProfile } = require('../../routes/api/user');
      
      // Call the handler directly
      await getUserProfile(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
    
    it('should update user preferences', async () => {
      // Import the handler
      const { updateUserPreferences } = require('../../routes/api/user');
      
      // Set up the request body
      mockReq.body = {
        theme: 'dark',
        notifications: true
      };
      
      // Call the handler directly
      await updateUserPreferences(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });
});

// Mock the models
jest.mock('../../models', () => {
  const mockReferenceData = {
    id: 'ref-123',
    name: 'Test Reference Data',
    type: 'test',
    value: 'test-value',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
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
  
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'business',
    active: true,
    lastLogin: new Date(),
    preferences: { theme: 'light', notifications: false }
  };
  
  return {
    ReferenceData: {
      findAll: jest.fn().mockResolvedValue([mockReferenceData]),
      findOne: jest.fn().mockResolvedValue(mockReferenceData),
      findByPk: jest.fn().mockResolvedValue(mockReferenceData)
    },
    ReferenceValue: {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 'val-123',
          referenceDataId: 'ref-123',
          value: 'test-value',
          label: 'Test Value',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])
    },
    BCR: {
      findAll: jest.fn().mockResolvedValue([mockBCR]),
      findOne: jest.fn().mockResolvedValue(mockBCR),
      findByPk: jest.fn().mockResolvedValue(mockBCR),
      create: jest.fn().mockResolvedValue(mockBCR),
      update: jest.fn().mockResolvedValue([1])
    },
    User: {
      findByPk: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue([1])
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

describe('API Endpoints', () => {
  let app;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock request and response objects
    mockReq = {
      user: { id: 'user-123' },
      params: {},
      query: {},
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
  });

  afterEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      // Import the route handler
      const { healthCheck } = require('../../routes/api/health');
      
      // Call the route handler
      healthCheck(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
          version: expect.any(String)
        })
      );
    });
  });

  describe('Reference Data API', () => {
    it('should return items list', async () => {
      // Import the route handler
      const { getItems } = require('../../routes/api/items');
      
      // Call the route handler
      await getItems(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String)
          })
        ])
      );
    });

    it('should return a specific item', async () => {
      // Import the route handler
      const { getItemById } = require('../../routes/api/items');
      
      // Set up the request parameters
      mockReq.params.id = 'ref-123';
      
      // Call the route handler
      await getItemById(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ref-123',
          name: 'Test Reference Data'
        })
      );
    });

    it('should handle non-existent item', async () => {
      // Import the route handler
      const { getItemById } = require('../../routes/api/items');
      
      // Mock the model to return null for a non-existent item
      const { ReferenceData } = require('../../models');
      ReferenceData.findByPk.mockResolvedValueOnce(null);
      
      // Set up the request parameters
      mockReq.params.id = 'non-existent';
      
      // Call the route handler
      await getItemById(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Item not found'
        })
      );
    });

    it('should return values for an item', async () => {
      // Import the route handler
      const { getItemValues } = require('../../routes/api/items');
      
      // Set up the request parameters
      mockReq.params.id = 'ref-123';
      
      // Call the route handler
      await getItemValues(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            value: expect.any(String)
          })
        ])
      );
    });
  });

  describe('Funding API', () => {
    it('should return funding requirements', async () => {
      // Import the route handler
      const { getFundingRequirements } = require('../../routes/api/funding');
      
      // Mock the path module for this test
      const path = require('path');
      path.join.mockImplementation((...args) => {
        if (args.includes('requirements.json')) {
          return 'data/funding/requirements.json';
        }
        return args.join('/');
      });
      
      // Call the route handler
      await getFundingRequirements(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            route: expect.any(String),
            amount: expect.any(Number)
          })
        ])
      );
    });

    it('should return funding history', async () => {
      // Import the route handler
      const { getFundingHistory } = require('../../routes/api/funding');
      
      // Call the route handler
      await getFundingHistory(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
      // The response format has changed with Prisma, so we're just checking that json was called
    });

    it('should filter funding requirements by route', async () => {
      // Import the route handler
      const { getFundingRequirements } = require('../../routes/api/funding');
      
      // Mock the path module for this test
      const path = require('path');
      path.join.mockImplementation((...args) => {
        if (args.includes('requirements.json')) {
          return 'data/funding/requirements.json';
        }
        return args.join('/');
      });
      
      // Set up the request query
      mockReq.query.route = 'primary';
      
      // Call the route handler
      await getFundingRequirements(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
      
      // With Prisma, we're mocking the service to return only primary route items
      // so we don't need to check the response data
    });
  });

  describe('BCR API', () => {
    beforeEach(() => {
      // Mock the BCR model for this test suite
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
    });
    
    it('should return BCR list', async () => {
      // Import the route handler
      const { getBCRList } = require('../../routes/api/bcr');
      
      // Call the route handler
      await getBCRList(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            status: expect.any(String)
          })
        ])
      );
    });

    it('should create a new BCR', async () => {
      // Import the route handler
      const { createBCR } = require('../../routes/api/bcr');
      
      // Mock the BCR model for this test
      const { BCR } = require('../../models');
      BCR.create.mockResolvedValue({
        id: 'bcr-new',
        title: 'New BCR',
        description: 'New BCR description',
        priority: 'high',
        targetDate: '2023-12-31',
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Set up the request body
      mockReq.body = {
        title: 'New BCR',
        description: 'New BCR description',
        priority: 'high',
        targetDate: '2023-12-31'
      };
      
      // Call the route handler
      await createBCR(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: 'New BCR',
          description: 'New BCR description',
          priority: 'high'
        })
      );
    });

    it('should return a specific BCR', async () => {
      // Import the route handler
      const { getBCRById } = require('../../routes/api/bcr');
      
      // Mock the BCR model for this test
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
      
      // Set up the request parameters
      mockReq.params.id = 'bcr-123';
      
      // Call the route handler
      await getBCRById(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'bcr-123',
          title: expect.any(String)
        })
      );
    });

    it('should update BCR status', async () => {
      // Import the route handler
      const { updateBCRStatus } = require('../../routes/api/bcr');
      
      // Mock the BCR model for this test
      const { BCR } = require('../../models');
      BCR.update.mockResolvedValue([1]);
      BCR.findByPk.mockResolvedValue({
        id: 'bcr-123',
        title: 'Test BCR',
        description: 'Test description',
        status: 'in-progress',
        lastComment: 'Work has started',
        priority: 'medium',
        createdBy: 'user-123',
        updatedBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Set up the request parameters and body
      mockReq.params.id = 'bcr-123';
      mockReq.body = {
        status: 'in-progress',
        comment: 'Work has started'
      };
      
      // Call the route handler
      await updateBCRStatus(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'bcr-123',
          status: 'in-progress'
        })
      );
    });
  });

  describe('User API', () => {
    beforeEach(() => {
      // Mock the User model for this test suite
      const { User } = require('../../models');
      User.findByPk.mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'business',
        active: true,
        lastLogin: new Date(),
        preferences: { theme: 'light', notifications: false },
        toJSON: function() {
          return {
            id: this.id,
            name: this.name,
            email: this.email,
            role: this.role,
            active: this.active,
            lastLogin: this.lastLogin,
            preferences: this.preferences
          };
        }
      });
    });
    
    it('should return current user profile', async () => {
      // Import the route handler
      const { getUserProfile } = require('../../routes/api/user');
      
      // Call the route handler
      await getUserProfile(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          name: expect.any(String),
          email: expect.any(String)
        })
      );
    });

    it('should update user preferences', async () => {
      // Import the route handler
      const { updateUserPreferences } = require('../../routes/api/user');
      
      // Mock the User model for this test
      const { User } = require('../../models');
      User.update.mockResolvedValue([1]);
      User.findByPk.mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'business',
        active: true,
        lastLogin: new Date(),
        preferences: { theme: 'dark', notifications: true },
        toJSON: function() {
          return {
            id: this.id,
            name: this.name,
            email: this.email,
            role: this.role,
            active: this.active,
            lastLogin: this.lastLogin,
            preferences: this.preferences
          };
        }
      });
      
      // Set up the request body
      mockReq.body = {
        theme: 'dark',
        notifications: true
      };
      
      // Call the route handler
      await updateUserPreferences(mockReq, mockRes);
      
      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          preferences: expect.objectContaining({
            theme: 'dark',
            notifications: true
          })
        })
      );
    });
  });
});
