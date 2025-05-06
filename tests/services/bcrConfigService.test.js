/**
 * Unit tests for BCR Config Service
 */
const { PrismaClient } = require('@prisma/client');
const bcrConfigService = require('../../services/bcrConfigService');

// Create mock functions
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDisconnect = jest.fn();

// Mock the Prisma client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      bcrConfigs: {
        findMany: mockFindMany,
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

describe('BCR Config Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('getConfigsByType', () => {
    it('should return all configurations of a specific type', async () => {
      // Arrange
      const mockConfigs = [
        { id: '1', type: 'status', name: 'draft', value: '1', displayOrder: 1 },
        { id: '2', type: 'status', name: 'submitted', value: '2', displayOrder: 2 }
      ];
      
      mockFindMany.mockResolvedValue(mockConfigs);
      
      // Act
      const result = await bcrConfigService.getConfigsByType('status');
      
      // Assert
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { type: 'status' },
        orderBy: { displayOrder: 'asc' }
      });
      expect(result).toEqual(mockConfigs);
    });
  });
  
  describe('getConfigById', () => {
    it('should return a configuration by ID', async () => {
      // Arrange
      const mockConfig = { id: '1', type: 'status', name: 'draft', value: '1' };
      
      mockFindUnique.mockResolvedValue(mockConfig);
      
      // Act
      const result = await bcrConfigService.getConfigById('1');
      
      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
      expect(result).toEqual(mockConfig);
    });
  });
  
  describe('createConfig', () => {
    it('should create a new configuration', async () => {
      // Arrange
      const mockConfigData = {
        type: 'status',
        name: 'new_status',
        value: '10',
        displayOrder: 10,
        description: 'New status',
        metadata: { color: 'blue' }
      };
      
      const mockCreatedConfig = {
        id: '1',
        ...mockConfigData
      };
      
      mockCreate.mockResolvedValue(mockCreatedConfig);
      
      // Act
      const result = await bcrConfigService.createConfig(mockConfigData);
      
      // Assert
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'status',
          name: 'new_status',
          value: '10',
          displayOrder: 10,
          description: 'New status',
          metadata: { color: 'blue' }
        })
      });
      expect(result).toEqual(mockCreatedConfig);
    });
    
    it('should set default values for optional fields', async () => {
      // Arrange
      const mockConfigData = {
        type: 'status',
        name: 'minimal_status',
        value: '11'
      };
      
      const mockCreatedConfig = {
        id: '1',
        ...mockConfigData,
        displayOrder: 0,
        metadata: {}
      };
      
      mockCreate.mockResolvedValue(mockCreatedConfig);
      
      // Act
      const result = await bcrConfigService.createConfig(mockConfigData);
      
      // Assert
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'status',
          name: 'minimal_status',
          value: '11',
          displayOrder: 0,
          metadata: {}
        })
      });
      expect(result).toEqual(mockCreatedConfig);
    });
  });
  
  describe('updateConfig', () => {
    it('should update an existing configuration', async () => {
      // Arrange
      const mockConfigId = '1';
      const mockConfigData = {
        type: 'status',
        name: 'updated_status',
        value: '10',
        displayOrder: 10,
        description: 'Updated status',
        metadata: { color: 'green' }
      };
      
      const mockUpdatedConfig = {
        id: mockConfigId,
        ...mockConfigData
      };
      
      mockUpdate.mockResolvedValue(mockUpdatedConfig);
      
      // Act
      const result = await bcrConfigService.updateConfig(mockConfigId, mockConfigData);
      
      // Assert
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockConfigId },
        data: mockConfigData
      });
      expect(result).toEqual(mockUpdatedConfig);
    });
  });
  
  describe('deleteConfig', () => {
    it('should delete a configuration', async () => {
      // Arrange
      const mockConfigId = '1';
      const mockDeletedConfig = {
        id: mockConfigId,
        type: 'status',
        name: 'deleted_status',
        value: '99'
      };
      
      mockDelete.mockResolvedValue(mockDeletedConfig);
      
      // Act
      const result = await bcrConfigService.deleteConfig(mockConfigId);
      
      // Assert
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: mockConfigId }
      });
      expect(result).toEqual(mockDeletedConfig);
    });
  });
  
  describe('getPhasesWithStatuses', () => {
    it('should return phases with their associated statuses', async () => {
      // Arrange
      const mockPhases = [
        { id: '1', type: 'phase', name: 'Draft', value: '1', displayOrder: 1 },
        { id: '2', type: 'phase', name: 'Submitted', value: '2', displayOrder: 2 }
      ];
      
      const mockStatuses = [
        { id: '3', type: 'status', name: 'draft', value: '1', displayOrder: 1 },
        { id: '4', type: 'status', name: 'submitted', value: '2', displayOrder: 2 }
      ];
      
      // Mock the getConfigsByType method
      jest.spyOn(bcrConfigService, 'getConfigsByType')
        .mockImplementation((type) => {
          if (type === 'phase') return Promise.resolve(mockPhases);
          if (type === 'status') return Promise.resolve(mockStatuses);
          return Promise.resolve([]);
        });
      
      // Act
      const result = await bcrConfigService.getPhasesWithStatuses();
      
      // Assert
      expect(bcrConfigService.getConfigsByType).toHaveBeenCalledWith('phase');
      expect(bcrConfigService.getConfigsByType).toHaveBeenCalledWith('status');
      expect(result).toEqual({
        phases: mockPhases,
        phaseStatusMapping: {
          '1': ['draft'],
          '2': ['submitted']
        }
      });
    });
  });
});
