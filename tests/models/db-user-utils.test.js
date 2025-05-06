/**
 * Unit tests for db-user-utils.js
 */
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const dbUserUtils = require('../../utils/db-user-utils');
const { User } = require('../../models');

// Mock the User model
jest.mock('../../models', () => {
  return {
    User: {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn()
    }
  };
});

// Mock bcrypt
jest.mock('bcryptjs', () => {
  return {
    genSalt: jest.fn().mockImplementation(() => Promise.resolve('mock-salt')),
    hash: jest.fn().mockImplementation((password, salt) => Promise.resolve('hashedPassword')),
    compare: jest.fn().mockImplementation((plainPassword, hashedPassword) => {
      return Promise.resolve(plainPassword === 'correctPassword');
    })
  };
});

// Mock UUID
jest.mock('uuid', () => {
  return {
    v4: jest.fn().mockReturnValue('mock-uuid')
  };
});

describe('DB User Utils', () => {
  let mockUser;
  const userId = uuidv4();
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a mock user
    mockUser = {
      id: userId,
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'business',
      active: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      toJSON: jest.fn().mockReturnValue({
        id: userId,
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: 'business',
        active: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      update: jest.fn().mockResolvedValue(true),
      destroy: jest.fn().mockResolvedValue(true)
    };
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    User.findAll.mockResolvedValue([mockUser]);
    User.findOne.mockResolvedValue(mockUser);
    User.findByPk.mockResolvedValue(mockUser);
    User.create.mockResolvedValue(mockUser);
    User.update.mockResolvedValue([1]);
  });
  
  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const users = await dbUserUtils.getAllUsers();
      
      expect(User.findAll).toHaveBeenCalledTimes(1);
      expect(User.findAll).toHaveBeenCalledWith({
        order: [['createdAt', 'ASC']]
      });
      expect(users).toEqual([mockUser]);
    });
    
    it('should handle errors and return empty array', async () => {
      User.findAll.mockRejectedValueOnce(new Error('Database error'));
      
      const users = await dbUserUtils.getAllUsers();
      
      expect(User.findAll).toHaveBeenCalledTimes(1);
      expect(users).toEqual([]);
    });
  });
  
  describe('findUserByEmail', () => {
    it('should find a user by email', async () => {
      const user = await dbUserUtils.findUserByEmail('test@example.com');
      
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledWith({
        where: {
          email: {
            [Op.iLike]: 'test@example.com'
          }
        }
      });
      expect(user).toEqual(mockUser);
    });
    
    it('should return null if user not found', async () => {
      User.findOne.mockResolvedValueOnce(null);
      
      const user = await dbUserUtils.findUserByEmail('nonexistent@example.com');
      
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(user).toBeNull();
    });
    
    it('should handle errors and return null', async () => {
      User.findOne.mockRejectedValueOnce(new Error('Database error'));
      
      const user = await dbUserUtils.findUserByEmail('test@example.com');
      
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(user).toBeNull();
    });
  });
  
  describe('findUserById', () => {
    it('should find a user by ID', async () => {
      const user = await dbUserUtils.findUserById(userId);
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(User.findByPk).toHaveBeenCalledWith(userId);
      expect(user).toEqual(mockUser);
    });
    
    it('should return null if user not found', async () => {
      User.findByPk.mockResolvedValueOnce(null);
      
      const user = await dbUserUtils.findUserById('nonexistent-id');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(user).toBeNull();
    });
    
    it('should handle errors and return null', async () => {
      User.findByPk.mockRejectedValueOnce(new Error('Database error'));
      
      const user = await dbUserUtils.findUserById(userId);
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(user).toBeNull();
    });
  });
  
  describe('createUser', () => {
    const userData = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
      role: 'business'
    };
    
    it('should create a new user', async () => {
      // Mock findUserByEmail to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null);
      
      const newUser = await dbUserUtils.createUser(userData);
      
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.create).toHaveBeenCalledTimes(1);
      expect(User.create).toHaveBeenCalledWith({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        active: true
      });
      expect(mockUser.toJSON).toHaveBeenCalledTimes(1);
      expect(newUser).not.toHaveProperty('password');
    });
    
    it('should throw an error if user already exists', async () => {
      // Mock findUserByEmail to return a user (user exists)
      User.findOne.mockResolvedValueOnce(mockUser);
      
      await expect(dbUserUtils.createUser(userData)).rejects.toThrow('User with this email already exists');
      
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.create).not.toHaveBeenCalled();
    });
    
    it('should use default name if not provided', async () => {
      // Mock findUserByEmail to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null);
      
      const userDataWithoutName = {
        email: 'new@example.com',
        password: 'password123',
        role: 'business'
      };
      
      await dbUserUtils.createUser(userDataWithoutName);
      
      expect(User.create).toHaveBeenCalledWith({
        email: userDataWithoutName.email,
        password: userDataWithoutName.password,
        name: 'new', // Default name from email
        role: userDataWithoutName.role,
        active: true
      });
    });
    
    it('should use default role if not provided', async () => {
      // Mock findUserByEmail to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null);
      
      const userDataWithoutRole = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      };
      
      await dbUserUtils.createUser(userDataWithoutRole);
      
      expect(User.create).toHaveBeenCalledWith({
        email: userDataWithoutRole.email,
        password: userDataWithoutRole.password,
        name: userDataWithoutRole.name,
        role: 'business', // Default role
        active: true
      });
    });
    
    it('should handle and propagate errors', async () => {
      // Mock findUserByEmail to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null);
      
      // Mock create to throw an error
      User.create.mockRejectedValueOnce(new Error('Database error'));
      
      await expect(dbUserUtils.createUser(userData)).rejects.toThrow('Database error');
      
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.create).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('updateLastLogin', () => {
    it('should update the last login time', async () => {
      const result = await dbUserUtils.updateLastLogin(userId);
      
      expect(User.update).toHaveBeenCalledTimes(1);
      expect(User.update).toHaveBeenCalledWith(
        { lastLogin: expect.any(Date) },
        { where: { id: userId } }
      );
      expect(result).toBe(true);
    });
    
    it('should handle errors and return false', async () => {
      User.update.mockRejectedValueOnce(new Error('Database error'));
      
      const result = await dbUserUtils.updateLastLogin(userId);
      
      expect(User.update).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });
  });
  
  describe('updateUser', () => {
    const updateData = {
      name: 'Updated Name',
      role: 'admin'
    };
    
    it('should update a user', async () => {
      const updatedUser = await dbUserUtils.updateUser(userId, updateData);
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(User.findByPk).toHaveBeenCalledWith(userId);
      expect(mockUser.update).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledWith(updateData);
      expect(mockUser.toJSON).toHaveBeenCalledTimes(1);
      expect(updatedUser).not.toHaveProperty('password');
    });
    
    it('should throw an error if user not found', async () => {
      User.findByPk.mockResolvedValueOnce(null);
      
      await expect(dbUserUtils.updateUser(userId, updateData)).rejects.toThrow('User not found');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
    });
    
    it('should check for email uniqueness when updating email', async () => {
      const updateWithEmail = {
        email: 'new@example.com',
        name: 'Updated Name'
      };
      
      // First findByPk call returns the user being updated
      User.findByPk.mockResolvedValueOnce(mockUser);
      
      // findUserByEmail should return null (no user with that email)
      User.findOne.mockResolvedValueOnce(null);
      
      await dbUserUtils.updateUser(userId, updateWithEmail);
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledWith(updateWithEmail);
    });
    
    it('should throw an error if email is already in use by another user', async () => {
      const updateWithEmail = {
        email: 'existing@example.com',
        name: 'Updated Name'
      };
      
      // First findByPk call returns the user being updated
      User.findByPk.mockResolvedValueOnce(mockUser);
      
      // findUserByEmail returns a different user with that email
      const anotherUser = { ...mockUser, id: 'another-id' };
      User.findOne.mockResolvedValueOnce(anotherUser);
      
      await expect(dbUserUtils.updateUser(userId, updateWithEmail)).rejects.toThrow('Email is already in use by another user');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(mockUser.update).not.toHaveBeenCalled();
    });
    
    it('should allow updating to the same email', async () => {
      const updateWithSameEmail = {
        email: 'test@example.com', // Same as mockUser.email
        name: 'Updated Name'
      };
      
      // Important: Looking at the updateUser function, it only calls findOne if the email is different
      // Since we're updating with the same email, findOne won't be called
      
      // Reset all mocks for this specific test
      jest.clearAllMocks();
      
      // Set up the mocks for this test
      User.findByPk.mockResolvedValue(mockUser);
      mockUser.update = jest.fn().mockResolvedValue(true);
      
      await dbUserUtils.updateUser(userId, updateWithSameEmail);
      
      // Since we're updating with the same email, findOne should NOT be called
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledTimes(0); // This is the key change - findOne is not called
      expect(mockUser.update).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledWith(updateWithSameEmail);
    });
    
    it('should handle and propagate errors', async () => {
      mockUser.update.mockRejectedValueOnce(new Error('Database error'));
      
      await expect(dbUserUtils.updateUser(userId, updateData)).rejects.toThrow('Database error');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('updateUserPassword', () => {
    it('should update a user password', async () => {
      const result = await dbUserUtils.updateUserPassword(userId, 'newpassword123');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(User.findByPk).toHaveBeenCalledWith(userId);
      expect(mockUser.update).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledWith({ password: 'newpassword123' });
      expect(result).toBe(true);
    });
    
    it('should throw an error if user not found', async () => {
      User.findByPk.mockResolvedValueOnce(null);
      
      await expect(dbUserUtils.updateUserPassword(userId, 'newpassword123')).rejects.toThrow('User not found');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
    });
    
    it('should handle and propagate errors', async () => {
      mockUser.update.mockRejectedValueOnce(new Error('Database error'));
      
      await expect(dbUserUtils.updateUserPassword(userId, 'newpassword123')).rejects.toThrow('Database error');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('toggleUserActive', () => {
    it('should activate a user', async () => {
      const result = await dbUserUtils.toggleUserActive(userId, true);
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(User.findByPk).toHaveBeenCalledWith(userId);
      expect(mockUser.update).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledWith({ active: true });
      expect(result).toBe(true);
    });
    
    it('should deactivate a user', async () => {
      const result = await dbUserUtils.toggleUserActive(userId, false);
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(User.findByPk).toHaveBeenCalledWith(userId);
      expect(mockUser.update).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledWith({ active: false });
      expect(result).toBe(true);
    });
    
    it('should throw an error if user not found', async () => {
      User.findByPk.mockResolvedValueOnce(null);
      
      await expect(dbUserUtils.toggleUserActive(userId, true)).rejects.toThrow('User not found');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
    });
    
    it('should handle and propagate errors', async () => {
      mockUser.update.mockRejectedValueOnce(new Error('Database error'));
      
      await expect(dbUserUtils.toggleUserActive(userId, true)).rejects.toThrow('Database error');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const result = await dbUserUtils.deleteUser(userId);
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(User.findByPk).toHaveBeenCalledWith(userId);
      expect(mockUser.destroy).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
    
    it('should throw an error if user not found', async () => {
      User.findByPk.mockResolvedValueOnce(null);
      
      await expect(dbUserUtils.deleteUser(userId)).rejects.toThrow('User not found');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
    });
    
    it('should handle and propagate errors', async () => {
      mockUser.destroy.mockRejectedValueOnce(new Error('Database error'));
      
      await expect(dbUserUtils.deleteUser(userId)).rejects.toThrow('Database error');
      
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(mockUser.destroy).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('validatePassword', () => {
    it('should validate a correct password', async () => {
      bcrypt.compare.mockResolvedValueOnce(true);
      
      const isValid = await dbUserUtils.validatePassword('correctPassword', 'hashedPassword');
      
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith('correctPassword', 'hashedPassword');
      expect(isValid).toBe(true);
    });
    
    it('should not validate an incorrect password', async () => {
      bcrypt.compare.mockResolvedValueOnce(false);
      
      const isValid = await dbUserUtils.validatePassword('wrongPassword', 'hashedPassword');
      
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', 'hashedPassword');
      expect(isValid).toBe(false);
    });
  });
  
  // Tests for migrateUsersFromJson function
  describe('migrateUsersFromJson', () => {
    const jsonUsers = [
      {
        email: 'user1@example.com',
        password: 'hashedPassword1',
        name: 'User 1',
        role: 'admin',
        active: true,
        lastLogin: '2023-01-01T00:00:00.000Z',
        createdAt: '2023-01-01T00:00:00.000Z'
      },
      {
        email: 'user2@example.com',
        password: 'hashedPassword2',
        name: 'User 2',
        role: 'business',
        active: true,
        lastLogin: null,
        createdAt: '2023-01-02T00:00:00.000Z'
      }
    ];
    
    it('should migrate users from JSON', async () => {
      // Reset mocks for this test
      jest.clearAllMocks();
      
      // Mock UUID v4
      const uuidMock = require('uuid');
      uuidMock.v4.mockReturnValue('mock-uuid-1234');
      
      // Mock findUserByEmail to return null (users don't exist)
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      
      // Mock console.log to avoid cluttering test output
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      const result = await dbUserUtils.migrateUsersFromJson(jsonUsers);
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      expect(User.findOne).toHaveBeenCalledTimes(2);
      expect(User.create).toHaveBeenCalledTimes(2);
      
      // Check first user creation
      expect(User.create.mock.calls[0][0]).toEqual({
        id: 'mock-uuid-1234',
        email: 'user1@example.com',
        password: 'hashedPassword1',
        name: 'User 1',
        role: 'admin',
        active: true,
        lastLogin: expect.any(Date),
        createdAt: expect.any(Date)
      });
      
      // Specifically verify the hooks: false option is passed
      expect(User.create.mock.calls[0][1]).toEqual({ hooks: false });
      
      expect(result).toBe(true);
    });
    
    it('should handle users with missing optional fields', async () => {
      // Reset mocks for this test
      jest.clearAllMocks();
      
      // Mock UUID v4
      const uuidMock = require('uuid');
      uuidMock.v4.mockReturnValue('mock-uuid-5678');
      
      // Create a user with minimal fields
      const minimalUser = {
        email: 'minimal@example.com',
        password: 'hashedPassword',
        name: 'Minimal User'
        // No role, active, lastLogin, or createdAt
      };
      
      // Mock findUserByEmail to return null (user doesn't exist)
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      
      // Mock console.log to avoid cluttering test output
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      const result = await dbUserUtils.migrateUsersFromJson([minimalUser]);
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.create).toHaveBeenCalledTimes(1);
      
      // Verify default values are used for missing fields
      expect(User.create.mock.calls[0][0]).toEqual({
        id: 'mock-uuid-5678',
        email: 'minimal@example.com',
        password: 'hashedPassword',
        name: 'Minimal User',
        role: undefined, // Will use default from model
        active: true, // Default to true if not specified
        lastLogin: null,
        createdAt: expect.any(Date) // Should use current date
      });
      
      // Verify hooks: false is always passed
      expect(User.create.mock.calls[0][1]).toEqual({ hooks: false });
      
      expect(result).toBe(true);
    });
    
    it('should skip existing users', async () => {
      // Reset mocks for this test
      jest.clearAllMocks();
      
      // Mock UUID v4
      const uuidMock = require('uuid');
      uuidMock.v4.mockReturnValue('mock-uuid-5678');
      
      // Mock findUserByEmail to return a user for the first call (user exists)
      // and null for the second call (user doesn't exist)
      User.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      User.create.mockResolvedValue(mockUser);
      
      // Mock console.log to avoid cluttering test output
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      const result = await dbUserUtils.migrateUsersFromJson(jsonUsers);
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      expect(User.findOne).toHaveBeenCalledTimes(2);
      expect(User.create).toHaveBeenCalledTimes(1);
      
      // Check second user creation (first one was skipped)
      expect(User.create.mock.calls[0][0]).toEqual({
        id: 'mock-uuid-5678',
        email: 'user2@example.com',
        password: 'hashedPassword2',
        name: 'User 2',
        role: 'business',
        active: true,
        lastLogin: null,
        createdAt: expect.any(Date)
      });
      expect(User.create.mock.calls[0][1]).toEqual({ hooks: false });
      
      expect(result).toBe(true);
    });
    
    it('should handle and return false on errors', async () => {
      // Reset mocks for this test
      jest.clearAllMocks();
      
      // Mock findUserByEmail to return null for the first user (to pass that check)
      // and then have User.create throw an error
      User.findOne.mockResolvedValueOnce(null);
      User.create.mockRejectedValueOnce(new Error('Database error'));
      
      // Mock console.error to avoid cluttering test output
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      const result = await dbUserUtils.migrateUsersFromJson(jsonUsers);
      
      // Restore console.error
      console.error = originalConsoleError;
      
      // Verify the function returns false on error
      expect(User.findOne).toHaveBeenCalled();
      expect(User.create).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
