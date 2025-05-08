const express = require('express');
const path = require('path');
const fs = require('fs');
const nunjucks = require('nunjucks');
const dateFilter = require('nunjucks-date-filter');
const session = require('express-session');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');

// Load environment configuration
const config = require('./config/env');
const { prisma } = require('./config/database');

const passport = require('passport');
const flash = require('connect-flash');
// Initialize Express
const app = express();

// Initialize logging with better error handling for serverless environments
let logger;
let performanceMiddleware;
let startMetricsLogging;

// Detect serverless environment
const isServerless = process.env.VERCEL === '1';

// Set up console-based logger as fallback
const consoleLogger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => console.debug('[DEBUG]', ...args)
};

// Set up dummy performance middleware
const dummyPerformanceMiddleware = () => (req, res, next) => next();
const dummyStartMetricsLogging = () => {};

// In serverless, use simplified logging to avoid initialization issues
if (isServerless) {
  logger = consoleLogger;
  performanceMiddleware = dummyPerformanceMiddleware;
  startMetricsLogging = dummyStartMetricsLogging;
  
  logger.info('Serverless environment detected, using simplified logging');
} else {
  // In regular environment, try to use full logging
  try {
    const loggerModule = require('./services/logger');
    logger = loggerModule.logger;
    
    // Initialize performance monitoring
    const perfModule = require('./services/monitoring/performanceMonitor');
    performanceMiddleware = perfModule.performanceMiddleware;
    startMetricsLogging = perfModule.startMetricsLogging;
    
    // Start metrics logging (every 5 minutes)
    startMetricsLogging(300000);
    
    // Log application startup
    logger.info('Application starting', {
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      version: require('./package.json').version
    });
  } catch (error) {
    console.warn('Warning: Could not initialize logging or performance monitoring:', error.message);
    // Fall back to console logger
    logger = consoleLogger;
    performanceMiddleware = dummyPerformanceMiddleware;
    startMetricsLogging = dummyStartMetricsLogging;
  }
}


// Trust proxy when running on Vercel
if (process.env.VERCEL === '1') {
  app.set('trust proxy', 1);
}

// Function to handle database connection with retries
async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log('Successfully connected to database');
      return true;
    } catch (error) {
      console.error(`Failed to connect to database (attempt ${i + 1}/${retries}):`, error);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Prisma connection');
  try {
    await prisma.$disconnect();
    console.log('Prisma disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting from Prisma:', error);
  }
  process.exit(0);
});

// Add body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import and mount the Vercel health check route
// This must be before any authentication middleware
const vercelHealthRoute = require('./routes/vercel-health');
app.use('/_vercel/health', vercelHealthRoute);

// Import and apply middleware conditionally to avoid errors
// Wrap all middleware in a function to control execution order
function applyMiddleware() {
  // Create a simple middleware that logs requests in serverless environment
  if (isServerless) {
    app.use((req, res, next) => {
      logger.info(`[${req.method}] ${req.path}`);
      next();
    });
    
    // Use serverless-optimized rate limiter in Vercel environment
    try {
      const { serverlessFallbackLimiter } = require('./middleware/rateLimiter');
      app.use(serverlessFallbackLimiter);
      logger.info('Serverless fallback rate limiter applied');
    } catch (error) {
      logger.warn('Could not load serverless rate limiter:', error.message);
    }
  }

  // Security middleware
  try {
    // Import security middleware
    const { securityHeaders } = require('./middleware/securityMiddleware');
    // Apply security headers
    app.use(securityHeaders());
    logger.info('Security middleware applied');
  } catch (error) {
    logger.warn('Could not apply security middleware:', error.message);
    // Apply basic security headers as fallback
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Frame-Options', 'DENY');
      next();
    });
    logger.info('Basic security headers applied as fallback');
  }

  // Rate limiting middleware - skip in serverless to avoid Redis dependency
  if (!isServerless) {
    try {
      // Import rate limiting middleware
      const { apiLimiter, authLimiter, generalLimiter } = require('./middleware/rateLimiter');
      // Apply rate limiting
      app.use('/api', apiLimiter);
      app.use('/auth', authLimiter);
      app.use(generalLimiter);
      logger.info('Rate limiting middleware applied');
    } catch (error) {
      logger.warn('Could not apply rate limiting middleware:', error.message);
    }
  } else {
    logger.info('Rate limiting skipped in serverless environment');
  }

  // Logging middleware
  try {
    // Import logging middleware
    const { createLoggingMiddleware } = require('./middleware/loggingMiddleware');
    // Apply logging middleware
    app.use(createLoggingMiddleware('combined'));
    logger.info('Logging middleware applied');
  } catch (error) {
    logger.warn('Could not apply logging middleware:', error.message);
    // Apply basic logging middleware as fallback
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });
    logger.info('Basic logging middleware applied as fallback');
  }

  // Apply performance monitoring if available
  if (typeof performanceMiddleware === 'function') {
    app.use(performanceMiddleware());
    logger.info('Performance monitoring middleware applied');
  }
}

