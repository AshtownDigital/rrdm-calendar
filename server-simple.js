/**
 * Simple server.js for RRDM application - For testing deployments only
 */
const express = require('express');
const app = express();
const path = require('path');
const nunjucks = require('nunjucks');

console.log('<<<<< Current NODE_ENV is:', process.env.NODE_ENV, '>>>>>');
console.log('Starting simplified server for deployment testing');

// Configure Nunjucks with more comprehensive paths
const viewPaths = [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'views/modules'),
  path.join(__dirname, 'views/layouts'),
  path.join(__dirname, 'views/partials'),
  path.join(__dirname, 'node_modules/govuk-frontend')
];

const env = nunjucks.configure(viewPaths, {
  autoescape: true,
  express: app,
  watch: true
});

app.set('view engine', 'njk');
app.set('views', viewPaths);

// Static files - improve path resolution for CSS and assets
// Primary: serve files from the public directory (includes copied GOV.UK Frontend assets)
app.use(express.static(path.join(__dirname, 'public')));

// Secondary: fallback to node_modules for GOV.UK Frontend if not found in public
app.use('/govuk-frontend', express.static(path.join(__dirname, 'public', 'govuk-frontend')));
app.use('/govuk-frontend', express.static(path.join(__dirname, 'node_modules', 'govuk-frontend')));

// Assets from both locations
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'node_modules', 'govuk-frontend', 'assets')));

// Additional static routes for nested structures
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/javascripts', express.static(path.join(__dirname, 'public/javascripts')));
app.use('/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));

// Debugging route for static asset resolution
app.get('/check-assets', (req, res) => {
  const govukCssPath = path.join(__dirname, 'node_modules', 'govuk-frontend', 'govuk', 'all.css');
  const exists = require('fs').existsSync(govukCssPath);
  
  res.json({
    govukCssExists: exists,
    govukCssPath: govukCssPath,
    nodeModulesExists: require('fs').existsSync(path.join(__dirname, 'node_modules')),
    govukFrontendExists: require('fs').existsSync(path.join(__dirname, 'node_modules', 'govuk-frontend'))
  });
});

// Add CSRF mock for simplified server
app.use((req, res, next) => {
  req.csrfToken = () => 'mock-csrf-token';
  next();
});

// Root route - render a simplified home page that looks like the home module
app.get('/', (req, res) => {
  // Render directly with a simplified Home page template
  res.render('home-simple', {
    title: 'Register Team Internal Services - Deployment Test',
    user: { name: 'Test User', role: 'viewer' },
    sections: [
      {
        title: 'Release Diary',
        cards: [
          { title: 'Calendar View', description: 'View releases in calendar format', color: 'pink', url: '#' }
        ]
      },
      {
        title: 'Business Change Management',
        cards: [
          { title: 'Business Change Requests', description: 'Manage and track business change requests', color: 'yellow', url: '#' },
          { title: 'Release Management', description: 'Plan and track system releases', color: 'turquoise', url: '#' }
        ]
      }
    ],
    deploymentStatus: {
      status: 'successful',
      env: process.env.NODE_ENV || 'test-deployment',
      nodeVersion: process.version,
      serverTime: new Date().toISOString()
    }
  });
});

// Debug route - shows status
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Simple server is running',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Application error:', err);
  res.status(500).send('Server error: ' + (process.env.NODE_ENV === 'production' ? 'Check logs for details.' : err.message));
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Simple server running at http://localhost:${port}`);
});

// Export the Express app
module.exports = app;
