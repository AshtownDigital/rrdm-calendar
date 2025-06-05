/**
 * Simple server.js for RRDM application - For testing deployments only
 */
const express = require('express');
const app = express();
const path = require('path');
const nunjucks = require('nunjucks');

console.log('<<<<< Current NODE_ENV is:', process.env.NODE_ENV, '>>>>>');
console.log('Starting simplified server for deployment testing');

// Configure Nunjucks
const env = nunjucks.configure(['views', 'node_modules/govuk-frontend'], {
  autoescape: true,
  express: app
});

app.set('view engine', 'njk');
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'node_modules', 'govuk-frontend')
]);

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/govuk-frontend', express.static(path.join(__dirname, 'node_modules/govuk-frontend')));
app.use('/assets', express.static(path.join(__dirname, 'node_modules/govuk-frontend/assets')));

// Load the home module controller
const homeController = require('./controllers/modules/home/controller');

// Root route - render the home module view
app.get('/', (req, res) => {
  try {
    // Setup empty user object since we're in simplified mode without auth
    req.user = req.user || { name: 'Test User', role: 'viewer' };
    
    // Set locals needed for the view
    res.locals = res.locals || {};
    res.locals.user = req.user;
    res.locals.flashMessages = {};
    
    // Render the home module view
    return homeController.index(req, res);
  } catch (error) {
    console.error('Error rendering home module:', error);
    
    // Fallback to basic HTML if there's an error
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RRDM Deployment</title>
          <link href="/govuk-frontend/govuk/all.css" rel="stylesheet">
          <style>
            .container { margin: 30px; font-family: "GDS Transport", arial, sans-serif; }
            .error { color: #d4351c; border: 5px solid #d4351c; padding: 20px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">
              <h1>RRDM Deployment</h1>
              <p>Error rendering home module. The server is running in simplified mode.</p>
              <p>Error details: ${error.message}</p>
            </div>
          </div>
        </body>
      </html>
    `);
  }
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
