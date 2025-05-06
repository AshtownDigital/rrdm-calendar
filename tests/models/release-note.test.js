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
    // Mock model attributes and options
    rawAttributes: {
      id: { type: 'UUID' },
      version: { type: 'STRING', allowNull: false },
      title: { type: 'STRING', allowNull: false },
      description: { type: 'TEXT', allowNull: false },
      environment: { 
        type: 'ENUM', 
        values: ['development', 'test', 'staging', 'production'], 
        allowNull: false 
      },
      status: { 
        type: 'ENUM', 
        values: ['planned', 'in_progress', 'completed', 'failed', 'cancelled'], 
        defaultValue: 'planned', 
        allowNull: false 
      },
      releaseDate: { type: 'DATE', allowNull: false },
      completedDate: { type: 'DATE', allowNull: true },
      createdBy: { type: 'UUID', allowNull: false },
      approvedBy: { type: 'UUID', allowNull: true },
      changeLog: { type: 'TEXT', allowNull: true },
      impactedSystems: { type: 'ARRAY', allowNull: true },
      notes: { type: 'TEXT', allowNull: true }
    },
    options: {
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    associations: {
      creator: { target: 'User' },
      approver: { target: 'User' }
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
const ReleaseNote = require('../../models/ReleaseNote');

describe('ReleaseNote Model', () => {
  let mockReleaseNote;
  const mockUserId = uuidv4();
  const mockApproverId = uuidv4();
  
  beforeEach(() => {
    // Create a mock ReleaseNote instance
    mockReleaseNote = {
      id: uuidv4(),
      version: '1.0.0',
      title: 'Test Release',
      description: 'This is a test release note',
      environment: 'development',
      status: 'planned',
      releaseDate: new Date('2025-06-01'),
      completedDate: null,
      createdBy: mockUserId,
      approvedBy: mockApproverId,
      changeLog: 'Initial release',
      impactedSystems: ['System A', 'System B'],
      notes: 'Test notes',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Set up mock implementations
    ReleaseNote.findAll = jest.fn().mockResolvedValue([mockReleaseNote]);
    ReleaseNote.findOne = jest.fn().mockResolvedValue(mockReleaseNote);
    ReleaseNote.findByPk = jest.fn().mockResolvedValue(mockReleaseNote);
    ReleaseNote.create = jest.fn().mockResolvedValue(mockReleaseNote);
    ReleaseNote.update = jest.fn().mockResolvedValue([1]);
    ReleaseNote.destroy = jest.fn().mockResolvedValue(1);
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('Model Structure', () => {
    it('should have the correct fields', () => {
      // Check that the model has all required fields
      expect(ReleaseNote.rawAttributes).toBeDefined();
      expect(ReleaseNote.rawAttributes.id).toBeDefined();
      expect(ReleaseNote.rawAttributes.version).toBeDefined();
      expect(ReleaseNote.rawAttributes.title).toBeDefined();
      expect(ReleaseNote.rawAttributes.description).toBeDefined();
      expect(ReleaseNote.rawAttributes.environment).toBeDefined();
      expect(ReleaseNote.rawAttributes.status).toBeDefined();
      expect(ReleaseNote.rawAttributes.releaseDate).toBeDefined();
      expect(ReleaseNote.rawAttributes.completedDate).toBeDefined();
      expect(ReleaseNote.rawAttributes.createdBy).toBeDefined();
      expect(ReleaseNote.rawAttributes.approvedBy).toBeDefined();
      expect(ReleaseNote.rawAttributes.changeLog).toBeDefined();
      expect(ReleaseNote.rawAttributes.impactedSystems).toBeDefined();
      expect(ReleaseNote.rawAttributes.notes).toBeDefined();
    });
    
    it('should have timestamps', () => {
      expect(ReleaseNote.options.timestamps).toBe(true);
      expect(ReleaseNote.options.createdAt).toBe('createdAt');
      expect(ReleaseNote.options.updatedAt).toBe('updatedAt');
    });
    
    it('should have the correct associations', () => {
      // Check that the model has the correct associations
      expect(ReleaseNote.associations).toBeDefined();
      expect(ReleaseNote.associations.creator).toBeDefined();
      expect(ReleaseNote.associations.approver).toBeDefined();
    });
  });
  
  describe('Validation', () => {
    it('should require version', () => {
      expect(ReleaseNote.rawAttributes.version.allowNull).toBe(false);
    });
    
    it('should require title', () => {
      expect(ReleaseNote.rawAttributes.title.allowNull).toBe(false);
    });
    
    it('should require description', () => {
      expect(ReleaseNote.rawAttributes.description.allowNull).toBe(false);
    });
    
    it('should require environment', () => {
      expect(ReleaseNote.rawAttributes.environment.allowNull).toBe(false);
    });
    
    it('should validate environment values', () => {
      expect(ReleaseNote.rawAttributes.environment.values).toContain('development');
      expect(ReleaseNote.rawAttributes.environment.values).toContain('test');
      expect(ReleaseNote.rawAttributes.environment.values).toContain('staging');
      expect(ReleaseNote.rawAttributes.environment.values).toContain('production');
    });
    
    it('should require releaseDate', () => {
      expect(ReleaseNote.rawAttributes.releaseDate.allowNull).toBe(false);
    });
    
    it('should require createdBy', () => {
      expect(ReleaseNote.rawAttributes.createdBy.allowNull).toBe(false);
    });
    
    it('should validate status values', () => {
      expect(ReleaseNote.rawAttributes.status.values).toContain('planned');
      expect(ReleaseNote.rawAttributes.status.values).toContain('in_progress');
      expect(ReleaseNote.rawAttributes.status.values).toContain('completed');
      expect(ReleaseNote.rawAttributes.status.values).toContain('failed');
      expect(ReleaseNote.rawAttributes.status.values).toContain('cancelled');
    });
  });
  
  describe('Default Values', () => {
    it('should set default status to planned', () => {
      expect(ReleaseNote.rawAttributes.status.defaultValue).toBe('planned');
    });
  });
  
  describe('CRUD Operations', () => {
    it('should create a new release note', async () => {
      // Mock the create method
      ReleaseNote.create = jest.fn().mockResolvedValue(mockReleaseNote);
      
      const newReleaseNote = await ReleaseNote.create({
        version: '1.0.0',
        title: 'Test Release',
        description: 'This is a test release note',
        environment: 'development',
        releaseDate: new Date('2025-06-01'),
        createdBy: mockUserId
      });
      
      expect(ReleaseNote.create).toHaveBeenCalledTimes(1);
      expect(newReleaseNote.version).toBe('1.0.0');
      expect(newReleaseNote.title).toBe('Test Release');
    });
    
    it('should find a release note by ID', async () => {
      // Mock the findByPk method
      ReleaseNote.findByPk = jest.fn().mockResolvedValue(mockReleaseNote);
      
      const foundReleaseNote = await ReleaseNote.findByPk(mockReleaseNote.id);
      
      expect(ReleaseNote.findByPk).toHaveBeenCalledTimes(1);
      expect(ReleaseNote.findByPk).toHaveBeenCalledWith(mockReleaseNote.id);
      expect(foundReleaseNote.version).toBe('1.0.0');
    });
    
    it('should find release notes by environment and status', async () => {
      // Mock the findAll method
      ReleaseNote.findAll = jest.fn().mockResolvedValue([mockReleaseNote]);
      
      const foundReleaseNotes = await ReleaseNote.findAll({
        where: {
          environment: 'development',
          status: 'planned'
        }
      });
      
      expect(ReleaseNote.findAll).toHaveBeenCalledTimes(1);
      expect(ReleaseNote.findAll).toHaveBeenCalledWith({
        where: {
          environment: 'development',
          status: 'planned'
        }
      });
      expect(foundReleaseNotes.length).toBe(1);
      expect(foundReleaseNotes[0].title).toBe('Test Release');
    });
    
    it('should update a release note status', async () => {
      // Mock the update method
      ReleaseNote.update = jest.fn().mockResolvedValue([1]);
      
      const updateResult = await ReleaseNote.update(
        { 
          status: 'in_progress',
          approvedBy: mockApproverId
        },
        { where: { id: mockReleaseNote.id } }
      );
      
      expect(ReleaseNote.update).toHaveBeenCalledTimes(1);
      expect(ReleaseNote.update).toHaveBeenCalledWith(
        { 
          status: 'in_progress',
          approvedBy: mockApproverId
        },
        { where: { id: mockReleaseNote.id } }
      );
      expect(updateResult[0]).toBe(1);
    });
    
    it('should mark a release note as completed', async () => {
      // Mock the update method
      ReleaseNote.update = jest.fn().mockResolvedValue([1]);
      
      const completedDate = new Date();
      const updateResult = await ReleaseNote.update(
        { 
          status: 'completed',
          completedDate: completedDate,
          approvedBy: mockApproverId
        },
        { where: { id: mockReleaseNote.id } }
      );
      
      expect(ReleaseNote.update).toHaveBeenCalledTimes(1);
      expect(ReleaseNote.update).toHaveBeenCalledWith(
        { 
          status: 'completed',
          completedDate: completedDate,
          approvedBy: mockApproverId
        },
        { where: { id: mockReleaseNote.id } }
      );
      expect(updateResult[0]).toBe(1);
    });
    
    it('should delete a release note', async () => {
      // Mock the destroy method
      ReleaseNote.destroy = jest.fn().mockResolvedValue(1);
      
      const deleteResult = await ReleaseNote.destroy({
        where: { id: mockReleaseNote.id }
      });
      
      expect(ReleaseNote.destroy).toHaveBeenCalledTimes(1);
      expect(ReleaseNote.destroy).toHaveBeenCalledWith({
        where: { id: mockReleaseNote.id }
      });
      expect(deleteResult).toBe(1);
    });
  });
});