// Apply middleware
applyMiddleware();


// Cookie parser middleware
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Express session middleware with environment-specific configuration
app.use(session({
  secret: config.sessionSecret,
  name: 'rrdm.sid',
  resave: true, // Changed to true to ensure session is saved on every request
  saveUninitialized: true, // Changed to true to create session for all visitors
  rolling: true,
  proxy: true, // Always trust the proxy in Vercel environment
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000,  // Clean up expired sessions every 2 minutes
    dbRecordIdIsSessionId: true, // Use session ID as database record ID
    ttl: 24 * 60 * 60,  // 24 hours in seconds
    sessionModelName: 'Session',
    autoRemove: 'native', // Use native TTL for session cleanup
    autoRemoveInterval: 10 // Check expired sessions every 10 minutes
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: config.isProd, // Only secure in production
    sameSite: 'lax', // Changed to lax for better compatibility
    path: '/',
    // Remove domain restriction which can cause issues in serverless
    domain: undefined
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash middleware
app.use(flash());

// Configure Passport with Neon PostgreSQL database
console.log('Using Neon PostgreSQL database passport configuration');
require('./config/passport-db')(passport);

// Set up static file serving with environment-specific cache control
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: config.isProd ? '1d' : 0,
  etag: true,
  setHeaders: function (res, path) {
    // Ensure CSS files have the correct content type
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Serve GOV.UK Frontend assets from node_modules
app.use('/assets', express.static(path.join(__dirname, 'node_modules/govuk-frontend/dist/govuk/assets')));
app.use('/scripts', express.static(path.join(__dirname, 'node_modules/govuk-frontend/dist/govuk')));

// Fallback route for CSS files to ensure they're always served with the correct content type
app.get('/stylesheets/:file', (req, res, next) => {
  const filePath = path.join(__dirname, 'public', 'stylesheets', req.params.file);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return next(); // File doesn't exist, let Express handle it
    }
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(filePath);
  });
});

// Set up view engine
app.set('view engine', 'njk');
app.set('views', path.join(__dirname, 'views'));

// Configure Nunjucks
const env = nunjucks.configure('views', {
  autoescape: true,
  express: app,
  watch: true
});

// Add array filters
env.addFilter('map', (arr, prop) => {
  return arr.map(item => item[prop]);
});

// Add custom date filter
env.addFilter('date', (str) => {
  return new Date(str).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

// Add number formatting filter
env.addFilter('toLocaleString', (num) => {
  return num.toLocaleString('en-GB');
});

// Add regex search filter
env.addFilter('regex_search', (str, pattern) => {
  if (!str) return null;
  const regex = new RegExp(pattern);
  return str.match(regex);
});

// Add global variables for partials
app.locals.header = 'partials/header.njk';
app.locals.navigation = 'partials/navigation.njk';
app.locals.footer = 'partials/footer.njk';

// Middleware to set navigation for each request
app.use((req, res, next) => {
  // Default navigation
  if (!res.locals.navigation) {
    res.locals.navigation = 'partials/navigation.njk';
  }
  
  // Make user available to all templates
  res.locals.user = req.user || null;
  
  next();
});

// Import route modules
const homeRouter = require('./routes/home/index');
const refDataRouter = require('./routes/ref-data/index');
const fundingRouter = require('./routes/funding/index');
const bcrRouter = require('./routes/bcr/index');
const accessRouter = require('./routes/access/index');

// Legacy routes - these will be removed after migration is complete
const dashboardRouter = require('./routes/dashboard/index');
const itemsRouter = require('./routes/items');
const valuesRouter = require('./routes/values/index');
const releaseNotesRouter = require('./routes/release-notes/index');
const restorePointsRouter = require('./routes/restore-points');

// Import API routes for Vercel serverless optimization
const apiRouter = require('./api');

// Import auth middleware
const { ensureAuthenticated, ensureAdmin, checkPermission } = require('./middleware/auth');
const adminAuth = require('./middleware/admin-auth');
const tokenRefreshMiddleware = require('./middleware/token-refresh');

// Import centralized error handler middleware
let errorHandler;
try {
  errorHandler = require('./middleware/errorHandler');
  logger.info('Error handler middleware loaded');
} catch (error) {
  logger.warn('Could not load error handler middleware:', error.message);
  // Create a comprehensive fallback error handler
  errorHandler = {
    ApiError: class ApiError extends Error {
      constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isApiError = true;
      }
    },
    notFound: (req, res, next) => {
      const error = new Error(`Not Found - ${req.originalUrl}`);
      error.statusCode = 404;
      next(error);
    },
    apiErrorHandler: (err, req, res, next) => {
      if (!req.path.startsWith('/api/')) {
        return next(err);
      }
      const statusCode = err.statusCode || 500;
      const errorResponse = {
        success: false,
        error: {
          message: err.message || 'Server Error',
          status: statusCode
        }
      };
      logger.error(`API Error: ${err.message}`);
      return res.status(statusCode).json(errorResponse);
    },
    webErrorHandler: (err, req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next(err);
      }
      const statusCode = err.statusCode || 500;
      logger.error(`Web Error: ${err.message}`);
      res.status(statusCode).render('error', {
        title: `Error ${statusCode}`,
        message: err.message || 'An unexpected error occurred',
        error: process.env.NODE_ENV === 'development' ? err : {},
        user: req.user
      });
    }
  };
  logger.info('Fallback error handler created');
}

// Access routes - some endpoints don't require authentication (login, logout)
// but the user management routes are protected by adminAuth middleware in the router
app.use('/access', accessRouter);

// Apply token refresh middleware to all authenticated routes
app.use(tokenRefreshMiddleware);

// Protected routes - accessible to all authenticated users
app.use('/home', ensureAuthenticated, homeRouter);
app.use('/ref-data', ensureAuthenticated, refDataRouter);
app.use('/funding', ensureAuthenticated, fundingRouter);
app.use('/bcr', ensureAuthenticated, bcrRouter);

// Legacy routes - these will be removed after migration is complete
// Redirect /dashboard to /ref-data/dashboard
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.redirect('/ref-data/dashboard');
});

