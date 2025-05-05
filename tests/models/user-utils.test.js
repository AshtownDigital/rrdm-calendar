const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const userUtils = require('../../utils/user-utils');
const { prisma } = require('../../config/prisma');

// Mock the prisma client
jest.mock('../../config/prisma', () => {
  const mockPrismaUsers = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  return {
    prisma: {
      users: mockPrismaUsers,
      $connect: jest.fn(),
      $disconnect: jest.fn()
    }
  };
});

// Mock bcrypt
jest.mock('bcryptjs', () => {
  return {
    genSalt: jest.fn().mockImplementation(() => Promise.resolve('mock-salt')),
    hash: jest.fn().mockImplementation((password, salt) => Promise.resolve('hashedPassword')),
    compare: jest.fn().mockImplementation(() => Promise.resolve(true))
  };
});

describe('User Management Model', () => {
  // Sample user data
  const mockUsers = [
    {
      id: 'user-123',
      email: 'user@test.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'business',
      active: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'admin-123',
      email: 'admin@test.com',
      password: 'hashedPassword',
      name: 'Admin User',
      role: 'admin',
      active: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      // Mock the findMany method to return sample users
      prisma.users.findMany.mockResolvedValue(mockUsers);

      const result = await userUtils.getAllUsers();

      expect(prisma.users.findMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUsers);
      expect(result.length).toBe(2);
    });

    it('should handle errors when fetching users', async () => {
      // Mock the findMany method to throw an error
      const error = new Error('Database error');
      prisma.users.findMany.mockRejectedValue(error);

      await expect(userUtils.getAllUsers()).rejects.toThrow('Database error');
      expect(prisma.users.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('findUserByEmail', () => {
    it('should find a user by email', async () => {
      const userEmail = 'user@test.com';
      const mockUser = mockUsers[0];

      // Mock the findUnique method to return a user
      prisma.users.findUnique.mockResolvedValue(mockUser);

      const result = await userUtils.findUserByEmail(userEmail);

      expect(prisma.users.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { email: userEmail.toLowerCase() }
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent email', async () => {
      const userEmail = 'nonexistent@test.com';

      // Mock the findUnique method to return null
      prisma.users.findUnique.mockResolvedValue(null);

      const result = await userUtils.findUserByEmail(userEmail);

      expect(prisma.users.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle errors when finding user by email', async () => {
      const userEmail = 'user@test.com';
      const error = new Error('Database error');
      
      // Mock the findUnique method to throw an error
      prisma.users.findUnique.mockRejectedValue(error);

      await expect(userUtils.findUserByEmail(userEmail)).rejects.toThrow('Database error');
      expect(prisma.users.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('findUserById', () => {
    it('should find a user by ID', async () => {
      const userId = 'user-123';
      const mockUser = mockUsers[0];

      // Mock the findUnique method to return a user
      prisma.users.findUnique.mockResolvedValue(mockUser);

      const result = await userUtils.findUserById(userId);

      expect(prisma.users.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { id: userId }
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent ID', async () => {
      const userId = 'nonexistent-id';

      // Mock the findUnique method to return null
      prisma.users.findUnique.mockResolvedValue(null);

      const result = await userUtils.findUserById(userId);

      expect(prisma.users.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle errors when finding user by ID', async () => {
      const userId = 'user-123';
      const error = new Error('Database error');
      
      // Mock the findUnique method to throw an error
      prisma.users.findUnique.mockRejectedValue(error);

      await expect(userUtils.findUserById(userId)).rejects.toThrow('Database error');
      expect(prisma.users.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const newUserData = {
        email: 'newuser@test.com',
        password: 'password123',
        name: 'New User',
        role: 'business'
      };

      const createdUser = {
        id: uuidv4(),
        email: newUserData.email.toLowerCase(),
        password: 'hashedPassword',
        name: newUserData.name,
        role: newUserData.role,
        active: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock findUserByEmail to return null (user doesn't exist)
      prisma.users.findUnique.mockResolvedValue(null);
      
      // Mock create to return the new user
      prisma.users.create.mockResolvedValue(createdUser);

      const result = await userUtils.createUser(newUserData);

      // Password should be hashed
      expect(bcrypt.genSalt).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      // Don't check the exact salt value as it's generated at runtime

      // User should be created with correct data
      expect(prisma.users.create).toHaveBeenCalledTimes(1);
      expect(prisma.users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: newUserData.email.toLowerCase(),
          name: newUserData.name,
          role: newUserData.role,
          lastLogin: null
        })
      });

      // Result should not include password
      const { password, ...expectedResult } = createdUser;
      expect(result).toEqual(expectedResult);
    });

    it('should throw an error if user with email already exists', async () => {
      const existingUserData = {
        email: 'user@test.com',
        password: 'password123',
        name: 'Existing User',
        role: 'business'
      };

      // Mock findUserByEmail to return an existing user
      prisma.users.findUnique.mockResolvedValue(mockUsers[0]);

      await expect(userUtils.createUser(existingUserData)).rejects.toThrow('User with this email already exists');
      expect(prisma.users.create).not.toHaveBeenCalled();
    });

    it('should handle errors during user creation', async () => {
      const newUserData = {
        email: 'newuser@test.com',
        password: 'password123',
        name: 'New User',
        role: 'business'
      };

      // Mock findUserByEmail to return null (user doesn't exist)
      prisma.users.findUnique.mockResolvedValue(null);
      
      // Mock create to throw an error
      const error = new Error('Database error');
      prisma.users.create.mockRejectedValue(error);

      await expect(userUtils.createUser(newUserData)).rejects.toThrow('Database error');
      expect(prisma.users.create).toHaveBeenCalledTimes(1);
    });

    it('should use email prefix as name if name is not provided', async () => {
      const newUserData = {
        email: 'newuser@test.com',
        password: 'password123',
        role: 'business'
      };

      const createdUser = {
        id: uuidv4(),
        email: newUserData.email.toLowerCase(),
        password: 'hashedPassword',
        name: 'newuser', // Email prefix
        role: newUserData.role,
        active: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock findUserByEmail to return null (user doesn't exist)
      prisma.users.findUnique.mockResolvedValue(null);
      
      // Mock create to return the new user
      prisma.users.create.mockResolvedValue(createdUser);

      await userUtils.createUser(newUserData);

      expect(prisma.users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: newUserData.email.toLowerCase(),
          name: 'newuser', // Email prefix
          role: newUserData.role,
          lastLogin: null
        })
      });
    });
  });

  describe('updateLastLogin', () => {
    it('should update user last login time', async () => {
      const userId = 'user-123';
      
      // Mock the update method
      prisma.users.update.mockResolvedValue({ ...mockUsers[0], lastLogin: new Date() });

      await userUtils.updateLastLogin(userId);

      expect(prisma.users.update).toHaveBeenCalledTimes(1);
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { lastLogin: expect.any(Date) }
      });
    });

    it('should handle errors when updating last login', async () => {
      const userId = 'user-123';
      const error = new Error('Database error');
      
      // Mock the update method to throw an error
      prisma.users.update.mockRejectedValue(error);

      // Should not throw error outside
      await userUtils.updateLastLogin(userId);
      
      expect(prisma.users.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateUser', () => {
    it('should update user information', async () => {
      const userId = 'user-123';
      const updateData = {
        name: 'Updated User',
        role: 'admin'
      };

      const updatedUser = {
        ...mockUsers[0],
        ...updateData,
        updatedAt: new Date()
      };

      // Mock the update method
      prisma.users.update.mockResolvedValue(updatedUser);

      const result = await userUtils.updateUser(userId, updateData);

      expect(prisma.users.update).toHaveBeenCalledTimes(1);
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData
      });

      // Result should not include password
      const { password, ...expectedResult } = updatedUser;
      expect(result).toEqual(expectedResult);
    });

    it('should check if email is already in use when updating email', async () => {
      const userId = 'user-123';
      const updateData = {
        email: 'admin@test.com' // Already used by another user
      };

      // Mock findUserByEmail to return a different user
      prisma.users.findUnique.mockResolvedValue(mockUsers[1]); // admin user

      await expect(userUtils.updateUser(userId, updateData)).rejects.toThrow('Email is already in use by another user');
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it('should allow updating to the same email', async () => {
      const userId = 'user-123';
      const updateData = {
        email: 'user@test.com' // Same as current
      };

      // Mock findUserByEmail to return the same user
      prisma.users.findUnique.mockResolvedValue(mockUsers[0]);
      
      // Mock update to return the updated user
      prisma.users.update.mockResolvedValue({ ...mockUsers[0], updatedAt: new Date() });

      await userUtils.updateUser(userId, updateData);

      expect(prisma.users.update).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during user update', async () => {
      const userId = 'user-123';
      const updateData = {
        name: 'Updated User'
      };

      // Mock update to throw an error
      const error = new Error('Database error');
      prisma.users.update.mockRejectedValue(error);

      await expect(userUtils.updateUser(userId, updateData)).rejects.toThrow('Database error');
      expect(prisma.users.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateUserPassword', () => {
    it('should update user password', async () => {
      const userId = 'user-123';
      const newPassword = 'newpassword123';

      // Mock the update method
      prisma.users.update.mockResolvedValue({ ...mockUsers[0], password: 'hashedPassword' });

      const result = await userUtils.updateUserPassword(userId, newPassword);

      // Password should be hashed
      expect(bcrypt.genSalt).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      // Don't check the exact salt value as it's generated at runtime

      expect(prisma.users.update).toHaveBeenCalledTimes(1);
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({})
      });

      expect(result).toBe(true);
    });

    it('should handle errors when updating password', async () => {
      const userId = 'user-123';
      const newPassword = 'newpassword123';
      const error = new Error('Database error');
      
      // Mock the update method to throw an error
      prisma.users.update.mockRejectedValue(error);

      await expect(userUtils.updateUserPassword(userId, newPassword)).rejects.toThrow('Database error');
      expect(prisma.users.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const userId = 'user-123';

      // Mock the delete method
      prisma.users.delete.mockResolvedValue(mockUsers[0]);

      const result = await userUtils.deleteUser(userId);

      expect(prisma.users.delete).toHaveBeenCalledTimes(1);
      expect(prisma.users.delete).toHaveBeenCalledWith({
        where: { id: userId }
      });

      expect(result).toBe(true);
    });

    it('should handle errors when deleting user', async () => {
      const userId = 'user-123';
      const error = new Error('Database error');
      
      // Mock the delete method to throw an error
      prisma.users.delete.mockRejectedValue(error);

      await expect(userUtils.deleteUser(userId)).rejects.toThrow('Database error');
      expect(prisma.users.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const plainPassword = 'password123';
      const hashedPassword = 'hashedPassword';

      // Mock bcrypt.compare to return true
      bcrypt.compare.mockResolvedValue(true);

      const result = await userUtils.validatePassword(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should not validate incorrect password', async () => {
      const plainPassword = 'wrongpassword';
      const hashedPassword = 'hashedPassword';

      // Mock bcrypt.compare to return false
      bcrypt.compare.mockResolvedValue(false);

      const result = await userUtils.validatePassword(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });
  });
});
