/**
 * Unit tests for the Funding Service
 */
const mongoose = require('mongoose');
const FundingRequirement = require('../../models/FundingRequirement');
const FundingHistory = require('../../models/FundingHistory');
const fundingService = require('../../services/fundingService');

// Mock Mongoose models
jest.mock('../../models/FundingRequirement', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

jest.mock('../../models/FundingHistory', () => ({
  find: jest.fn(),
  create: jest.fn()
}));

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}));

describe('Funding Service', () => {
  let prisma;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Get the mocked Prisma client instance
    prisma = new PrismaClient();
  });
  
  describe('getAllFundingRequirements', () => {
    it('should return all funding requirements when no filters are provided', async () => {
      // Mock data
      const mockRequirements = [
        { id: '1', route: 'Route A', year: 2025 },
        { id: '2', route: 'Route B', year: 2024 }
      ];
      
      // Setup mock implementation
      prisma.fundingRequirements.findMany.mockResolvedValue(mockRequirements);
      
      // Call the function
      const result = await fundingService.getAllFundingRequirements();
      
      // Assertions
      expect(prisma.fundingRequirements.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          creator: true,
          updater: true
        },
        orderBy: [
          { year: 'desc' },
          { route: 'asc' }
        ]
      });
      expect(result).toEqual(mockRequirements);
    });
    
    it('should filter funding requirements by route when route filter is provided', async () => {
      // Mock data
      const mockRequirements = [
        { id: '1', route: 'Route A', year: 2025 }
      ];
      
      // Setup mock implementation
      prisma.fundingRequirements.findMany.mockResolvedValue(mockRequirements);
      
      // Call the function with filters
      const result = await fundingService.getAllFundingRequirements({ route: 'Route A' });
      
      // Assertions
      expect(prisma.fundingRequirements.findMany).toHaveBeenCalledWith({
        where: { route: 'Route A' },
        include: {
          creator: true,
          updater: true
        },
        orderBy: [
          { year: 'desc' },
          { route: 'asc' }
        ]
      });
      expect(result).toEqual(mockRequirements);
    });
  });
  
  describe('getFundingRequirementById', () => {
    it('should return a funding requirement by ID', async () => {
      // Mock data
      const mockRequirement = { id: '1', route: 'Route A', year: 2025 };
      
      // Setup mock implementation
      prisma.fundingRequirements.findUnique.mockResolvedValue(mockRequirement);
      
      // Call the function
      const result = await fundingService.getFundingRequirementById('1');
      
      // Assertions
      expect(prisma.fundingRequirements.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          creator: true,
          updater: true
        }
      });
      expect(result).toEqual(mockRequirement);
    });
  });
  
  describe('createFundingRequirement', () => {
    it('should create a new funding requirement', async () => {
      // Mock data
      const requirementData = {
        route: 'Route A',
        year: '2025',
        amount: '100000',
        description: 'Test requirement',
        createdBy: 'user-id'
      };
      
      const mockCreatedRequirement = {
        id: 'mock-uuid',
        route: 'Route A',
        year: 2025,
        amount: 100000,
        description: 'Test requirement',
        createdBy: 'user-id',
        lastUpdatedBy: 'user-id'
      };
      
      // Setup mock implementation
      prisma.fundingRequirements.create.mockResolvedValue(mockCreatedRequirement);
      
      // Call the function
      const result = await fundingService.createFundingRequirement(requirementData);
      
      // Assertions
      expect(prisma.fundingRequirements.create).toHaveBeenCalledWith({
        data: {
          id: 'mock-uuid',
          route: 'Route A',
          year: 2025,
          amount: 100000,
          description: 'Test requirement',
          createdBy: 'user-id',
          lastUpdatedBy: 'user-id'
        }
      });
      expect(result).toEqual(mockCreatedRequirement);
    });
  });
  
  describe('updateFundingRequirement', () => {
    it('should update an existing funding requirement', async () => {
      // Mock data
      const requirementData = {
        route: 'Route A Updated',
        year: '2026',
        amount: '200000',
        description: 'Updated description',
        updatedBy: 'user-id'
      };
      
      const mockUpdatedRequirement = {
        id: '1',
        route: 'Route A Updated',
        year: 2026,
        amount: 200000,
        description: 'Updated description',
        lastUpdatedBy: 'user-id'
      };
      
      // Setup mock implementation
      prisma.fundingRequirements.update.mockResolvedValue(mockUpdatedRequirement);
      
      // Call the function
      const result = await fundingService.updateFundingRequirement('1', requirementData);
      
      // Assertions
      expect(prisma.fundingRequirements.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          route: 'Route A Updated',
          year: 2026,
          amount: 200000,
          description: 'Updated description',
          lastUpdatedBy: 'user-id'
        }
      });
      expect(result).toEqual(mockUpdatedRequirement);
    });
  });
  
  describe('deleteFundingRequirement', () => {
    it('should delete a funding requirement by ID', async () => {
      // Mock data
      const mockDeletedRequirement = { id: '1', route: 'Route A', year: 2025 };
      
      // Setup mock implementation
      prisma.fundingRequirements.delete.mockResolvedValue(mockDeletedRequirement);
      
      // Call the function
      const result = await fundingService.deleteFundingRequirement('1');
      
      // Assertions
      expect(prisma.fundingRequirements.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
      expect(result).toEqual(mockDeletedRequirement);
    });
  });
  
  describe('getAllFundingHistory', () => {
    it('should return all funding history entries when no filters are provided', async () => {
      // Mock data
      const mockHistory = [
        { id: '1', route: 'Route A', year: 2025 },
        { id: '2', route: 'Route B', year: 2024 }
      ];
      
      // Setup mock implementation
      prisma.fundingHistories.findMany.mockResolvedValue(mockHistory);
      
      // Call the function
      const result = await fundingService.getAllFundingHistory();
      
      // Assertions
      expect(prisma.fundingHistories.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          creator: true
        },
        orderBy: [
          { createdAt: 'desc' }
        ]
      });
      expect(result).toEqual(mockHistory);
    });
  });
  
  describe('createFundingHistory', () => {
    it('should create a new funding history entry', async () => {
      // Mock data
      const historyData = {
        year: '2025',
        route: 'Route A',
        change: 'increase',
        amount: '50000',
        reason: 'Budget increase',
        createdBy: 'user-id'
      };
      
      const mockCreatedHistory = {
        id: 'mock-uuid',
        year: 2025,
        route: 'Route A',
        change: 'increase',
        amount: 50000,
        reason: 'Budget increase',
        createdBy: 'user-id'
      };
      
      // Setup mock implementation
      prisma.fundingHistories.create.mockResolvedValue(mockCreatedHistory);
      
      // Call the function
      const result = await fundingService.createFundingHistory(historyData);
      
      // Assertions
      expect(prisma.fundingHistories.create).toHaveBeenCalledWith({
        data: {
          id: 'mock-uuid',
          year: 2025,
          route: 'Route A',
          change: 'increase',
          amount: 50000,
          reason: 'Budget increase',
          createdBy: 'user-id'
        }
      });
      expect(result).toEqual(mockCreatedHistory);
    });
  });
});
