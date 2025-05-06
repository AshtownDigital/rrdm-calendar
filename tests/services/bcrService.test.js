/**
 * Unit tests for BCR Service
 */
const { PrismaClient } = require('@prisma/client');
const bcrService = require('../../services/bcrService');
const { shortCache, mediumCache } = require('../../utils/cache');

// Create mock functions
const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDisconnect = jest.fn();

// Mock the Prisma client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      bcrs: {
        findMany: mockFindMany,
        findFirst: mockFindFirst,
        findUnique: mockFindUnique,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete
      },
      $disconnect: mockDisconnect
    }))
  };
});

// Mock the cache module
jest.mock('../../utils/cache', () => {
  const mockGetOrSet = jest.fn();
  return {
    shortCache: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getOrSet: mockGetOrSet
    },
    mediumCache: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getOrSet: mockGetOrSet
    },
    Cache: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getOrSet: mockGetOrSet
    }))
  };
});

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-1234')
}));

// Replace the actual Prisma client in the service with our mock
jest.mock('../../services/bcrService', () => {
  const originalModule = jest.requireActual('../../services/bcrService');
  
  // Override the module with our mocks
  return {
    ...originalModule,
    // Mock the generateBcrNumber function
    generateBcrNumber: jest.fn().mockResolvedValue('BCR-2025-0001')
  };
});

