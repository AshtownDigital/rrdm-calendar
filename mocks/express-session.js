/**
 * Mock implementation of express-session for testing
 */

// Mock session store
class Store {
  constructor() {
    this.sessions = new Map();
  }

  get(sid, callback) {
    const session = this.sessions.get(sid);
    callback(null, session);
  }

  set(sid, session, callback) {
    this.sessions.set(sid, session);
    if (callback) callback(null);
  }

  destroy(sid, callback) {
    this.sessions.delete(sid);
    if (callback) callback(null);
  }

  all(callback) {
    const sessions = Array.from(this.sessions.values());
    callback(null, sessions);
  }

  length(callback) {
    callback(null, this.sessions.size);
  }

  clear(callback) {
    this.sessions.clear();
    if (callback) callback(null);
  }
}

// Mock session middleware
const session = (options = {}) => {
  return (req, res, next) => {
    if (!req.session) {
      req.session = {
        id: 'mock-session-id',
        cookie: {
          maxAge: options.cookie?.maxAge || 86400000,
          httpOnly: options.cookie?.httpOnly !== false,
          secure: options.cookie?.secure || false,
          path: options.cookie?.path || '/'
        },
        regenerate: (callback) => {
          req.session.id = `mock-session-id-${Date.now()}`;
          if (callback) callback(null);
        },
        destroy: (callback) => {
          req.session = null;
          if (callback) callback(null);
        },
        reload: (callback) => {
          if (callback) callback(null);
        },
        save: (callback) => {
          if (callback) callback(null);
        },
        touch: () => {},
        user: null
      };
    }
    
    if (next) next();
  };
};

// Add Store to session
session.Store = Store;

// Add specific store implementations
session.MemoryStore = Store;

// Export the mock
module.exports = session;
