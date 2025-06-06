/**
 * Minimal test file to verify Jest setup
 * This file is completely self-contained and doesn't rely on any external setup
 */

// Mock Prisma client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      $connect: jest.fn().mockResolvedValue(true),
      $disconnect: jest.fn().mockResolvedValue(true),
      users: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({})
      }
    }))
  };
});

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
  }));
});

describe('Minimal test suite', () => {
  // Basic tests to verify Jest is working
  test('1 + 1 equals 2', () => {
    expect(1 + 1).toBe(2);
  });

  test('true is truthy', () => {
    expect(true).toBeTruthy();
  });

  // Test that mocks are working
  test('Prisma client mock works', () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    expect(prisma.$connect).toBeDefined();
    expect(prisma.users.findUnique).toBeDefined();
  });

  test('Redis mock works', () => {
    const Redis = require('ioredis');
    const redis = new Redis();
    expect(redis.connect).toBeDefined();
    expect(redis.get).toBeDefined();
  });
});
