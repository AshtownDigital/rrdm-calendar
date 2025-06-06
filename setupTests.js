// Setup file for Jest tests

// Mock Prisma client
jest.mock('@prisma/client', () => {
  // Mock PrismaClientKnownRequestError
  class MockPrismaClientKnownRequestError extends Error {
    constructor(message, meta) {
      super(message);
      this.meta = meta;
      this.code = 'P2002'; // Example error code
      this.name = 'PrismaClientKnownRequestError';
    }
  }

  // Mock Prisma client
  const mockPrisma = {
    Prisma: {
      PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
      // Add other Prisma types that might be needed
      PrismaClientValidationError: class MockPrismaClientValidationError extends Error {
        constructor(message) {
          super(message);
          this.name = 'PrismaClientValidationError';
        }
      },
      // Add other error types as needed
    }
  };
  
  return mockPrisma;
});

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn()
  }));
});

// Mock other commonly used modules
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    on: jest.fn(),
    close: jest.fn()
  }
}));

// Mock Express
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn()
  };
  return () => mockApp;
});

// Mock other common modules
jest.mock('express-session');
jest.mock('passport');
jest.mock('http-errors');
jest.mock('connect-mongo');
jest.mock('@quixo3/prisma-session-store');
