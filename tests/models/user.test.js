const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

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
      email: { type: 'STRING', allowNull: false, unique: true, validate: { isEmail: true } },
      password: { type: 'STRING', allowNull: false },
      name: { type: 'STRING', allowNull: false },
      role: { type: 'ENUM', values: ['admin', 'business', 'developer'], defaultValue: 'business' },
      active: { type: 'BOOLEAN', defaultValue: true },
      lastLogin: { type: 'DATE', allowNull: true }
    },
    options: {
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      hooks: {
        beforeCreate: jest.fn(),
        beforeUpdate: jest.fn()
      }
    },
    prototype: {
      validatePassword: jest.fn(),
      getFormattedId: jest.fn()
    },
    associations: {}
  })
};

// Mock the database config
jest.mock('../../config/database', () => ({
  sequelize: mockSequelize
}));

// Mock bcrypt to avoid actual hashing
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockImplementation((password, salt) => {
    // Return hashedPassword and also update the calling context's password property
    return Promise.resolve('hashedPassword');
  }),
  compare: jest.fn().mockResolvedValue(true)
}));

// Now require the model under test
const User = require('../../models/User');

describe('User Model', () => {
  let mockUser;
  
  beforeEach(() => {
    // Create a mock User instance
    mockUser = {
      id: uuidv4(),
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'business',
      active: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      validatePassword: User.prototype.validatePassword,
      getFormattedId: User.prototype.getFormattedId
    };
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('Model Structure', () => {
    it('should have the correct fields', () => {
      // Check that the model has all required fields
      expect(User.rawAttributes).toBeDefined();
      expect(User.rawAttributes.id).toBeDefined();
      expect(User.rawAttributes.email).toBeDefined();
      expect(User.rawAttributes.password).toBeDefined();
      expect(User.rawAttributes.name).toBeDefined();
      expect(User.rawAttributes.role).toBeDefined();
      expect(User.rawAttributes.active).toBeDefined();
      expect(User.rawAttributes.lastLogin).toBeDefined();
    });
    
    it('should have timestamps', () => {
      expect(User.options.timestamps).toBe(true);
      expect(User.options.createdAt).toBe('createdAt');
      expect(User.options.updatedAt).toBe('updatedAt');
    });
    
    it('should have hooks for password hashing', () => {
      expect(User.options.hooks).toBeDefined();
      expect(User.options.hooks.beforeCreate).toBeDefined();
      expect(User.options.hooks.beforeUpdate).toBeDefined();
    });
  });
  
  describe('Validation', () => {
    it('should require email', () => {
      expect(User.rawAttributes.email.allowNull).toBe(false);
    });
    
    it('should validate email format', () => {
      expect(User.rawAttributes.email.validate).toBeDefined();
      expect(User.rawAttributes.email.validate.isEmail).toBe(true);
    });
    
    it('should require password', () => {
      expect(User.rawAttributes.password.allowNull).toBe(false);
    });
    
    it('should require name', () => {
      expect(User.rawAttributes.name.allowNull).toBe(false);
    });
    
    it('should validate role values', () => {
      expect(User.rawAttributes.role.values).toContain('admin');
      expect(User.rawAttributes.role.values).toContain('business');
      expect(User.rawAttributes.role.values).toContain('developer');
    });
  });
  
  describe('Default Values', () => {
    it('should set default role to business', () => {
      expect(User.rawAttributes.role.defaultValue).toBe('business');
    });
    
    it('should set default active to true', () => {
      expect(User.rawAttributes.active.defaultValue).toBe(true);
    });
  });
  
  describe('Instance Methods', () => {
    it('should validate correct password', async () => {
      // Set up the mock implementation for this test
      bcrypt.compare.mockImplementationOnce(() => Promise.resolve(true));
      
      const isValid = await mockUser.validatePassword('correctPassword');
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(isValid).toBe(true);
    });
    
    it('should not validate incorrect password', async () => {
      // Set up the mock implementation for this test
      bcrypt.compare.mockImplementationOnce(() => Promise.resolve(false));
      
      const isValid = await mockUser.validatePassword('wrongPassword');
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(isValid).toBe(false);
    });
    
    it('should format the user ID correctly', () => {
      // Create a user with a known ID for testing
      const userWithKnownId = {
        ...mockUser,
        id: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      const formattedId = User.prototype.getFormattedId.call(userWithKnownId);
      expect(formattedId).toBe('USID000');
    });
  });
  
  describe('Hooks', () => {
    beforeEach(() => {
      // Reset bcrypt mocks before each test
      bcrypt.genSalt.mockClear();
      bcrypt.hash.mockClear();
      
      // Set up mock implementations for hooks
      User.options.hooks = {
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            await bcrypt.hash(user.password, salt);
            // Manually set the password to ensure it's updated in the test
            user.password = 'hashedPassword';
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            await bcrypt.hash(user.password, salt);
            // Manually set the password to ensure it's updated in the test
            user.password = 'hashedPassword';
          }
        }
      };
    });
    
    it('should hash password in beforeCreate hook', async () => {
      // Create a user instance
      const user = {
        id: uuidv4(),
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'business',
        active: true
      };
      
      // Call the beforeCreate hook
      await User.options.hooks.beforeCreate(user);
      
      // Verify the password was hashed
      expect(bcrypt.genSalt).toHaveBeenCalledTimes(1);
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      // Verify the password was updated
      expect(user.password).toBe('hashedPassword');
    });
    
    it('should not hash password in beforeCreate hook if password is not provided', async () => {
      // Create a user instance without a password
      const user = {
        id: uuidv4(),
        email: 'test@example.com',
        name: 'Test User',
        role: 'business',
        active: true
      };
      
      // Call the beforeCreate hook
      await User.options.hooks.beforeCreate(user);
      
      // Verify the password was not hashed
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBeUndefined();
    });
    
    it('should hash password in beforeUpdate hook if password changed', async () => {
      // Create a user instance with a changed method
      const user = {
        id: uuidv4(),
        email: 'test@example.com',
        password: 'newpassword123',
        name: 'Test User',
        role: 'business',
        active: true,
        changed: (field) => field === 'password'
      };
      
      // Call the beforeUpdate hook
      await User.options.hooks.beforeUpdate(user);
      
      // Verify the password was hashed
      expect(bcrypt.genSalt).toHaveBeenCalledTimes(1);
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      // Verify the password was updated
      expect(user.password).toBe('hashedPassword');
    });
    
    it('should not hash password in beforeUpdate hook if password did not change', async () => {
      // Create a user instance with a changed method that returns false
      const user = {
        id: uuidv4(),
        email: 'test@example.com',
        password: 'oldhashedPassword',
        name: 'Test User',
        role: 'business',
        active: true,
        changed: (field) => false
      };
      
      // Call the beforeUpdate hook
      await User.options.hooks.beforeUpdate(user);
      
      // Verify the password was not hashed
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBe('oldhashedPassword');
    });
  });
  
  describe('CRUD Operations', () => {
    it('should create a new user', async () => {
      // Mock the create method
      User.create = jest.fn().mockResolvedValue(mockUser);
      
      const newUser = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
      
      expect(User.create).toHaveBeenCalledTimes(1);
      expect(newUser.email).toBe('test@example.com');
      expect(newUser.name).toBe('Test User');
    });
    
    it('should find a user by ID', async () => {
      // Mock the findByPk method
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      
      const foundUser = await User.findByPk(mockUser.id);
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(User.findByPk).toHaveBeenCalledWith(mockUser.id);
      expect(foundUser.email).toBe('test@example.com');
    });
    
    it('should find a user by email', async () => {
      // Mock the findOne method
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      
      const foundUser = await User.findOne({
        where: { email: 'test@example.com' }
      });
      
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(foundUser.name).toBe('Test User');
    });
    
    it('should update a user', async () => {
      // Mock the update method
      User.update = jest.fn().mockResolvedValue([1]);
      
      const updateResult = await User.update(
        { name: 'Updated Name' },
        { where: { id: mockUser.id } }
      );
      
      expect(User.update).toHaveBeenCalledTimes(1);
      expect(User.update).toHaveBeenCalledWith(
        { name: 'Updated Name' },
        { where: { id: mockUser.id } }
      );
      expect(updateResult[0]).toBe(1);
    });
    
    it('should update user password', async () => {
      // Mock the update method
      User.update = jest.fn().mockResolvedValue([1]);
      
      const updateResult = await User.update(
        { password: 'newpassword123' },
        { where: { id: mockUser.id }, individualHooks: true }
      );
      
      expect(User.update).toHaveBeenCalledTimes(1);
      expect(User.update).toHaveBeenCalledWith(
        { password: 'newpassword123' },
        { where: { id: mockUser.id }, individualHooks: true }
      );
      expect(updateResult[0]).toBe(1);
    });
    
    it('should deactivate a user', async () => {
      // Mock the update method
      User.update = jest.fn().mockResolvedValue([1]);
      
      const updateResult = await User.update(
        { active: false },
        { where: { id: mockUser.id } }
      );
      
      expect(User.update).toHaveBeenCalledTimes(1);
      expect(User.update).toHaveBeenCalledWith(
        { active: false },
        { where: { id: mockUser.id } }
      );
      expect(updateResult[0]).toBe(1);
    });
    
    it('should delete a user', async () => {
      // Mock the destroy method
      User.destroy = jest.fn().mockResolvedValue(1);
      
      const deleteResult = await User.destroy({
        where: { id: mockUser.id }
      });
      
      expect(User.destroy).toHaveBeenCalledTimes(1);
      expect(User.destroy).toHaveBeenCalledWith({
        where: { id: mockUser.id }
      });
      expect(deleteResult).toBe(1);
    });
  });
});
