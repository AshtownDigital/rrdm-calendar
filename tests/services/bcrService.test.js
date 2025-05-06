/**
 * Unit tests for BCR Service
 */
const { PrismaClient } = require('@prisma/client');
const bcrService = require('../../services/bcrService');

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
    it('should return all BCRs when no filters are provided', async () => {
      // Arrange
      const mockBcrs = [
        { id: '1', title: 'BCR 1', status: 'draft' },
        { id: '2', title: 'BCR 2', status: 'submitted' }
      ];
      
      mockFindMany.mockResolvedValue(mockBcrs);
      
      // Act
      const result = await bcrService.getAllBcrs();
      
      // Assert
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
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
    it('should find BCR by bcrNumber first', async () => {
      // Arrange
      const mockBcr = { id: '1', bcrNumber: 'BCR-2025-0001', title: 'BCR 1' };
      
      mockFindFirst.mockResolvedValue(mockBcr);
      
      // Act
      const result = await bcrService.getBcrById('BCR-2025-0001');
      
      // Assert
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
    
    it('should try to find BCR by ID if not found by bcrNumber', async () => {
      // Arrange
      const mockBcr = { id: '1', bcrNumber: null, title: 'BCR 1' };
      
      mockFindFirst.mockResolvedValue(null);
      mockFindUnique.mockResolvedValue(mockBcr);
      
      // Act
      const result = await bcrService.getBcrById('1');
      
      // Assert
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { bcrNumber: '1' },
        include: {
          Users_Bcrs_requestedByToUsers: true,
          Users_Bcrs_assignedToToUsers: true
        }
      });
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
    it('should create a new BCR with generated bcrNumber', async () => {
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
      expect(result).toEqual(mockCreatedBcr);
    });
  });
  
  describe('updateBcr', () => {
    it('should update an existing BCR', async () => {
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
      
      mockUpdate.mockResolvedValue(mockUpdatedBcr);
      
      // Act
      const result = await bcrService.updateBcr(mockBcrId, mockBcrData);
      
      // Assert
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockBcrId },
        data: mockBcrData
      });
      expect(result).toEqual(mockUpdatedBcr);
    });
  });
  
  describe('deleteBcr', () => {
    it('should delete a BCR', async () => {
      // Arrange
      const mockBcrId = '1';
      const mockDeletedBcr = {
        id: mockBcrId,
        bcrNumber: 'BCR-2025-0001',
        title: 'BCR to delete'
      };
      
      mockDelete.mockResolvedValue(mockDeletedBcr);
      
      // Act
      const result = await bcrService.deleteBcr(mockBcrId);
      
      // Assert
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: mockBcrId }
      });
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
