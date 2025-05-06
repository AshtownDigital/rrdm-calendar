/**
 * Unit tests for user-utils.js
 */
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const userUtils = require('../../utils/user-utils');
const { prisma } = require('../../config/prisma');

// Mock the Prisma client
jest.mock('../../config/prisma', () => {
  return {
    prisma: {
      users: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn()
      }
    }
  };
});

// Mock bcrypt
jest.mock('bcryptjs', () => {
  return {
    genSalt: jest.fn().mockResolvedValue('mock-salt'),
    hash: jest.fn().mockResolvedValue('hashedPassword'),
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

describe('User Utils', () => {
  let mockUser;
  
  beforeEach(() => {
    // Create a mock user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'business',
      active: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    prisma.users.create.mockResolvedValue(mockUser);
    prisma.users.findUnique.mockResolvedValue(null);
    prisma.users.findFirst.mockResolvedValue(null);
  });
  
  describe('createUser', () => {
    it('should create a new user with all fields provided', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        role: 'admin'
      };
      
      // Mock the salt generation and password hashing
      bcrypt.genSalt.mockResolvedValue('generated-salt');
      bcrypt.hash.mockResolvedValue('hashed-password');
      
      const result = await userUtils.createUser(userData);
      
      // Verify salt generation and password hashing
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'generated-salt');
      
      // Verify Prisma create call
      expect(prisma.users.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          password: 'hashed-password',
          name: 'New User',
          role: 'admin',
          lastLogin: null
        }
      });
      
      // Password should be removed from the result
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@example.com'); // From the mock response
    });
    
    it('should use default name when not provided', async () => {
      const userData = {
        email: 'noname@example.com',
        password: 'password123'
      };
      
      // Reset mocks for this test
      bcrypt.genSalt.mockResolvedValue('mock-salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      
      await userUtils.createUser(userData);
      
      // Verify Prisma create call with default name
      expect(prisma.users.create).toHaveBeenCalledWith({
        data: {
          email: 'noname@example.com',
          password: 'hashedPassword',
          name: 'noname', // Should use part before @ in email
          role: 'business', // Default role
          lastLogin: null
        }
      });
    });
    
    it('should use default role when not provided', async () => {
      const userData = {
        email: 'norole@example.com',
        password: 'password123',
        name: 'No Role User'
      };
      
      // Reset mocks for this test
      bcrypt.genSalt.mockResolvedValue('mock-salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      
      await userUtils.createUser(userData);
      
      // Verify Prisma create call with default role
      expect(prisma.users.create).toHaveBeenCalledWith({
        data: {
          email: 'norole@example.com',
          password: 'hashedPassword',
          name: 'No Role User',
          role: 'business', // Default role
          lastLogin: null
        }
      });
    });
    
    it('should handle complex email addresses for default name', async () => {
      const userData = {
        email: 'user.name+tag@example.co.uk',
        password: 'password123'
      };
      
      // Reset mocks for this test
      bcrypt.genSalt.mockResolvedValue('mock-salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      
      await userUtils.createUser(userData);
      
      // Verify Prisma create call with name extracted from complex email
      expect(prisma.users.create).toHaveBeenCalledWith({
        data: {
          email: 'user.name+tag@example.co.uk',
          password: 'hashedPassword',
          name: 'user.name+tag', // Should use part before @ in email
          role: 'business', // Default role
          lastLogin: null
        }
      });
    });
    
    it('should check if email already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123'
      };
      
      // Mock that the email already exists
      prisma.users.findUnique.mockResolvedValue({ id: 'existing-user' });
      
      // Should throw an error if email exists
      await expect(userUtils.createUser(userData)).rejects.toThrow('User with this email already exists');
      
      // Verify the findUnique call
      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' }
      });
    });
    
    it('should handle errors during user creation', async () => {
      const userData = {
        email: 'error@example.com',
        password: 'password123'
      };
      
      // Mock the database error
      const error = new Error('Database error');
      prisma.users.create.mockRejectedValue(error);
      
      // Should propagate the error
      await expect(userUtils.createUser(userData)).rejects.toThrow('Database error');
    });
  });
});
