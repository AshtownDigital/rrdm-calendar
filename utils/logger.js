/**
 * Simple logger utility
 * Provides consistent logging throughout the application
 */

// Use the existing console logger from server.js as a base
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => console.debug('[DEBUG]', ...args)
};

module.exports = { logger };
