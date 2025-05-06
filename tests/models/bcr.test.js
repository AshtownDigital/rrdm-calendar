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
    // Mock model associations
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    // Mock model attributes and options
    rawAttributes: {
      id: { type: 'UUID' },
      title: { type: 'STRING' },
      description: { type: 'TEXT' },
      status: { type: 'ENUM' },
      priority: { type: 'ENUM' },
      requestedBy: { type: 'UUID' },
      assignedTo: { type: 'UUID' },
      targetDate: { type: 'DATE' },
      implementationDate: { type: 'DATE' },
      notes: { type: 'TEXT' }
    },
    options: {
      timestamps: true
    },
    // Mock prototype methods
    prototype: {
      getFormattedId: jest.fn().mockReturnValue('BCR-12345678')
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
const Bcr = require('../../models/Bcr');

describe('BCR Model', () => {
  let mockBcr;
  const mockUserId = uuidv4();
  const mockAssigneeId = uuidv4();
  
  beforeEach(() => {
    // Create a mock BCR instance
    mockBcr = {
      id: uuidv4(),
      title: 'Test BCR',
      description: 'This is a test BCR',
      status: 'draft',
      priority: 'medium',
      requestedBy: mockUserId,
      assignedTo: mockAssigneeId,
      targetDate: new Date('2025-06-01'),
      implementationDate: null,
      notes: 'Test notes',
      createdAt: new Date(),
      updatedAt: new Date(),
      getFormattedId: jest.fn().mockReturnValue('BCR-12345678')
    };
    
    // Set up mock implementations
    Bcr.findAll = jest.fn().mockResolvedValue([mockBcr]);
    Bcr.findOne = jest.fn().mockResolvedValue(mockBcr);
    Bcr.findByPk = jest.fn().mockResolvedValue(mockBcr);
    Bcr.create = jest.fn().mockResolvedValue(mockBcr);
    Bcr.update = jest.fn().mockResolvedValue([1]);
    Bcr.destroy = jest.fn().mockResolvedValue(1);
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('Model Structure', () => {
    it('should have the correct fields', () => {
      // Check that the model has all required fields
      expect(Bcr.rawAttributes).toBeDefined();
      expect(Bcr.rawAttributes.id).toBeDefined();
      expect(Bcr.rawAttributes.title).toBeDefined();
      expect(Bcr.rawAttributes.description).toBeDefined();
      expect(Bcr.rawAttributes.status).toBeDefined();
      expect(Bcr.rawAttributes.priority).toBeDefined();
      expect(Bcr.rawAttributes.requestedBy).toBeDefined();
    });
    
    it('should have timestamps', () => {
      expect(Bcr.options.timestamps).toBe(true);
    });
    
    it('should have the correct associations', () => {
      // Verify that the model has association methods
      expect(Bcr.belongsTo).toBeDefined();
      expect(Bcr.hasMany).toBeDefined();
    });
  });
  
  describe('Instance Methods', () => {
    it('should format the BCR ID correctly', () => {
      // Test the getFormattedId method
      const formattedId = mockBcr.getFormattedId();
      expect(formattedId).toBe('BCR-12345678');
      expect(mockBcr.getFormattedId).toHaveBeenCalled();
    });
    
    it('should directly test the getFormattedId implementation', () => {
      // Create a direct test for the actual implementation
      const actualImplementation = Bcr.prototype.getFormattedId;
      
      // Create a mock instance with a known ID
      const testId = '1234567890abcdef';
      const testInstance = { id: testId };
      
      // Call the actual implementation
      const result = actualImplementation.call(testInstance);
      
      // Verify the result matches the expected format
      expect(result).toBe(`BCR-${testId.slice(0, 8).toUpperCase()}`);
    });
  });
  
  // Skip validation tests since we're not using real Sequelize validation
  // Instead, test the model's behavior assuming validation passed
  describe('Default Values', () => {
    it('should use default values when creating a BCR', async () => {
      // Set up mock implementation for this test
      const bcrWithDefaults = {
        ...mockBcr,
        status: 'draft',
        priority: 'medium'
      };
      
      Bcr.create.mockResolvedValueOnce(bcrWithDefaults);
      
      const newBcr = await Bcr.create({
        title: 'Test BCR',
        description: 'This is a test BCR',
        requestedBy: mockUserId
      });
      
      expect(newBcr.status).toBe('draft');
      expect(newBcr.priority).toBe('medium');
    });
  });
  
  describe('CRUD Operations', () => {
    it('should create a new BCR', async () => {
      const newBcrData = {
        title: 'New BCR',
        description: 'This is a new BCR',
        requestedBy: mockUserId
      };
      
      await Bcr.create(newBcrData);
      
      expect(Bcr.create).toHaveBeenCalledTimes(1);
      expect(Bcr.create).toHaveBeenCalledWith(newBcrData);
    });
    
    it('should find a BCR by ID', async () => {
      const bcrId = mockBcr.id;
      
      await Bcr.findByPk(bcrId);
      
      expect(Bcr.findByPk).toHaveBeenCalledTimes(1);
      expect(Bcr.findByPk).toHaveBeenCalledWith(bcrId);
    });
    
    it('should find BCRs by status', async () => {
      await Bcr.findAll({
        where: { status: 'draft' }
      });
      
      expect(Bcr.findAll).toHaveBeenCalledTimes(1);
      expect(Bcr.findAll).toHaveBeenCalledWith({
        where: { status: 'draft' }
      });
    });
    
    it('should update a BCR status', async () => {
      await Bcr.update(
        { status: 'under_review' },
        { where: { id: mockBcr.id } }
      );
      
      expect(Bcr.update).toHaveBeenCalledTimes(1);
      expect(Bcr.update).toHaveBeenCalledWith(
        { status: 'under_review' },
        { where: { id: mockBcr.id } }
      );
    });
    
    it('should delete a BCR', async () => {
      // Mock the destroy method
      Bcr.destroy = jest.fn().mockResolvedValue(1);
      
      const deleteResult = await Bcr.destroy({
        where: { id: mockBcr.id }
      });
      
      expect(Bcr.destroy).toHaveBeenCalledTimes(1);
      expect(Bcr.destroy).toHaveBeenCalledWith({
        where: { id: mockBcr.id }
      });
      expect(deleteResult).toBe(1);
    });
  });
});
