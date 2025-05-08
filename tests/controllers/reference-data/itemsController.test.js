/**
 * Reference Data Items Controller Tests
 */
const { itemsController } = require('../../../controllers/reference-data');
const { prisma } = require('../../../config/database');

// Mock the Prisma client
jest.mock('../../../config/database', () => ({
  prisma: {
    referenceData: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn()
    },
    referenceValue: {
      findMany: jest.fn()
    }
  }
}));

// Mock Express request and response
const mockRequest = (params = {}, query = {}, body = {}, user = {}) => ({
  params,
  query,
  body,
  user
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

describe('Reference Data Items Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listItems', () => {
    it('should render the items list view with data', async () => {
      // Mock data
      const mockItems = [
        { id: '1', name: 'Item 1', status: 'Active', lastUpdated: new Date().toISOString() },
        { id: '2', name: 'Item 2', status: 'Updated', lastUpdated: new Date().toISOString() }
      ];
      
      const mockAcademicYears = [
        { id: '2024-25', name: '2024/25', category: 'academicYear' }
      ];
      
      // Set up mocks
      prisma.referenceData.findMany.mockImplementation((args) => {
        if (args && args.where && args.where.category === 'academicYear') {
          return Promise.resolve(mockAcademicYears);
        }
        return Promise.resolve(mockItems);
      });
      
      const req = mockRequest({}, { 'academic-year': '2024-25' });
      const res = mockResponse();
      
      // Call the controller method
      await itemsController.listItems(req, res);
      
      // Assertions
      expect(prisma.referenceData.findMany).toHaveBeenCalledTimes(2);
      expect(res.render).toHaveBeenCalledWith(
        'modules/ref-data/items/index',
        expect.objectContaining({
          title: 'Reference Data Items',
          items: expect.any(Array)
        })
      );
    });
    
    it('should handle errors and render the error page', async () => {
      // Set up mocks to throw an error
      prisma.referenceData.findMany.mockRejectedValue(new Error('Database error'));
      
      const req = mockRequest();
      const res = mockResponse();
      
      // Call the controller method
      await itemsController.listItems(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          title: 'Error',
          message: 'Failed to load reference data items'
        })
      );
    });
  });
  
  describe('viewItemValues', () => {
    it('should render the item values view with data', async () => {
      // Mock data
      const mockItem = { 
        id: '1', 
        name: 'Item 1', 
        status: 'Active', 
        lastUpdated: new Date().toISOString() 
      };
      
      const mockValues = [
        { id: '1', name: 'Value 1', referenceDataId: '1' },
        { id: '2', name: 'Value 2', referenceDataId: '1' }
      ];
      
      const mockAcademicYears = [
        { id: '2024-25', name: '2024/25', category: 'academicYear' }
      ];
      
      // Set up mocks
      prisma.referenceData.findUnique.mockResolvedValue(mockItem);
      prisma.referenceValue.findMany.mockResolvedValue(mockValues);
      prisma.referenceData.findMany.mockResolvedValue(mockAcademicYears);
      
      const req = mockRequest({ id: '1' });
      const res = mockResponse();
      
      // Call the controller method
      await itemsController.viewItemValues(req, res);
      
      // Assertions
      expect(prisma.referenceData.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
      expect(prisma.referenceValue.findMany).toHaveBeenCalledWith({
        where: { referenceDataId: '1' }
      });
      expect(res.render).toHaveBeenCalledWith(
        'modules/ref-data/items/details',
        expect.objectContaining({
          title: expect.stringContaining(mockItem.name),
          item: expect.objectContaining({
            id: mockItem.id,
            name: mockItem.name
          }),
          values: mockValues
        })
      );
    });
    
    it('should handle item not found and render the error page', async () => {
      // Set up mocks
      prisma.referenceData.findUnique.mockResolvedValue(null);
      
      const req = mockRequest({ id: 'nonexistent' });
      const res = mockResponse();
      
      // Call the controller method
      await itemsController.viewItemValues(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          title: 'Not Found',
          message: 'The requested item could not be found.'
        })
      );
    });
  });
  
  describe('processAddItem', () => {
    it('should create a new item and redirect to the items list', async () => {
      // Mock data
      const mockNewItem = {
        id: '3',
        name: 'New Item',
        status: 'Active',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Set up mocks
      prisma.referenceData.create.mockResolvedValue(mockNewItem);
      
      const req = mockRequest({}, {}, { name: 'New Item', academicYear: '2024-25' });
      const res = mockResponse();
      
      // Call the controller method
      await itemsController.processAddItem(req, res);
      
      // Assertions
      expect(prisma.referenceData.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Item',
          status: 'Active'
        })
      });
      expect(res.redirect).toHaveBeenCalledWith('/ref-data/items');
    });
    
    it('should handle errors during item creation', async () => {
      // Set up mocks to throw an error
      prisma.referenceData.create.mockRejectedValue(new Error('Database error'));
      
      const req = mockRequest({}, {}, { name: 'New Item' });
      const res = mockResponse();
      
      // Call the controller method
      await itemsController.processAddItem(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          title: 'Error',
          message: 'Failed to add reference data item'
        })
      );
    });
  });
});
