/**
 * Logger Service
 * Provides structured logging across the application
 */

const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'bcr-service' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message} ${info.module ? `[${info.module}]` : ''} ${info.meta ? JSON.stringify(info.meta) : ''}`
        )
      )
    }),
    // Write all logs to file
    new winston.transports.File({ 
      filename: path.join(process.env.LOG_DIR || 'logs', 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(process.env.LOG_DIR || 'logs', 'combined.log') 
    })
  ]
});

/**
 * Create a module-specific logger
 * @param {string} moduleName - Name of the module
 * @returns {Object} - Logger instance with module context
 */
function createModuleLogger(moduleName) {
  return {
    info: (message, meta = {}) => {
      logger.info(message, { module: moduleName, meta });
    },
    error: (message, error = null, meta = {}) => {
      const logMeta = { ...meta };
      if (error) {
        logMeta.error = {
          message: error.message,
          stack: error.stack
        };
      }
      logger.error(message, { module: moduleName, meta: logMeta });
    },
    warn: (message, meta = {}) => {
      logger.warn(message, { module: moduleName, meta });
    },
    debug: (message, meta = {}) => {
      logger.debug(message, { module: moduleName, meta });
    }
  };
}

module.exports = {
  logger,
  createModuleLogger
};
