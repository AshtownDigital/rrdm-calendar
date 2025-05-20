/**
 * Logger Service
 * 
 * This module provides a centralized logging system for the application.
 * It supports different log levels, formats, and transports.
 */
const winston = require('winston');
const { format, transports, createLogger } = winston;
const config = require('../../config/env');

// Custom log format
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// HTTP request format for Morgan integration
const httpFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ level, message, timestamp, method, url, status, responseTime }) => {
    return `${timestamp} [${level.toUpperCase()}] HTTP ${method} ${url} ${status} ${responseTime}ms`;
  })
);

// Create the logger instance
const logger = createLogger({
  level: config.isProd ? 'info' : 'debug',
  format: customFormat,
  defaultMeta: { service: 'rrdm-app' },
  transports: [
    // Console transport for all environments
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, ...meta }) => {
          const metaString = Object.keys(meta).length ? 
            `\n${JSON.stringify(meta, null, 2)}` : '';
          return `${timestamp} [${level}]: ${message}${metaString}`;
        })
      )
    })
  ],
  exitOnError: false
});

// Determine if we're running in a serverless environment
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Add file transports in production (but not in serverless environments)
if (config.isProd && !isServerless) {
  // Make sure logs directory exists
  try {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  logger.add(
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  );
  
  logger.add(
    new transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  );
  } catch (err) {
    console.warn('Unable to create logs directory:', err.message);
    // Continue without file logging
  }
} else if (config.isProd && isServerless) {
  console.log('Running in serverless mode - file logging disabled');
}

// Create HTTP logger for Morgan integration
const httpLogger = createLogger({
  level: 'http',
  format: httpFormat,
  defaultMeta: { service: 'rrdm-http' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, method, url, status, responseTime }) => {
          const statusColor = status >= 400 ? '\x1b[31m' : // Red for errors
                            status >= 300 ? '\x1b[33m' : // Yellow for redirects
                            '\x1b[32m'; // Green for success
          const reset = '\x1b[0m';
          return `${timestamp} ${method} ${url} ${statusColor}${status}${reset} ${responseTime}ms`;
        })
      )
    })
  ]
});

// Add file transport for HTTP logs in production (but not in serverless environments)
if (config.isProd && !isServerless) {
  httpLogger.add(
    new transports.File({ 
      filename: 'logs/http.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  );
}

/**
 * Create a child logger with additional metadata
 * @param {Object} meta - Additional metadata
 * @returns {Object} - Child logger
 */
function child(meta) {
  return logger.child(meta);
}

/**
 * Log HTTP request information (for Morgan integration)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} responseTime - Response time in milliseconds
 */
function logHttpRequest(req, res, responseTime) {
  httpLogger.info('HTTP Request', {
    method: req.method,
    url: req.originalUrl || req.url,
    status: res.statusCode,
    responseTime,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    userId: req.user ? req.user.id : 'anonymous'
  });
}

/**
 * Log an audit event
 * @param {string} action - The action performed
 * @param {string} userId - The user who performed the action
 * @param {string} resourceType - The type of resource affected
 * @param {string} resourceId - The ID of the resource affected
 * @param {Object} details - Additional details about the action
 */
function audit(action, userId, resourceType, resourceId, details = {}) {
  logger.info('Audit event', {
    audit: true,
    action,
    userId,
    resourceType,
    resourceId,
    timestamp: new Date().toISOString(),
    details
  });
}

module.exports = {
  logger,
  httpLogger,
  child,
  logHttpRequest,
  audit
};
