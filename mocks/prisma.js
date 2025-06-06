/**
 * Mock Prisma client for testing
 */
const { v4: uuidv4 } = require('uuid');

// Create a comprehensive mock of all Prisma models and their methods
class PrismaClient {
  constructor() {
    this.$connect = jest.fn().mockResolvedValue(true);
    this.$disconnect = jest.fn().mockResolvedValue(true);
    this.$transaction = jest.fn().mockImplementation((callback) => {
      if (typeof callback === 'function') {
        return callback(this);
      }
      return Promise.resolve([]);
    });
    
    // Mock models
    this.users = {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where?.id === 'user-123') {
          return Promise.resolve({ id: 'user-123', email: 'test@example.com' });
        }
        return Promise.resolve(null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where?.id || 'user-123', email: 'test@example.com' })),
      findFirst: jest.fn().mockImplementation(() => Promise.resolve({ id: 'user-123', email: 'test@example.com' })),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([{ id: 'user-123', email: 'test@example.com' }])),
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'user-123', ...data.data })),
      update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
      delete: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id })),
      count: jest.fn().mockImplementation(() => Promise.resolve(1))
    };
    
    this.referenceData = {
      findUnique: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where?.id || 'ref-123', name: 'Test Reference Data' })),
      findFirst: jest.fn().mockImplementation(() => Promise.resolve({ id: 'ref-123', name: 'Test Reference Data' })),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([{ id: 'ref-123', name: 'Test Reference Data' }])),
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'ref-123', ...data.data })),
      update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
      delete: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id })),
      count: jest.fn().mockImplementation(() => Promise.resolve(1))
    };
    
    this.session = {
      findUnique: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where?.id || 'session-123', data: { cookie: {}, passport: { user: 'user-123' } } })),
      findFirst: jest.fn().mockImplementation(() => Promise.resolve({ id: 'session-123', data: { cookie: {}, passport: { user: 'user-123' } } })),
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'session-123', ...data })),
      update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
      delete: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id })),
      deleteMany: jest.fn().mockImplementation(() => Promise.resolve({ count: 1 }))
    };
    
    this.bcrs = {
      findUnique: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where?.id || 'bcr-123', title: 'Test BCR' })),
      findFirst: jest.fn().mockImplementation(() => Promise.resolve({ id: 'bcr-123', title: 'Test BCR' })),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([{ id: 'bcr-123', title: 'Test BCR' }])),
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'bcr-123', ...data.data })),
      update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
      delete: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id })),
      count: jest.fn().mockImplementation(() => Promise.resolve(1))
    };
    
    this.BcrSubmissions = {
      findUnique: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where?.id || 'sub-123', title: 'Test Submission' })),
      findFirst: jest.fn().mockImplementation(() => Promise.resolve({ id: 'sub-123', title: 'Test Submission' })),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([{ id: 'sub-123', title: 'Test Submission' }])),
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'sub-123', ...data.data })),
      update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
      delete: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id })),
      count: jest.fn().mockImplementation(() => Promise.resolve(1))
    };
  }
}

// Define Prisma error classes
class PrismaClientKnownRequestError extends Error {
  constructor(message, { code, clientVersion, meta }) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = code;
    this.clientVersion = clientVersion;
    this.meta = meta;
  }
}

class PrismaClientValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrismaClientValidationError';
  }
}

class PrismaClientRustPanicError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrismaClientRustPanicError';
  }
}

class PrismaClientInitializationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrismaClientInitializationError';
  }
}

class PrismaClientUnknownRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrismaClientUnknownRequestError';
  }
}

// Create a pre-instantiated mock for direct use
const mockPrisma = {
  users: {
    findUnique: jest.fn().mockImplementation(({ where }) => {
      // Return null by default for findUnique to allow user creation
      return Promise.resolve(null);
    }),
    findFirst: jest.fn().mockImplementation(() => Promise.resolve(null)),
    findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
    create: jest.fn().mockImplementation((data) => {
      return Promise.resolve({
        id: 'mock-user-id',
        email: data.data.email,
        name: data.data.name,
        role: data.data.role,
        password: data.data.password,
        active: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }),
    update: jest.fn().mockImplementation(({ where, data }) => {
      return Promise.resolve({
        id: where.id,
        ...data,
        email: 'updated@example.com',
        name: 'Updated User',
        role: 'user',
        password: 'hashedPassword',
        active: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }),
    delete: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve({ id: where.id });
    })
  },
  $connect: jest.fn().mockResolvedValue(true),
  $disconnect: jest.fn().mockResolvedValue(true)
};

// Export the mock
module.exports = {
  PrismaClient,
  mockPrisma,
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientUnknownRequestError
};
