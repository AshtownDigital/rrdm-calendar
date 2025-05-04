const express = require('express');
const path = require('path');
const fs = require('fs');
const nunjucks = require('nunjucks');
const dateFilter = require('nunjucks-date-filter');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');

const app = express();

// Add body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express session middleware
app.use(session({
  secret: 'rrdm-secret-key',
  resave: false,          // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  rolling: true,         // Reset cookie expiration on each response
  cookie: { 
    maxAge: 604800000,    // 7 days in milliseconds
    secure: false,        // Set to true in production with HTTPS
    httpOnly: true        // Prevents client-side JS from reading the cookie
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash middleware
app.use(flash());

// Configure Passport
require('./config/passport')(passport);

// Set up static file serving with cache control for better performance
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  etag: true
}));

// Fallback for GOV.UK Frontend assets if not found in public directory
// This helps during development but the build script should copy these for production
app.use('/assets', express.static(path.join(__dirname, 'node_modules/govuk-frontend/dist/govuk/assets')));
app.use('/scripts', express.static(path.join(__dirname, 'node_modules/govuk-frontend/dist/govuk')));

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

// Access routes - some endpoints don't require authentication (login, logout)
// but the user management routes are protected by adminAuth middleware in the router
app.use('/access', accessRouter);

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

// Redirect root to home
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/home');
  } else {
    res.redirect('/access/login');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong'
  });
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
