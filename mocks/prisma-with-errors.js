/**
 * Enhanced Prisma mock that includes error classes
 */

// Create custom error classes that mimic Prisma's error classes
class PrismaClientKnownRequestError extends Error {
  constructor(message, { code, meta, clientVersion } = {}) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = code || 'P2002';
    this.meta = meta || {};
    this.clientVersion = clientVersion || '4.0.0';
  }
}

class PrismaClientUnknownRequestError extends Error {
  constructor(message, { clientVersion } = {}) {
    super(message);
    this.name = 'PrismaClientUnknownRequestError';
    this.clientVersion = clientVersion || '4.0.0';
  }
}

class PrismaClientValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrismaClientValidationError';
  }
}

// Create a mock PrismaClient class
class PrismaClient {
  constructor() {
    this.users = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    this.$connect = jest.fn();
    this.$disconnect = jest.fn();
  }
}

// Create the Prisma namespace with error classes
const Prisma = {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError
};

// Pre-instantiated client for convenience
const mockPrisma = new PrismaClient();

module.exports = {
  PrismaClient,
  Prisma,
  default: PrismaClient,
  mockPrisma
};
