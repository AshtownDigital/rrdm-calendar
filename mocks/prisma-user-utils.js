/**
 * Mock for Prisma client specifically for user-utils.test.js
 */

// Create a mock prisma client with users model
const prisma = {
  users: {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({
      id: 'mock-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      active: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  },
  $connect: jest.fn().mockResolvedValue(true),
  $disconnect: jest.fn().mockResolvedValue(true)
};

module.exports = {
  prisma
};
