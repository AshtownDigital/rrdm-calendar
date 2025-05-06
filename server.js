const express = require('express');
const path = require('path');
const fs = require('fs');
const nunjucks = require('nunjucks');
const dateFilter = require('nunjucks-date-filter');
const session = require('express-session');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { prisma } = require('./config/database');

const passport = require('passport');
const flash = require('connect-flash');
// Initialize Express
const app = express();

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

// Cookie parser middleware
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Express session middleware with improved configuration for Vercel
app.use(session({
  secret: process.env.SESSION_SECRET || 'rrdm-dev-secret-key',
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
    secure: process.env.NODE_ENV === 'production', // Only secure in production
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

// Configure Passport
require('./config/passport')(passport);

// Set up static file serving with proper cache control and content types
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
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

// Assets are pre-copied during the build process
// No runtime file operations needed for Vercel's read-only environment

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

// Error handling middleware
app.use((err, req, res, next) => {
  // Log the error
  console.error('Server error:', err.stack);
  
  // Handle session errors
  if (err.code === 'ENOENT' || err.message.includes('session')) {
    // Clear the invalid session
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
    // Handle other errors
    res.status(500).render('error', {
      title: 'Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
      error: process.env.NODE_ENV === 'development' ? err : {},
      user: req.user
    });
  }
});

// 404 handling
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page not found',
    message: 'If you typed the web address, check it is correct.'
  });
});

const PORT = process.env.PORT || 9090;

// Only start the server when running directly with Node.js
// This prevents the server from trying to start in Vercel's serverless environment
if (!process.env.VERCEL && require.main === module) {
  // Connect to database first
  connectWithRetry().then(async connected => {
    if (!connected) {
      console.error('Failed to connect to database after retries');
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

// Export the Express app and prisma client for testing
module.exports = { app, prisma };

// Set environment variables for Vercel deployment
if (process.env.VERCEL) {
  process.env.NODE_ENV = 'production';
}

// Export the Express app for Vercel serverless functions
module.exports = app;
