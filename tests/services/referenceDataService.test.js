/**
 * Unit tests for Reference Data Service
 */
// Create mock functions first to avoid reference errors
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDisconnect = jest.fn();

const mongoose = require('mongoose');
const ReferenceData = require('../../models/ReferenceData');
const { mediumCache } = require('../../utils/cache');
// Import the service after mocks are defined
const referenceDataService = require('../../services/referenceDataService');

// Mock Mongoose model
jest.mock('../../models/ReferenceData', () => ({
  find: mockFind,
  findById: mockFindById,
  create: mockCreate,
  findByIdAndUpdate: mockFindByIdAndUpdate,
  findByIdAndDelete: mockFindByIdAndDelete
}));

// Mock the cache module
jest.mock('../../utils/cache', () => {
  const mockGetOrSet = jest.fn();
  return {
    mediumCache: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getOrSet: mockGetOrSet
    }
  };
});

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-1234')
}));

describe('Reference Data Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('getAllReferenceData', () => {
    it('should use cache to get all reference data', async () => {
      // Arrange
      const mockReferenceData = [
        { id: '1', category: 'status', value: 'active' },
        { id: '2', category: 'status', value: 'inactive' }
      ];
      
      // Setup the cache mock to execute the fetchFn and return its result
      mediumCache.getOrSet.mockImplementation((key, fetchFn) => fetchFn());
      mockFindMany.mockResolvedValue(mockReferenceData);
      
      // Act
      const result = await referenceDataService.getAllReferenceData();
      
      // Assert
      expect(mediumCache.getOrSet).toHaveBeenCalledWith('all_reference_data', expect.any(Function));
      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: {
          category: 'asc'
        }
      });
      expect(result).toEqual(mockReferenceData);
    });
  });
  
  describe('getReferenceDataByCategory', () => {
    it('should use cache to get reference data by category', async () => {
      // Arrange
      const category = 'status';
      const mockReferenceData = [
        { id: '1', category: 'status', value: 'active' },
        { id: '2', category: 'status', value: 'inactive' }
      ];
      
      // Setup the cache mock to execute the fetchFn and return its result
      mediumCache.getOrSet.mockImplementation((key, fetchFn) => fetchFn());
      mockFindMany.mockResolvedValue(mockReferenceData);
      
      // Act
      const result = await referenceDataService.getReferenceDataByCategory(category);
      
      // Assert
      expect(mediumCache.getOrSet).toHaveBeenCalledWith(`reference_data_category_${category}`, expect.any(Function));
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          category: category
        },
        orderBy: {
          value: 'asc'
        }
      });
      expect(result).toEqual(mockReferenceData);
    });
  });
  
  describe('getReferenceDataById', () => {
    it('should use cache to get reference data by ID', async () => {
      // Arrange
      const id = '1';
      const mockReferenceData = { id: '1', category: 'status', value: 'active' };
      
      // Setup the cache mock to execute the fetchFn and return its result
      mediumCache.getOrSet.mockImplementation((key, fetchFn) => fetchFn());
      mockFindUnique.mockResolvedValue(mockReferenceData);
      
      // Act
      const result = await referenceDataService.getReferenceDataById(id);
      
      // Assert
      expect(mediumCache.getOrSet).toHaveBeenCalledWith(`reference_data_id_${id}`, expect.any(Function));
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          id: id
        }
      });
      expect(result).toEqual(mockReferenceData);
    });
  });
  
  describe('createReferenceData', () => {
    it('should create reference data and invalidate cache', async () => {
      // Arrange
      const mockData = {
        category: 'status',
        value: 'pending',
        description: 'Pending status'
      };
      
      const mockCreatedData = {
        id: 'mock-uuid-1234',
        ...mockData
      };
      
      mockCreate.mockResolvedValue(mockCreatedData);
      
      // Act
      const result = await referenceDataService.createReferenceData(mockData);
      
      // Assert
      expect(mockCreate).toHaveBeenCalledWith({
        data: mockData
      });
      
      // Verify cache invalidation
      expect(mediumCache.delete).toHaveBeenCalledWith('all_reference_data');
      expect(mediumCache.delete).toHaveBeenCalledWith(`reference_data_category_${mockData.category}`);
      
      expect(result).toEqual(mockCreatedData);
    });
  });
  
  describe('updateReferenceData', () => {
    it('should update reference data and invalidate cache', async () => {
      // Arrange
      const id = '1';
      const mockData = {
        category: 'status',
        value: 'updated',
        description: 'Updated status'
      };
      
      const mockCurrentData = {
        id: id,
        category: 'status',
        value: 'active',
        description: 'Active status'
      };
      
      const mockUpdatedData = {
        id: id,
        ...mockData
      };
      
      mockFindUnique.mockResolvedValue(mockCurrentData);
      mockUpdate.mockResolvedValue(mockUpdatedData);
      
      // Act
      const result = await referenceDataService.updateReferenceData(id, mockData);
      
      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          id: id
        }
      });
      
      expect(mockUpdate).toHaveBeenCalledWith({
        where: {
          id: id
        },
        data: mockData
      });
      
      // Verify cache invalidation
      expect(mediumCache.delete).toHaveBeenCalledWith('all_reference_data');
      expect(mediumCache.delete).toHaveBeenCalledWith(`reference_data_id_${id}`);
      expect(mediumCache.delete).toHaveBeenCalledWith(`reference_data_category_${mockCurrentData.category}`);
      
      expect(result).toEqual(mockUpdatedData);
    });
    
    it('should invalidate both old and new category caches when category changes', async () => {
      // Arrange
      const id = '1';
      const mockData = {
        category: 'new_category',
        value: 'updated',
        description: 'Updated status'
      };
      
      const mockCurrentData = {
        id: id,
        category: 'old_category',
        value: 'active',
        description: 'Active status'
      };
      
      const mockUpdatedData = {
        id: id,
        ...mockData
      };
      
      mockFindUnique.mockResolvedValue(mockCurrentData);
      mockUpdate.mockResolvedValue(mockUpdatedData);
      
      // Act
      const result = await referenceDataService.updateReferenceData(id, mockData);
      
      // Assert
      // Verify cache invalidation for both old and new categories
      expect(mediumCache.delete).toHaveBeenCalledWith(`reference_data_category_${mockCurrentData.category}`);
      expect(mediumCache.delete).toHaveBeenCalledWith(`reference_data_category_${mockData.category}`);
      
      expect(result).toEqual(mockUpdatedData);
    });
  });
  
  describe('deleteReferenceData', () => {
    it('should delete reference data and invalidate cache', async () => {
      // Arrange
      const id = '1';
      const mockDeletedData = {
        id: id,
        category: 'status',
        value: 'active',
        description: 'Active status'
      };
      
      mockFindUnique.mockResolvedValue(mockDeletedData);
      mockDelete.mockResolvedValue(mockDeletedData);
      
      // Act
      const result = await referenceDataService.deleteReferenceData(id);
      
      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          id: id
        }
      });
      
      expect(mockDelete).toHaveBeenCalledWith({
        where: {
          id: id
        }
      });
      
      // Verify cache invalidation
      expect(mediumCache.delete).toHaveBeenCalledWith('all_reference_data');
      expect(mediumCache.delete).toHaveBeenCalledWith(`reference_data_id_${id}`);
      expect(mediumCache.delete).toHaveBeenCalledWith(`reference_data_category_${mockDeletedData.category}`);
      
      expect(result).toEqual(mockDeletedData);
    });
  });
});