// Keep these routes for backward compatibility
app.use('/items', ensureAuthenticated, itemsRouter);
app.use('/values', ensureAuthenticated, valuesRouter);
app.use('/release-notes', ensureAuthenticated, releaseNotesRouter);
app.use('/restore-points', ensureAuthenticated, restorePointsRouter);

// Use API routes for Vercel serverless optimization
app.use('/api', ensureAuthenticated, apiRouter);

// Redirect root to home page or login page
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/home');
  } else {
    res.redirect('/access/login');
  }
});

// Direct route to the dashboard for authenticated users
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  const currentYear = new Date().getFullYear();
  // Render the dashboard index template directly
  res.render('modules/dashboard/index', {
    serviceName: 'Reference Data Management',
    selectedYear: currentYear,
    latestYear: currentYear,
    latestVersion: '1.0',
    user: req.user
  });
});

// Fallback route for the ref-data dashboard
app.get('/ref-data/dashboard', ensureAuthenticated, (req, res) => {
  res.redirect('/dashboard');
});

// Session error handling middleware (specific to session issues)
app.use((err, req, res, next) => {
  // Handle session errors specifically
  if (err.code === 'ENOENT' || err.message.includes('session')) {
    // Clear the invalid session - safely handle the case where session might not exist
    if (req.session) {
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Error destroying session:', sessionErr);
        }
        
        // Clear the cookies
        res.clearCookie('connect.sid');
        
        // Render a security error page
        return res.status(403).render('error', {
          title: 'Security Error',
          message: 'Your session has expired or is invalid. Please try again.',
          action: '/access/login',
          actionText: 'Sign in again'
        });
      });
    } else {
      // If session doesn't exist, just clear cookies and render error
      res.clearCookie('connect.sid');
      
      return res.status(403).render('error', {
        title: 'Security Error',
        message: 'Your session has expired or is invalid. Please try again.',
        action: '/access/login',
        actionText: 'Sign in again'
      });
    }
  } else {
    // Pass other errors to the next error handler
    next(err);
  }
});

// Use centralized error handler
app.use(function(err, req, res, next) {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).render('error', {
    title: 'Error',
    message: err.message || 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err : {},
    user: req.user
  });
});

// 404 handling
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: {}
  });
});

// Get port from environment configuration
const PORT = config.port;

// Only start the server when running directly with Node.js
// This prevents the server from trying to start in Vercel's serverless environment
if (!process.env.VERCEL && require.main === module) {
  // Database connection
  // Use Neon PostgreSQL database connection
  console.log('Using Neon PostgreSQL database connection');
  const db = require('./config/database');
  
  const { testConnection } = db;

  // Test database connection
  testConnection().then((connected) => {
    if (!connected) {
      console.error('Failed to connect to database after multiple attempts. Exiting...');
      process.exit(1);
    }
    
    // With Prisma, schema migrations are handled separately with prisma migrate
    // No need to sync models at runtime as it's done during deployment
    console.log('Using Prisma for database schema management');
    // If needed, you can perform database health checks here
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

// Export the Express app for Vercel serverless functions
module.exports = app;

// Set environment variables for Vercel deployment


if (process.env.VERCEL) {
  // Force production environment on Vercel
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  logger.info(`Running in Vercel ${process.env.NODE_ENV} environment`);
  
  // For Vercel, ensure database connection is established
  try {
    // Connect to database when running in Vercel with retries
    // Use a shorter timeout for serverless functions
    connectWithRetry(3, 3000).then(connected => {
      if (!connected) {
        logger.error('Failed to connect to database in Vercel environment');
      } else {
        logger.info('Successfully connected to database in Vercel environment');
      }
    }).catch(error => {
      logger.error('Database connection promise rejected:', error.message);
    });
  } catch (error) {
    logger.error('Error connecting to database in Vercel environment:', error.message);
  }
  
  // Add global error handler for unhandled rejections in serverless
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In serverless, we don't exit the process
  });
  
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // In serverless, we don't exit the process
  });
}