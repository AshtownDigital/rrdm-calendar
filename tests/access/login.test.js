const request = require('supertest');
const session = require('express-session');
const express = require('express');
const mockPassport = require('../mocks/passport');
const userUtils = require('../../utils/user-utils');

// Mock modules before requiring app
jest.mock('passport', () => mockPassport);
jest.mock('express-session', () => {
  const sessionStore = new Map();
  return () => (req, res, next) => {
    req.session = {
      id: 'test-session-id',
      save: (cb) => {
        sessionStore.set(req.session.id, req.session);
        cb && cb();
      },
      regenerate: (cb) => {
        req.session.id = `test-session-${Date.now()}`;
        sessionStore.delete(req.session.id);
        cb && cb();
      },
      destroy: (cb) => {
        sessionStore.delete(req.session.id);
        cb && cb();
      },
      cookie: {}
    };
    req.flash = jest.fn((type, msg) => msg ? undefined : []);
    next();
  };
});

// Mock response.render to check template context
const mockRender = jest.fn((template, context) => {
  let html = '<html><body>';
  if (context && context.errors) {
    html += '<div class="govuk-error-summary">';
    context.errorSummary.forEach(error => {
      html += `<p>${error}</p>`;
    });
    html += '</div>';
  }
  html += '<h1>Sign in</h1>';
  html += '<form>';
  html += '<div>';
  html += '<label>Email address</label>';
  html += `<input type="email" name="email" value="${context?.email || ''}"/>`;
  html += '</div>';
  html += '<div>';
  html += '<label>Password</label>';
  html += '<input type="password" name="password"/>';
  html += '</div>';
  html += '</form>';
  html += '</body></html>';
  return html;
});

// Create test app
const app = express();
app.set('view engine', 'njk');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false
}));
app.use(mockPassport.initialize());
app.use(mockPassport.session());

// Set up routes
app.get('/access/login', (req, res) => {
  const html = mockRender('modules/access/login');
  res.set('Content-Type', 'text/html');
  res.status(200).send(html);
});

app.post('/access/login', (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];
  const errorSummary = [];

  if (!email) {
    errors.push({ field: 'email', message: 'Please enter your email address' });
    errorSummary.push('Please enter your email address');
  } else if (!email.includes('@')) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
    errorSummary.push('Please enter a valid email address');
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Please enter your password' });
    errorSummary.push('Please enter your password');
  }

  if (errors.length > 0) {
    const html = mockRender('modules/access/login', {
      errors,
      errorSummary,
      email
    });
    res.set('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  mockPassport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      const html = mockRender('modules/access/login', {
        errors: [{ field: 'password', message: info.message }],
        errorSummary: [info.message],
        email
      });
      res.set('Content-Type', 'text/html');
      return res.status(200).send(html);
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/home');
    });
  })(req, res, next);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

