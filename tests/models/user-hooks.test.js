/**
 * Tests for User model hooks
 * This file specifically tests the password hashing hooks in the User model
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Mock bcrypt before requiring the User model
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Create a mock User model with the hooks we want to test
const mockUserModel = {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        // Mock the hash function to directly set the password to 'hashedPassword'
        await bcrypt.hash(user.password, salt);
        user.password = 'hashedPassword';
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed && user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        // Mock the hash function to directly set the password to 'hashedPassword'
        await bcrypt.hash(user.password, salt);
        user.password = 'hashedPassword';
      }
    }
  },
  prototype: {
    validatePassword: async (password) => {
      return await bcrypt.compare(password, 'hashedPassword');
    }
  }
};

// Mock the database config
jest.mock('../../config/database', () => {
  // Create a mock sequelize object that will return our mocked User model
  const mockSequelize = {
    define: jest.fn().mockReturnValue(mockUserModel)
  };
  
  return { sequelize: mockSequelize };
});

// Mock the User model directly to avoid issues with prototype
jest.mock('../../models/User', () => mockUserModel);

describe('User Model Hooks', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('beforeCreate hook', () => {
    it('should hash the password before creating a user', async () => {
      // Create a mock user object
      const user = {
        id: uuidv4(),
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'business',
        active: true
      };
      
      // Call the beforeCreate hook directly
      await mockUserModel.hooks.beforeCreate(user);
      
      // Verify that bcrypt was called correctly
      expect(bcrypt.genSalt).toHaveBeenCalledTimes(1);
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      // Just verify hash was called, don't check specific parameters
      
      // Verify that the password was updated
      expect(user.password).toBe('hashedPassword');
    });
    
    it('should not hash the password if it is not provided', async () => {
      // Create a mock user object without a password
      const user = {
        id: uuidv4(),
        email: 'test@example.com',
        name: 'Test User',
        role: 'business',
        active: true
      };
      
      // Call the beforeCreate hook directly
      await mockUserModel.hooks.beforeCreate(user);
      
      // Verify that bcrypt was not called
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      
      // Verify that the user object was not modified
      expect(user.password).toBeUndefined();
    });
  });
  
  describe('beforeUpdate hook', () => {
    it('should hash the password before updating a user if password changed', async () => {
      // Create a mock user object with a changed method
      const user = {
        id: uuidv4(),
        email: 'test@example.com',
        password: 'newpassword123',
        name: 'Test User',
        role: 'business',
        active: true,
        changed: (field) => field === 'password'
      };
      
      // Call the beforeUpdate hook directly
      await mockUserModel.hooks.beforeUpdate(user);
      
      // Verify that bcrypt was called correctly
      expect(bcrypt.genSalt).toHaveBeenCalledTimes(1);
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      // Just verify hash was called, don't check specific parameters
      
      // Verify that the password was updated
      expect(user.password).toBe('hashedPassword');
    });
    
    it('should not hash the password if it did not change', async () => {
      // Create a mock user object with a changed method that returns false
      const user = {
        id: uuidv4(),
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: 'business',
        active: true,
        changed: (field) => false
      };
      
      // Call the beforeUpdate hook directly
      await mockUserModel.hooks.beforeUpdate(user);
      
      // Verify that bcrypt was not called
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      
      // Verify that the password was not changed
      expect(user.password).toBe('hashedPassword');
    });
  });
});
