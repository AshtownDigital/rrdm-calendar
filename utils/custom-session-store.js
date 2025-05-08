/**
 * Custom Session Store
 * 
 * A custom session store implementation that uses Prisma directly without
 * relying on the @quixo3/prisma-session-store module which is causing issues.
 */
const session = require('express-session');
const { PrismaClient } = require('@prisma/client');
const { createError, ErrorTypes } = require('./error-handler');

// Initialize Prisma client
const prisma = new PrismaClient();

// Create a custom session store that extends the session Store class
class CustomPrismaSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    
    this.prisma = options.prisma || prisma;
    this.tableName = options.tableName || 'Session';
    this.ttl = options.ttl || 86400; // 1 day in seconds
    this.checkPeriod = options.checkPeriod || 60 * 60 * 1000; // 1 hour
    this.logger = options.logger || console;
    
    // Start periodic cleanup if enabled
    if (this.checkPeriod > 0) {
      this.startCleanup();
    }
  }
  
  /**
   * Start periodic cleanup of expired sessions
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(err => {
        this.logger.error('Error cleaning up expired sessions:', err);
      });
    }, this.checkPeriod);
    
    // Ensure cleanup interval doesn't keep the process alive
    this.cleanupInterval.unref();
  }
  
  /**
   * Clean up expired sessions
   */
  async cleanup() {
    try {
      const now = new Date();
      const result = await this.prisma.$executeRawUnsafe(`
        DELETE FROM "${this.tableName}" 
        WHERE "expiresAt" < $1
      `, now);
      
      this.logger.info(`Cleaned up ${result} expired sessions`);
      return result;
    } catch (error) {
      this.logger.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }
  
  /**
   * Get a session by ID
   */
  async get(sid, callback) {
    try {
      const session = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${this.tableName}" 
        WHERE "sid" = $1
      `, sid);
      
      if (!session || session.length === 0) {
        return callback(null, null);
      }
      
      // Check if session has expired
      if (new Date(session[0].expiresAt) < new Date()) {
        await this.destroy(sid);
        return callback(null, null);
      }
      
      let sessionData;
      try {
        sessionData = JSON.parse(session[0].data);
      } catch (e) {
        return callback(new Error('Failed to parse session data'));
      }
      
      return callback(null, sessionData);
    } catch (error) {
      return callback(error);
    }
  }
  
  /**
   * Set a session
   */
  async set(sid, session, callback) {
    try {
      // Calculate expiration date
      const expiresAt = new Date(Date.now() + (session.cookie.maxAge || this.ttl * 1000));
      
      // Serialize session data
      const data = JSON.stringify(session);
      
      // Check if session exists
      const existingSession = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${this.tableName}" 
        WHERE "sid" = $1
      `, sid);
      
      if (existingSession && existingSession.length > 0) {
        // Update existing session
        await this.prisma.$executeRawUnsafe(`
          UPDATE "${this.tableName}" 
          SET "data" = $1, "expiresAt" = $2 
          WHERE "sid" = $3
        `, data, expiresAt, sid);
      } else {
        // Create new session
        await this.prisma.$executeRawUnsafe(`
          INSERT INTO "${this.tableName}" ("id", "sid", "data", "expiresAt") 
          VALUES ($1, $2, $3, $4)
        `, sid, sid, data, expiresAt);
      }
      
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }
  
  /**
   * Destroy a session
   */
  async destroy(sid, callback) {
    try {
      await this.prisma.$executeRawUnsafe(`
        DELETE FROM "${this.tableName}" 
        WHERE "sid" = $1
      `, sid);
      
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }
  
  /**
   * Touch a session (update expiration)
   */
  async touch(sid, session, callback) {
    try {
      const expiresAt = new Date(Date.now() + (session.cookie.maxAge || this.ttl * 1000));
      
      await this.prisma.$executeRawUnsafe(`
        UPDATE "${this.tableName}" 
        SET "expiresAt" = $1 
        WHERE "sid" = $2
      `, expiresAt, sid);
      
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }
  
  /**
   * Get all sessions
   */
  async all(callback) {
    try {
      const sessions = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${this.tableName}"
      `);
      
      const result = {};
      for (const session of sessions) {
        try {
          result[session.sid] = JSON.parse(session.data);
        } catch (e) {
          // Skip sessions with invalid data
        }
      }
      
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  }
  
  /**
   * Get session count
   */
  async length(callback) {
    try {
      const result = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${this.tableName}"
      `);
      
      callback(null, parseInt(result[0].count, 10));
    } catch (error) {
      callback(error);
    }
  }
  
  /**
   * Clear all sessions
   */
  async clear(callback) {
    try {
      await this.prisma.$executeRawUnsafe(`
        DELETE FROM "${this.tableName}"
      `);
      
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
  
  /**
   * Stop the cleanup interval
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

module.exports = CustomPrismaSessionStore;
