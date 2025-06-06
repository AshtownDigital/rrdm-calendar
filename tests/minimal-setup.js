/**
 * Minimal test setup file for RRDM project
 * This file provides basic mocks and setup for Jest tests
 */

// Import Jest globals explicitly to avoid ReferenceError
const { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');

// Set up global test environment
beforeAll(() => {
  // Set environment variables for tests
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-session-secret';
});

// Clean up after tests
afterAll(() => {
  // Clean up environment variables
  delete process.env.NODE_ENV;
  delete process.env.SESSION_SECRET;
});

// Reset mocks after each test
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

// Mock @prisma/client - use the comprehensive mock we created
jest.mock('@prisma/client', () => require('../mocks/prisma.js'));

// Mock ioredis - use the comprehensive mock we created
jest.mock('ioredis', () => require('../mocks/ioredis.js'));

// Mock mongoose
jest.mock('mongoose', () => require('../mocks/mongoose.js'));

// Mock database config
jest.mock('../config/database', () => require('../mocks/database.js'), { virtual: true });
jest.mock('../../config/database', () => require('../mocks/database.js'), { virtual: true });

// Mock mongoose config
jest.mock('../config/mongoose', () => require('../mocks/mongoose-config.js'), { virtual: true });
jest.mock('../../config/mongoose', () => require('../mocks/mongoose-config.js'), { virtual: true });

// Mock Prisma session store
jest.mock('@quixo3/prisma-session-store', () => require('../mocks/prisma-session-store.js'));

// Mock Express session
jest.mock('express-session', () => {
  const session = jest.fn().mockImplementation(() => {
    return (req, res, next) => {
      req.session = {
        id: 'test-session-id',
        cookie: {},
        save: jest.fn((cb) => cb && cb()),
        destroy: jest.fn((cb) => cb && cb()),
        regenerate: jest.fn((cb) => cb && cb()),
        reload: jest.fn((cb) => cb && cb()),
        touch: jest.fn((cb) => cb && cb()),
      };
      next();
    };
  });
  
  session.Store = class Store {};
  return session;
});

// Mock Passport
jest.mock('passport', () => ({
  initialize: jest.fn(() => (req, res, next) => next()),
  session: jest.fn(() => (req, res, next) => next()),
  authenticate: jest.fn(() => (req, res, next) => next()),
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn(),
}));

// Mock Express
jest.mock('express', () => {
  const express = jest.fn();
  express.Router = jest.fn().mockReturnValue({
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
    route: jest.fn().mockReturnThis(),
  });
  express.json = jest.fn().mockReturnValue((req, res, next) => next());
  express.urlencoded = jest.fn().mockReturnValue((req, res, next) => next());
  express.static = jest.fn().mockReturnValue((req, res, next) => next());
  return express;
});

// Mock HTTP responses
jest.mock('http-errors', () => ({
  NotFound: jest.fn((message) => ({ message, status: 404 })),
  BadRequest: jest.fn((message) => ({ message, status: 400 })),
  Unauthorized: jest.fn((message) => ({ message, status: 401 })),
  Forbidden: jest.fn((message) => ({ message, status: 403 })),
  InternalServerError: jest.fn((message) => ({ message, status: 500 })),
}));

// Global console mocks to reduce noise
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Export Jest globals to make them available in tests
module.exports = {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach
};