describe('BCR Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('getAllBcrs', () => {
    it('should use cache when no filters are provided', async () => {
      // Arrange
      const mockBcrs = [
        { id: '1', title: 'BCR 1', status: 'draft' },
        { id: '2', title: 'BCR 2', status: 'submitted' }
      ];
      
      // Setup the cache mock to execute the fetchFn and return its result
      mediumCache.getOrSet.mockImplementation((key, fetchFn) => fetchFn());
      mockFindMany.mockResolvedValue(mockBcrs);
      
      // Act
      const result = await bcrService.getAllBcrs();
      
      // Assert
      expect(mediumCache.getOrSet).toHaveBeenCalledWith('all_bcrs', expect.any(Function));
      expect(mockFindMany).toHaveBeenCalledWith({
        include: {
          Users_Bcrs_requestedByToUsers: true,
          Users_Bcrs_assignedToToUsers: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(result).toEqual(mockBcrs);
    });
    
    it('should not use cache when filters are provided', async () => {
      // Arrange
      const mockBcrs = [
        { id: '1', title: 'BCR 1', status: 'draft' }
      ];
      
      mockFindMany.mockResolvedValue(mockBcrs);
      
      // Act
      const result = await bcrService.getAllBcrs({ status: 'draft' });
      
      // Assert
      expect(mediumCache.getOrSet).not.toHaveBeenCalled();
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { status: 'draft' },
        include: {
          Users_Bcrs_requestedByToUsers: true,
          Users_Bcrs_assignedToToUsers: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(result).toEqual(mockBcrs);
    });
    
    it('should apply status filter when provided', async () => {
      // Arrange
      const mockBcrs = [
        { id: '1', title: 'BCR 1', status: 'draft' }
      ];
      
      mockFindMany.mockResolvedValue(mockBcrs);
      
      // Act
      const result = await bcrService.getAllBcrs({ status: 'draft' });
      
      // Assert
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { status: 'draft' },
        include: {
          Users_Bcrs_requestedByToUsers: true,
          Users_Bcrs_assignedToToUsers: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(result).toEqual(mockBcrs);
    });
    
    it('should apply impact area filter when provided', async () => {
      // Arrange
      const mockBcrs = [
        { id: '1', title: 'BCR 1', impact: 'Technical' }
      ];
      
      mockFindMany.mockResolvedValue(mockBcrs);
      
      // Act
      const result = await bcrService.getAllBcrs({ impactArea: 'Technical' });
      
      // Assert
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { impact: { contains: 'Technical' } },
        include: {
          Users_Bcrs_requestedByToUsers: true,
          Users_Bcrs_assignedToToUsers: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(result).toEqual(mockBcrs);
    });
  });
  
  describe('getBcrById', () => {
    it('should use cache when finding BCR by bcrNumber', async () => {
      // Arrange
      const mockBcr = { id: '1', bcrNumber: 'BCR-2025-0001', title: 'BCR 1' };
      
      // Setup the cache mock to execute the fetchFn and return its result
      shortCache.getOrSet.mockImplementation((key, fetchFn) => fetchFn());
      mockFindFirst.mockResolvedValue(mockBcr);
      
      // Act
      const result = await bcrService.getBcrById('BCR-2025-0001');
      
      // Assert
      expect(shortCache.getOrSet).toHaveBeenCalledWith('bcr_number_BCR-2025-0001', expect.any(Function));
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { bcrNumber: 'BCR-2025-0001' },
        include: {
          Users_Bcrs_requestedByToUsers: true,
          Users_Bcrs_assignedToToUsers: true
        }
      });
      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(result).toEqual(mockBcr);
    });
    
    it('should use cache when finding BCR by ID', async () => {
      // Arrange
      const mockBcr = { id: '1', bcrNumber: null, title: 'BCR 1' };
      
      // Setup the cache mock to execute the fetchFn and return its result
      shortCache.getOrSet.mockImplementation((key, fetchFn) => fetchFn());
      mockFindFirst.mockResolvedValue(null);
      mockFindUnique.mockResolvedValue(mockBcr);
      
      // Act
      const result = await bcrService.getBcrById('1');
      
      // Assert
      expect(shortCache.getOrSet).toHaveBeenCalledWith('bcr_id_1', expect.any(Function));
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          Users_Bcrs_requestedByToUsers: true,
          Users_Bcrs_assignedToToUsers: true
        }
      });
      expect(result).toEqual(mockBcr);
    });
  });
  
  describe('createBcr', () => {
    it('should create a new BCR and invalidate cache', async () => {
      // Arrange
      const mockBcrData = {
        title: 'New BCR',
        description: 'Test description',
        status: 'draft',
        priority: 'medium',
        impact: 'Technical',
        requestedBy: 'user-id',
        notes: 'Test notes'
      };
      
      const mockCreatedBcr = {
        id: '1',
        bcrNumber: 'BCR-2025-0001',
        ...mockBcrData
      };
      
      // Mock the generateBcrNumber function to return a fixed value
      jest.spyOn(bcrService, 'generateBcrNumber').mockResolvedValue('BCR-2025-0001');
      mockCreate.mockResolvedValue(mockCreatedBcr);
      
      // Act
      const result = await bcrService.createBcr(mockBcrData);
      
      // Assert
      expect(bcrService.generateBcrNumber).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bcrNumber: 'BCR-2025-0001',
          title: 'New BCR',
          description: 'Test description',
          status: 'draft',
          priority: 'medium',
          impact: 'Technical',
          requestedBy: 'user-id',
          notes: 'Test notes'
        })
      });
      
      // Verify cache invalidation
      expect(mediumCache.delete).toHaveBeenCalledWith('all_bcrs');
      
      expect(result).toEqual(mockCreatedBcr);
    });
  });
  
  describe('updateBcr', () => {
    it('should update an existing BCR and invalidate cache', async () => {
      // Arrange
      const mockBcrId = '1';
      const mockBcrData = {
        title: 'Updated BCR',
        description: 'Updated description',
        status: 'submitted',
        priority: 'high',
        impact: 'Business',
        assignedTo: 'assignee-id',
        notes: 'Updated notes'
      };
      
      const mockUpdatedBcr = {
        id: mockBcrId,
        bcrNumber: 'BCR-2025-0001',
        ...mockBcrData
      };
      
      // Mock the findUnique call to get the current BCR for cache invalidation
      mockFindUnique.mockResolvedValueOnce({ bcrNumber: 'BCR-2025-0001' });
      mockUpdate.mockResolvedValue(mockUpdatedBcr);
      
      // Act
      const result = await bcrService.updateBcr(mockBcrId, mockBcrData);
      
      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: mockBcrId },
        select: { bcrNumber: true }
      });
      
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockBcrId },
        data: mockBcrData
      });
      
      // Verify cache invalidation
      expect(mediumCache.delete).toHaveBeenCalledWith('all_bcrs');
      expect(shortCache.delete).toHaveBeenCalledWith(`bcr_id_${mockBcrId}`);
      expect(shortCache.delete).toHaveBeenCalledWith('bcr_number_BCR-2025-0001');
      
      expect(result).toEqual(mockUpdatedBcr);
    });
  });
  
  describe('deleteBcr', () => {
    it('should delete a BCR and invalidate cache', async () => {
      // Arrange
      const mockBcrId = '1';
      const mockDeletedBcr = {
        id: mockBcrId,
        bcrNumber: 'BCR-2025-0001',
        title: 'BCR to delete'
      };
      
      // Mock the findUnique call to get the current BCR for cache invalidation
      mockFindUnique.mockResolvedValueOnce({ bcrNumber: 'BCR-2025-0001' });
      mockDelete.mockResolvedValue(mockDeletedBcr);
      
      // Act
      const result = await bcrService.deleteBcr(mockBcrId);
      
      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: mockBcrId },
        select: { bcrNumber: true }
      });
      
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: mockBcrId }
      });
      
      // Verify cache invalidation
      expect(mediumCache.delete).toHaveBeenCalledWith('all_bcrs');
      expect(shortCache.delete).toHaveBeenCalledWith(`bcr_id_${mockBcrId}`);
      expect(shortCache.delete).toHaveBeenCalledWith('bcr_number_BCR-2025-0001');
      
      expect(result).toEqual(mockDeletedBcr);
    });
  });
  
  describe('generateBcrNumber', () => {
    it('should generate a new BCR number when no BCRs exist', async () => {
      // Arrange
      mockFindFirst.mockResolvedValue(null);
      
      // Mock the current year
      const currentYear = new Date().getFullYear();
      
      // Act
      const result = await bcrService.generateBcrNumber();
      
      // Assert
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          bcrNumber: {
            startsWith: `BCR-${currentYear}-`
          }
        },
        orderBy: {
          bcrNumber: 'desc'
        }
      });
      expect(result).toBe(`BCR-${currentYear}-0001`);
    });
    
    it('should increment the BCR number when BCRs exist', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      const mockLatestBcr = {
        id: '1',
        bcrNumber: `BCR-${currentYear}-0005`
      };
      
      mockFindFirst.mockResolvedValue(mockLatestBcr);
      
      // Act
      const result = await bcrService.generateBcrNumber();
      
      // Assert
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          bcrNumber: {
            startsWith: `BCR-${currentYear}-`
          }
        },
        orderBy: {
          bcrNumber: 'desc'
        }
      });
      expect(result).toBe(`BCR-${currentYear}-0006`);
    });
  });
});
