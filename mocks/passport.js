/**
 * Mock implementation of Passport for testing
 */

// Mock Passport
const passport = {
  initialize: () => (req, res, next) => {
    req.login = (user, options, done) => {
      req.user = user;
      if (typeof options === 'function') {
        options(null);
      } else if (typeof done === 'function') {
        done(null);
      }
    };
    
    req.logout = (done) => {
      req.user = null;
      if (typeof done === 'function') {
        done(null);
      }
    };
    
    req.isAuthenticated = () => !!req.user;
    
    req.isUnauthenticated = () => !req.user;
    
    next();
  },
  
  session: () => (req, res, next) => {
    next();
  },
  
  authenticate: (strategy, options, callback) => {
    return (req, res, next) => {
      const mockAuthenticateCallback = (err, user, info) => {
        if (err) {
          return next(err);
        }
        
        if (!user) {
          if (options && options.failureRedirect) {
            return res.redirect(options.failureRedirect);
          }
          return next(new Error('Authentication failed'));
        }
        
        req.login(user, {}, (err) => {
          if (err) {
            return next(err);
          }
          
          if (options && options.successRedirect) {
            return res.redirect(options.successRedirect);
          }
          
          next();
        });
      };
      
      if (callback) {
        callback(null, {}, {});
      } else {
        mockAuthenticateCallback(null, { id: 'mock-user-id' }, {});
      }
    };
  },
  
  use: jest.fn(),
  
  serializeUser: jest.fn((fn) => {
    passport._serializeUser = fn;
  }),
  
  deserializeUser: jest.fn((fn) => {
    passport._deserializeUser = fn;
  }),
  
  _serializeUser: (user, done) => {
    done(null, user.id);
  },
  
  _deserializeUser: (id, done) => {
    done(null, { id });
  },
  
  // Mock strategies
  strategies: {},
  
  // Helper to register strategies
  registerStrategy: (name, Strategy) => {
    passport.strategies[name] = Strategy;
  }
};

// Mock Strategy base class
class Strategy {
  constructor(options, verify) {
    this.name = 'mock';
    this.options = options;
    this.verify = verify;
  }
  
  authenticate(req, options) {
    const verified = (err, user, info) => {
      if (err) {
        return this.error(err);
      }
      if (!user) {
        return this.fail(info);
      }
      this.success(user, info);
    };
    
    try {
      if (this.verify.length === 3) {
        this.verify('mock-username', 'mock-password', verified);
      } else {
        this.verify(req, verified);
      }
    } catch (err) {
      this.error(err);
    }
  }
  
  success(user, info) {
    // Mock implementation
  }
  
  fail(challenge, status) {
    // Mock implementation
  }
  
  redirect(url, status) {
    // Mock implementation
  }
  
  pass() {
    // Mock implementation
  }
  
  error(err) {
    // Mock implementation
  }
}

// Add Strategy to passport
passport.Strategy = Strategy;

// Export the mock
module.exports = passport;
