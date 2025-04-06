const express = require('express');
const path = require('path');
const fs = require('fs');
const nunjucks = require('nunjucks');

const app = express();

// Add body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Add custom filters
env.addFilter('date', (str) => {
  return new Date(str).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
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
  next();
});

// Import route modules
const homeRouter = require('./routes/home/index');
const refDataRouter = require('./routes/ref-data/index');

// Legacy routes - these will be removed after migration is complete
const dashboardRouter = require('./routes/dashboard/index');
const itemsRouter = require('./routes/items');
const valuesRouter = require('./routes/values/index');
const releaseNotesRouter = require('./routes/release-notes/index');
const restorePointsRouter = require('./routes/restore-points');

// Import API routes for Vercel serverless optimization
const apiRouter = require('./api');

// Use route modules
app.use('/home', homeRouter);
app.use('/ref-data', refDataRouter);

// Legacy routes - these will be removed after migration is complete
app.use('/dashboard', dashboardRouter);
app.use('/items', itemsRouter);
app.use('/values', valuesRouter);
app.use('/release-notes', releaseNotesRouter);
app.use('/restore-points', restorePointsRouter);

// Use API routes for Vercel serverless optimization
app.use('/api', apiRouter);

// Redirect root to home
app.get('/', (req, res) => {
  res.redirect('/home');
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
