/**
 * Integrate Enhancements Script
 * 
 * This script integrates the new enhancements into the main application flow.
 * It updates the server.js file to include the new middleware and services.
 */
const fs = require('fs');
const path = require('path');

// Paths
const rootDir = path.resolve(__dirname, '..');
const serverJsPath = path.join(rootDir, 'server.js');

// Read server.js
console.log('Reading server.js...');
let serverJs = fs.readFileSync(serverJsPath, 'utf8');

// Middleware imports to add
const middlewareImports = `
// Security middleware
const { securityHeaders, csrfProtection, csrfErrorHandler, csrfTokenMiddleware } = require('./middleware/securityMiddleware');

// Rate limiting middleware
const { apiLimiter, authLimiter, generalLimiter } = require('./middleware/rateLimiter');

// Logging middleware
const { createLoggingMiddleware, errorLogger } = require('./middleware/loggingMiddleware');

// Cache middleware
const { cache } = require('./middleware/cacheMiddleware');

// Performance monitoring
const { performanceMiddleware, startMetricsLogging } = require('./services/monitoring/performanceMonitor');
`;

// Service initializations to add
const serviceInits = `
// Initialize logging
const { logger } = require('./services/logger');

// Start metrics logging (every 5 minutes)
startMetricsLogging(300000);

// Log application startup
logger.info('Application starting', {
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  version: require('./package.json').version
});
`;

// Middleware setup to add
const middlewareSetup = `
// Apply security headers
app.use(securityHeaders());

// Apply rate limiting
app.use('/api', apiLimiter);
app.use('/auth', authLimiter);
app.use(generalLimiter);

// Apply logging middleware
app.use(createLoggingMiddleware('combined'));

// Apply performance monitoring
app.use(performanceMiddleware());
`;

// Error handling to add
const errorHandling = `
// Apply error logging
app.use(errorLogger);
`;

// Update server.js
console.log('Updating server.js...');

// Add middleware imports after existing imports
serverJs = serverJs.replace(
  /(const\s+errorHandler\s+=\s+require\(['"]\.\/middleware\/errorHandler['"]\);)/,
  `$1\n${middlewareImports}`
);

// Add service initializations after app creation
serverJs = serverJs.replace(
  /(const\s+app\s+=\s+express\(\);)/,
  `$1\n${serviceInits}`
);

// Add middleware setup after existing middleware
serverJs = serverJs.replace(
  /(app\.use\(express\.urlencoded\(\{\s*extended:\s*true\s*\}\)\);)/,
  `$1\n${middlewareSetup}`
);

// Add error handling before the existing error handler
serverJs = serverJs.replace(
  /(app\.use\(errorHandler\);)/,
  `${errorHandling}\n$1`
);

// Write updated server.js
console.log('Writing updated server.js...');
fs.writeFileSync(serverJsPath, serverJs, 'utf8');

console.log('Server.js updated successfully!');
console.log('Enhancements have been integrated into the main application flow.');

// Create logs directory
const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(logsDir)) {
  console.log('Creating logs directory...');
  fs.mkdirSync(logsDir);
}

console.log('Integration complete!');
console.log('Please restart the application to apply the changes.');
