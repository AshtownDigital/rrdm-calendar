/**
 * Mock for the user-utils module specifically for models/user-utils.test.js
 */

const { v4: uuidv4 } = require('uuid');

// Create a mock prisma client with implementations that match the test expectations
const mockUsers = {
  findMany: jest.fn().mockImplementation(() => {
    return Promise.resolve([]);
  }),
  findUnique: jest.fn().mockImplementation(({ where }) => {
    if (where.email === 'user@test.com') {
      return Promise.resolve({
        id: 'user-123',
        email: 'user@test.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: 'business',
        active: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return Promise.resolve(null);
  }),
  create: jest.fn().mockImplementation(({ data }) => {
    return Promise.resolve({
      id: uuidv4(),
      ...data,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }),
  update: jest.fn().mockImplementation(({ where, data }) => {
    return Promise.resolve({
      id: where.id,
      email: data.email || 'updated@example.com',
      password: data.password || 'hashedPassword',
      name: data.name || 'Updated User',
      role: data.role || 'user',
      active: true,
      lastLogin: data.lastLogin || new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }),
  delete: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      id: 'user-123',
      email: 'user@test.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'business',
      active: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  })
};

// Mock prisma client
const mockPrisma = {
  users: mockUsers,
  $connect: jest.fn(),
  $disconnect: jest.fn()
};

// Export the mock
module.exports = {
  prisma: mockPrisma
};
