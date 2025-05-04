const fs = require('fs');
const path = require('path');

// Mock environment variables
process.env.SESSION_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// Mock @prisma/client
jest.mock('@prisma/client', () => require('./mocks/prisma'));

// Mock routes
jest.mock('../routes/access', () => require('./mocks/routes').accessRouter);
jest.mock('../routes/home', () => require('./mocks/routes').homeRouter);
jest.mock('../routes/ref-data', () => require('./mocks/routes').refDataRouter);
jest.mock('../routes/funding', () => require('./mocks/routes').fundingRouter);
jest.mock('../routes/bcr', () => require('./mocks/routes').bcrRouter);
jest.mock('../routes/items', () => require('./mocks/routes').itemsRouter);
jest.mock('../routes/values', () => require('./mocks/routes').valuesRouter);
jest.mock('../routes/release-notes', () => require('./mocks/routes').releaseNotesRouter);
jest.mock('../routes/restore-points', () => require('./mocks/routes').restorePointsRouter);
jest.mock('../api', () => require('./mocks/routes').apiRouter);

// Mock nunjucks
jest.mock('nunjucks', () => ({
  configure: jest.fn().mockReturnValue({
    addFilter: jest.fn(),
    addGlobal: jest.fn(),
    render: jest.fn().mockImplementation((template, context) => 'Mocked template')
  })
}));

// Mock connect-flash
jest.mock('connect-flash', () => {
  return () => (req, res, next) => {
    req.flash = jest.fn((type, msg) => msg ? undefined : []);
    next();
  };
});

// Mock middleware
jest.mock('../middleware/auth', () => ({
  ensureAuthenticated: (req, res, next) => next(),
  ensureAdmin: (req, res, next) => next(),
  checkPermission: (permission) => (req, res, next) => next()
}));

jest.mock('../middleware/admin-auth', () => (req, res, next) => next());
jest.mock('../middleware/token-refresh', () => (req, res, next) => next());

// Set up test users file
const sourceUsersFile = path.join(__dirname, 'mocks/users.json');
const targetUsersFile = path.join(__dirname, '../data/users.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(path.dirname(targetUsersFile))) {
  fs.mkdirSync(path.dirname(targetUsersFile), { recursive: true });
}

// Copy mock users file before tests
beforeAll(() => {
  fs.copyFileSync(sourceUsersFile, targetUsersFile);
});

// Clean up after tests
afterAll(() => {
  if (fs.existsSync(targetUsersFile)) {
    fs.unlinkSync(targetUsersFile);
  }
});

// Mock console methods to reduce noise in tests
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock response locals
beforeEach(() => {
  jest.spyOn(global.console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});
