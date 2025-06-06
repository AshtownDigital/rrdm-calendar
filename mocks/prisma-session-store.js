/**
 * Mock implementation of @quixo3/prisma-session-store for testing
 */

// Mock session store class
class PrismaSessionStore {
  constructor(options) {
    this.options = options || {};
    this.sessions = new Map();
    this.client = options?.prisma || null;
    this.ttl = options?.ttl || 86400;
  }

  get(sid, callback) {
    const session = this.sessions.get(sid);
    if (session) {
      callback(null, session);
    } else {
      callback(null, null);
    }
  }

  set(sid, session, callback) {
    this.sessions.set(sid, session);
    callback();
  }

  destroy(sid, callback) {
    this.sessions.delete(sid);
    callback();
  }

  touch(sid, session, callback) {
    this.sessions.set(sid, session);
    callback();
  }

  all(callback) {
    const sessions = Array.from(this.sessions.values());
    callback(null, sessions);
  }

  clear(callback) {
    this.sessions.clear();
    callback();
  }

  length(callback) {
    callback(null, this.sessions.size);
  }
}

module.exports = {
  PrismaSessionStore
};
