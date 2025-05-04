const express = require('express');
const path = require('path');
const fs = require('fs');
const nunjucks = require('nunjucks');
const dateFilter = require('nunjucks-date-filter');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const { doubleCsrf } = require('csrf-csrf');

const app = express();

// Add body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'rrdm-dev-secret-key',
  resave: false,          // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  rolling: true,         // Reset cookie expiration on each response
  cookie: { 
    maxAge: 86400000,     // 24 hours in milliseconds (reduced from 7 days for security)
    secure: process.env.NODE_ENV === 'production', // Automatically use secure cookies in production
    httpOnly: true,       // Prevents client-side JS from reading the cookie
    sameSite: 'strict'    // Provides additional CSRF protection
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash middleware
app.use(flash());

// Simple CSRF token generation for production
const crypto = require('crypto');

// Generate a CSRF token for each session
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    // Generate a new token if one doesn't exist
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  
  // Make the token available to templates
  res.locals.csrfToken = req.session.csrfToken;
  
  // Debug logging for CSRF troubleshooting
  if (process.env.NODE_ENV !== 'production') {
    console.log('SESSION ID:', req.sessionID);
    console.log('CSRF token in session:', req.session.csrfToken);
    console.log('CSRF token in body:', req.body._csrf);
    console.log('Cookies:', req.headers.cookie);
  }
  // For POST, PUT, DELETE requests, validate the token
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const bodyToken = req.body._csrf;
    const sessionToken = req.session.csrfToken;
    
    if (!bodyToken || bodyToken !== sessionToken) {
      // Invalid token, regenerate the session
      req.session.regenerate((err) => {
        if (err) {
          return next(err);
        }
        return res.status(403).render('error', {
          title: 'Security Error',
          message: 'Invalid security token. Please try again.',
          action: '/access/login',
          actionText: 'Sign in again'
        });
      });
      return;
    }
  }
  
  next();
});

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
      message: 'Something went wrong',
      error: process.env.NODE_ENV === 'development' ? err : {}
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

const PORT = process.env.PORT || 3000;

// Only start the server when running directly with Node.js
// This prevents the server from trying to start in Vercel's serverless environment
if (!process.env.VERCEL && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express app for serverless environments
module.exports = app;
