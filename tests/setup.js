const fs = require('fs');
const path = require('path');

// Load test environment variables
require('dotenv').config({ path: './tests/.env.test' });

// Mock Mongoose and session store
jest.mock('mongoose', () => {
  const mongoose = jest.requireActual('mongoose');
  return {
    ...mongoose,
    connect: jest.fn().mockResolvedValue(),
    connection: {
      ...mongoose.connection,
      close: jest.fn().mockResolvedValue()
    }
  };
});

jest.mock('../config/mongoose', () => {
  const mongoose = jest.requireActual('mongoose');
  let connected = true;
  const mockSessionStore = {
    all: jest.fn(),
    destroy: jest.fn(),
    clear: jest.fn()
  };
  const session = {
    create: jest.fn((args) => Promise.resolve({ id: 'session-123', ...args.data })),
    findUnique: jest.fn((args) => Promise.resolve({ id: args.where.id, data: { cookie: {}, passport: { user: 'admin-123' } } })),
    findFirst: jest.fn((args) => Promise.resolve({ id: 'session-123', data: { cookie: {}, passport: { user: 'admin-123' } } })),
    update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
    delete: jest.fn((args) => Promise.resolve({ id: args.where.id })),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 }))
  };
  return {
    prisma,
    connected
  };
});

const { EventEmitter } = require('events');

class MockSessionStore extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  get(sid, callback) {
    const session = this.sessions.get(sid) || {
      cookie: {},
      passport: {
        user: sid.includes('admin') ? 'admin-123' : 'user-123'
      }
    };
    callback(null, session);
  }

  set(sid, session, callback) {
    this.sessions.set(sid, session);
    callback();
  }

  destroy(sid, callback) {
    this.sessions.delete(sid);
    callback();
  }

  all(callback) {
    callback(null, Array.from(this.sessions.values()));
  }

  length(callback) {
    callback(null, this.sessions.size);
  }

  clear(callback) {
    this.sessions.clear();
    callback();
  }

  touch(sid, session, callback) {
    if (this.sessions.has(sid)) {
      this.sessions.set(sid, session);
    }
    callback();
  }
}

jest.mock('@quixo3/prisma-session-store', () => ({
  PrismaSessionStore: jest.fn().mockImplementation(() => new MockSessionStore())
}));

// Do not mock routes - we want to test the actual routes

// Mock nunjucks
jest.mock('nunjucks', () => ({
  configure: jest.fn().mockReturnValue({
    addFilter: jest.fn(),
    addGlobal: jest.fn(),
    render: jest.fn().mockImplementation((template, context) => {
      // Return a basic HTML structure based on the template
      if (template.includes('manage')) {
        return '<h1>User Management</h1><a href="/access/create">Create User</a>';
      } else if (template.includes('create-user')) {
        return '<h1>Create User</h1><form method="post"></form>';
      } else {
        return '<h1>Mocked Template</h1>';
      }
    })
  })
}));

// Mock connect-flash
jest.mock('connect-flash', () => {
  return () => (req, res, next) => {
    req.flash = jest.fn((type, msg) => msg ? undefined : []);
    next();
  };
});

// Mock users for tests
const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'admin',
  password: '$2a$10$1234567890123456789012',
  lastLogin: new Date()
};

const mockBusinessUser = {
  id: 'user-123',
  email: 'user@test.com',
  role: 'business',
  active: true
};

// Mock passport
jest.mock('passport', () => {
  const passport = {
    initialize: jest.fn().mockReturnValue((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(!!req.user);
      req.logIn = (user, done) => {
        req.user = user;
        if (done) process.nextTick(() => done(null));
      };
      req.logOut = (done) => {
        req.user = null;
        if (done) process.nextTick(() => done(null));
      };
      next();
    }),
    session: jest.fn().mockReturnValue((req, res, next) => {
      if (!req.session) {
        req.session = {};
      }
      
      // Add session methods
      req.session.save = (cb) => {
        if (cb) process.nextTick(() => cb(null));
        return req.session;
      };
      
      // Initialize passport in session if not exists
      if (!req.session.passport) {
        req.session.passport = {};
      }
      
      next();
    }),
    authenticate: jest.fn((strategy, options) => {
      return (req, res, next) => {
        const { email, password } = req.body || {};
        
        if (email === 'admin@test.com' && password === 'password123') {
          req.user = mockAdminUser;
          
          // Set up session
          if (!req.session) req.session = {};
          if (!req.session.passport) req.session.passport = {};
          req.session.passport.user = mockAdminUser.id;
          
          if (options && options.successRedirect) {
            return res.redirect(options.successRedirect);
          }
          return next();
        } 
        else if (email === 'user@test.com' && password === 'password123') {
          req.user = mockBusinessUser;
          
          // Set up session
          if (!req.session) req.session = {};
          if (!req.session.passport) req.session.passport = {};
          req.session.passport.user = mockBusinessUser.id;
          
          if (options && options.successRedirect) {
            return res.redirect(options.successRedirect);
          }
          return next();
        } 
        else {
          if (options && options.failureRedirect) {
            return res.redirect(options.failureRedirect);
          }
          return res.status(401).send('Invalid credentials');
        }
      };
    }),
    serializeUser: jest.fn((user, done) => {
      if (typeof done === 'function') {
        process.nextTick(() => done(null, user.id));
      }
      return user.id;
    }),
    deserializeUser: jest.fn((id, done) => {
      if (typeof done === 'function') {
        process.nextTick(() => {
          if (id === 'admin-123') {
            done(null, mockAdminUser);
          } else if (id === 'user-123') {
            done(null, mockBusinessUser);
          } else {
            done(new Error('User not found'));
          }
        });
      } else {
        // Return the user directly if no callback is provided
        if (id === 'admin-123') {
          return mockAdminUser;
        } else if (id === 'user-123') {
          return mockBusinessUser;
        } else {
          // For integration tests, return null instead of throwing an error
          // This allows the tests to handle the case where a user is not found
          return null;
        }
      }
    }),
    use: jest.fn()
  };

  return passport;
});

// Mock express-session
jest.mock('express-session', () => {
  const session = jest.fn().mockReturnValue((req, res, next) => {
    req.session = {};
    next();
  });
  session.Store = jest.fn();
  return session;
});

// Mock connect-flash
jest.mock('connect-flash', () => {
  return jest.fn().mockReturnValue((req, res, next) => {
    req.flash = jest.fn();
    next();
  });
});

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock middleware
jest.mock('../middleware/auth', () => ({
  ensureAuthenticated: jest.fn((req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/access/login');
    }
    return next();
  }),
  ensureAdmin: jest.fn((req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Unauthorized');
    }
    return next();
  }),
  forwardAuthenticated: jest.fn((req, res, next) => {
    if (req.isAuthenticated()) {
      return res.redirect('/home');
    }
    return next();
  }),
  checkPermission: jest.fn((permission) => (req, res, next) => next())
}));

// Mock token-refresh middleware
jest.mock('../middleware/token-refresh', () => jest.fn((req, res, next) => next()));

// Mock admin-auth middleware
jest.mock('../middleware/admin-auth', () => {
  const adminAuth = jest.fn((req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/access/login');
    }
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).send('Unauthorized');
  });
  return { requireAdmin: adminAuth };
});

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
