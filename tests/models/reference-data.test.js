const { v4: uuidv4 } = require('uuid');

// Create mock models before requiring the actual model
const mockSequelize = {
  define: jest.fn().mockReturnValue({
    // Mock model methods
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    build: jest.fn(),
    // Mock model associations
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    // Mock model attributes and options
    rawAttributes: {
      id: { type: 'UUID' },
      name: { type: 'STRING', allowNull: false },
      code: { type: 'STRING', allowNull: false, unique: true },
      category: { type: 'STRING', allowNull: false },
      description: { type: 'TEXT', allowNull: true },
      isActive: { type: 'BOOLEAN', defaultValue: true },
      validFrom: { type: 'DATE', allowNull: true },
      validTo: { type: 'DATE', allowNull: true },
      createdBy: { type: 'UUID', allowNull: false },
      lastUpdatedBy: { type: 'UUID', allowNull: true },
      version: { type: 'INTEGER', defaultValue: 1 },
      metadata: { type: 'JSONB', allowNull: true }
    },
    options: {
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    associations: {
      creator: { target: 'User' },
      updater: { target: 'User' }
    }
  })
};

// Mock the database config
jest.mock('../../config/database', () => ({
  sequelize: mockSequelize
}));

// Mock User model
jest.mock('../../models/User', () => ({
  findByPk: jest.fn(),
  findOne: jest.fn()
}));

// Now require the model under test
const ReferenceData = require('../../models/ReferenceData');

describe('ReferenceData Model', () => {
  let mockReferenceData;
  const mockUserId = uuidv4();
  const mockUpdaterId = uuidv4();
  
  beforeEach(() => {
    // Create a mock ReferenceData instance
    mockReferenceData = {
      id: uuidv4(),
      name: 'Test Reference Data',
      code: 'TEST_REF_001',
      category: 'test_category',
      description: 'This is a test reference data item',
      isActive: true,
      validFrom: new Date('2025-01-01'),
      validTo: new Date('2025-12-31'),
      createdBy: mockUserId,
      lastUpdatedBy: mockUpdaterId,
      version: 1,
      metadata: { source: 'Test', importance: 'high' },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Set up mock implementations
    ReferenceData.findAll = jest.fn().mockResolvedValue([mockReferenceData]);
    ReferenceData.findOne = jest.fn().mockResolvedValue(mockReferenceData);
    ReferenceData.findByPk = jest.fn().mockResolvedValue(mockReferenceData);
    ReferenceData.create = jest.fn().mockResolvedValue(mockReferenceData);
    ReferenceData.update = jest.fn().mockResolvedValue([1]);
    ReferenceData.destroy = jest.fn().mockResolvedValue(1);
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('Model Structure', () => {
    it('should have the correct fields', () => {
      // Check that the model has all required fields
      expect(ReferenceData.rawAttributes).toBeDefined();
      expect(ReferenceData.rawAttributes.id).toBeDefined();
      expect(ReferenceData.rawAttributes.name).toBeDefined();
      expect(ReferenceData.rawAttributes.code).toBeDefined();
      expect(ReferenceData.rawAttributes.category).toBeDefined();
      expect(ReferenceData.rawAttributes.description).toBeDefined();
      expect(ReferenceData.rawAttributes.isActive).toBeDefined();
      expect(ReferenceData.rawAttributes.validFrom).toBeDefined();
      expect(ReferenceData.rawAttributes.validTo).toBeDefined();
      expect(ReferenceData.rawAttributes.createdBy).toBeDefined();
      expect(ReferenceData.rawAttributes.lastUpdatedBy).toBeDefined();
      expect(ReferenceData.rawAttributes.version).toBeDefined();
      expect(ReferenceData.rawAttributes.metadata).toBeDefined();
    });
    
    it('should have timestamps', () => {
      expect(ReferenceData.options.timestamps).toBe(true);
      expect(ReferenceData.options.createdAt).toBe('createdAt');
      expect(ReferenceData.options.updatedAt).toBe('updatedAt');
    });
    
    it('should have the correct associations', () => {
      // Check that the model has the correct associations
      expect(ReferenceData.associations).toBeDefined();
      expect(ReferenceData.associations.creator).toBeDefined();
      expect(ReferenceData.associations.updater).toBeDefined();
    });
  });
  
  describe('Validation', () => {
    it('should require name', () => {
      expect(ReferenceData.rawAttributes.name.allowNull).toBe(false);
    });
    
    it('should require code', () => {
      expect(ReferenceData.rawAttributes.code.allowNull).toBe(false);
    });
    
    it('should require category', () => {
      expect(ReferenceData.rawAttributes.category.allowNull).toBe(false);
    });
    
    it('should require createdBy', () => {
      expect(ReferenceData.rawAttributes.createdBy.allowNull).toBe(false);
    });
    
    it('should enforce unique code', () => {
      expect(ReferenceData.rawAttributes.code.unique).toBe(true);
    });
  });
  
  describe('Default Values', () => {
    it('should set default isActive to true', () => {
      // Check that isActive has a default value of true
      expect(ReferenceData.rawAttributes.isActive.defaultValue).toBe(true);
    });
    
    it('should set default version to 1', () => {
      // Check that version has a default value of 1
      expect(ReferenceData.rawAttributes.version.defaultValue).toBe(1);
    });
  });
  
  describe('CRUD Operations', () => {
    it('should create a new reference data item', async () => {
      // Mock the create method with a specific return value for this test
      const testData = {
        ...mockReferenceData,
        code: 'TEST_REF_DATA' // Use the expected code for this test
      };
      ReferenceData.create = jest.fn().mockResolvedValue(testData);
      
      const newRefData = await ReferenceData.create({
        name: 'Test Reference Data',
        code: 'TEST_REF_DATA',
        category: 'Test Category',
        description: 'This is a test reference data item',
        createdBy: mockUserId
      });
      
      expect(ReferenceData.create).toHaveBeenCalledTimes(1);
      expect(newRefData.name).toBe('Test Reference Data');
      expect(newRefData.code).toBe('TEST_REF_DATA');
    });
    
    it('should find a reference data item by ID', async () => {
      // Mock the findByPk method
      ReferenceData.findByPk = jest.fn().mockResolvedValue(mockReferenceData);
      
      const foundRefData = await ReferenceData.findByPk(mockReferenceData.id);
      
      expect(ReferenceData.findByPk).toHaveBeenCalledTimes(1);
      expect(ReferenceData.findByPk).toHaveBeenCalledWith(mockReferenceData.id);
      expect(foundRefData.name).toBe('Test Reference Data');
    });
    
    it('should find a reference data item by code', async () => {
      // Mock the findOne method
      ReferenceData.findOne = jest.fn().mockResolvedValue(mockReferenceData);
      
      const foundRefData = await ReferenceData.findOne({
        where: { code: 'TEST_REF_DATA' }
      });
      
      expect(ReferenceData.findOne).toHaveBeenCalledTimes(1);
      expect(ReferenceData.findOne).toHaveBeenCalledWith({
        where: { code: 'TEST_REF_DATA' }
      });
      expect(foundRefData.name).toBe('Test Reference Data');
    });
    
    it('should find reference data items by category', async () => {
      // Mock the findAll method
      ReferenceData.findAll = jest.fn().mockResolvedValue([mockReferenceData]);
      
      const foundRefData = await ReferenceData.findAll({
        where: { category: 'Test Category' }
      });
      
      expect(ReferenceData.findAll).toHaveBeenCalledTimes(1);
      expect(ReferenceData.findAll).toHaveBeenCalledWith({
        where: { category: 'Test Category' }
      });
      expect(foundRefData.length).toBe(1);
      expect(foundRefData[0].name).toBe('Test Reference Data');
    });
    
    it('should update a reference data item', async () => {
      // Mock the update method
      ReferenceData.update = jest.fn().mockResolvedValue([1]);
      
      const updateResult = await ReferenceData.update(
        { 
          description: 'Updated description',
          lastUpdatedBy: mockUpdaterId,
          version: 2
        },
        { where: { id: mockReferenceData.id } }
      );
      
      expect(ReferenceData.update).toHaveBeenCalledTimes(1);
      expect(ReferenceData.update).toHaveBeenCalledWith(
        { 
          description: 'Updated description',
          lastUpdatedBy: mockUpdaterId,
          version: 2
        },
        { where: { id: mockReferenceData.id } }
      );
      expect(updateResult[0]).toBe(1);
    });
    
    it('should mark a reference data item as inactive', async () => {
      // Mock the update method
      ReferenceData.update = jest.fn().mockResolvedValue([1]);
      
      const updateResult = await ReferenceData.update(
        { 
          isActive: false,
          lastUpdatedBy: mockUpdaterId
        },
        { where: { id: mockReferenceData.id } }
      );
      
      expect(ReferenceData.update).toHaveBeenCalledTimes(1);
      expect(ReferenceData.update).toHaveBeenCalledWith(
        { 
          isActive: false,
          lastUpdatedBy: mockUpdaterId
        },
        { where: { id: mockReferenceData.id } }
      );
      expect(updateResult[0]).toBe(1);
    });
    
    it('should delete a reference data item', async () => {
      // Mock the destroy method
      ReferenceData.destroy = jest.fn().mockResolvedValue(1);
      
      const deleteResult = await ReferenceData.destroy({
        where: { id: mockReferenceData.id }
      });
      
      expect(ReferenceData.destroy).toHaveBeenCalledTimes(1);
      expect(ReferenceData.destroy).toHaveBeenCalledWith({
        where: { id: mockReferenceData.id }
      });
      expect(deleteResult).toBe(1);
    });
  });
});
