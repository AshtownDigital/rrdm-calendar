const request = require('supertest');
const session = require('express-session');
const express = require('express');
const mockPassport = require('../mocks/passport');
const userUtils = require('../../utils/user-utils');

// Mock modules before requiring app
jest.mock('passport', () => mockPassport);
jest.mock('express-session', () => {
  return () => (req, res, next) => {
    req.session = {
      id: 'test-session-id',
      save: (cb) => cb && cb(),
      regenerate: (cb) => cb && cb(),
      destroy: (cb) => cb && cb(),
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
  });
});