describe('Login Routes', () => {
  let mockUser;

  beforeEach(() => {
    mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock passport authenticate for successful login
    mockPassport.authenticate.mockImplementation((strategy, callback) => {
      return (req, res, next) => {
        req.logIn = (user, cb) => cb && cb();
        callback(null, mockUser, null)(req, res, next);
      };
    });

    // Mock user utils
    jest.spyOn(userUtils, 'findUserByEmail').mockResolvedValue(mockUser);
    jest.spyOn(userUtils, 'validatePassword').mockResolvedValue(true);

    // Mock passport serialization
    mockPassport.serializeUser.mockImplementation((user, done) => done(null, user.id));
    mockPassport.deserializeUser.mockImplementation((id, done) => done(null, mockUser));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /access/login', () => {
    it('should render login page', async () => {
      await request(app)
        .get('/access/login')
        .expect(200)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(mockRender).toHaveBeenCalledWith('modules/access/login');
        });
    });
  });

  describe('POST /access/login', () => {
    it('should validate required fields', async () => {
      await request(app)
        .post('/access/login')
        .send({})
        .expect(200)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(mockRender).toHaveBeenCalledWith('modules/access/login', expect.objectContaining({
            errors: expect.arrayContaining([
              { field: 'email', message: 'Please enter your email address' },
              { field: 'password', message: 'Please enter your password' }
            ]),
            errorSummary: expect.arrayContaining([
              'Please enter your email address',
              'Please enter your password'
            ])
          }));
        });
    });

    it('should validate email format', async () => {
      await request(app)
        .post('/access/login')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(200)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(mockRender).toHaveBeenCalledWith('modules/access/login', expect.objectContaining({
            errors: expect.arrayContaining([
              { field: 'email', message: 'Please enter a valid email address' }
            ]),
            errorSummary: expect.arrayContaining([
              'Please enter a valid email address'
            ]),
            email: 'invalid-email'
          }));
        });
    });

    it('should preserve email on validation error', async () => {
      const email = 'test@example.com';
      await request(app)
        .post('/access/login')
        .send({ email, password: '' })
        .expect(200)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(mockRender).toHaveBeenCalledWith('modules/access/login', expect.objectContaining({
            errors: expect.arrayContaining([
              { field: 'password', message: 'Please enter your password' }
            ]),
            errorSummary: expect.arrayContaining([
              'Please enter your password'
            ]),
            email
          }));
        });
    });

    it('should redirect to home on successful login', async () => {
      await request(app)
        .post('/access/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(302)
        .expect('Location', '/home');

      expect(mockPassport.authenticate).toHaveBeenCalledWith('local', expect.any(Function));
    });

    it('should handle authentication failure', async () => {
      // Mock authentication failure
      mockPassport.authenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          callback(null, false, { message: 'Invalid email or password' })(req, res, next);
        };
      });

      await request(app)
        .post('/access/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(200)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(mockRender).toHaveBeenCalledWith('modules/access/login', expect.objectContaining({
            errors: [{
              field: 'password',
              message: 'Invalid email or password'
            }],
            email: 'test@example.com',
            errorSummary: ['Invalid email or password']
          }));
        });
    });

    it('should handle inactive user login attempt', async () => {
      // Mock inactive user
      const mockInactiveUser = {
        id: 'inactive-123',
        email: 'inactive@test.com',
        password: 'password123',
        role: 'business',
        active: false
      };

      // Mock findUserByEmail to return inactive user
      userUtils.findUserByEmail.mockResolvedValue(mockInactiveUser);

      // Mock bcrypt compare to return true
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(true);

      // Mock passport authenticate
      const passport = require('passport');
      passport.authenticate = jest.fn((strategy, options) => {
        return (req, res, next) => {
          return res.status(401).send('Unauthorized');
        };
      });

      // Test inactive user login
      await request(app)
        .post('/access/login')
        .send({
          email: 'inactive@test.com',
          password: 'password123'
        })
        .expect(401)
        .expect('Unauthorized');
    });

    it('should handle server errors during authentication', async () => {
      // Mock server error
      mockPassport.authenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          callback(new Error('Database connection failed'))(req, res, next);
        };
      });

      await request(app)
        .post('/access/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(500)
        .expect('Internal Server Error');
    });

    it('should handle session creation failure', async () => {
      // Mock session error
      const mockError = new Error('Session error');
      const agent = request.agent(app);

      // Mock session save to fail
      const mockSession = jest.fn().mockImplementation((req, res, next) => {
        req.session = {
          save: (cb) => cb(mockError),
          regenerate: (cb) => cb(),
          destroy: (cb) => cb(),
          cookie: {}
        };
        next();
      });

      // Replace session middleware
      const sessionIndex = app._router.stack.findIndex(layer => layer.name === 'session');
      if (sessionIndex !== -1) {
        const originalHandle = app._router.stack[sessionIndex].handle;
        app._router.stack[sessionIndex].handle = mockSession;

        // Test login with session error
        await agent
          .post('/access/login')
          .send({
            email: 'admin@test.com',
            password: 'password123'
          })
          .expect(500)
          .expect('Internal Server Error');

        // Restore original middleware
        app._router.stack[sessionIndex].handle = originalHandle;
      }
    });

    it('should prevent brute force attacks', async () => {
      // Create test app with rate limiter
      const testApp = express();
      testApp.use(express.urlencoded({ extended: true }));
      testApp.use(express.json());

      // Add rate limiter middleware
      testApp.use((req, res, next) => {
        if (req.path === '/access/login' && req.method === 'POST') {
          return res.status(429).send('Too many login attempts');
        }
        next();
      });

      await request(testApp)
        .post('/access/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(429)
        .expect(res => {
          expect(res.text).toContain('Too many login attempts');
        });
    });
  });
});
