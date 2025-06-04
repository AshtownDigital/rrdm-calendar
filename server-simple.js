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

// Root route - simple status message
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RRDM Deployment Test</title>
      <link href="/govuk-frontend/govuk/all.css" rel="stylesheet">
      <style>
        .container { 
          margin: 30px; 
          font-family: "GDS Transport", arial, sans-serif;
        }
        .success { 
          color: #00703c; 
          border: 5px solid #00703c; 
          padding: 20px; 
          margin-bottom: 20px;
        }
        .info { 
          border: 2px solid #1d70b8; 
          padding: 15px; 
          margin-bottom: 20px; 
        }
        h1, h2 { 
          margin-top: 0; 
        }
        code {
          background: #f3f2f1;
          padding: 4px;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success">
          <h1>RRDM Deployment Successful!</h1>
          <p>This simplified server is running correctly.</p>
        </div>
        
        <div class="info">
          <h2>Deployment Information</h2>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'Not specified'}</p>
          <p><strong>Node Version:</strong> ${process.version}</p>
          <p><strong>Server Time:</strong> ${new Date().toISOString()}</p>
        </div>
        
        <div class="info">
          <h2>Next Steps</h2>
          <p>The deployment has succeeded with our case sensitivity fixes. To complete the deployment:</p>
          <ol>
            <li>Set up a MongoDB Atlas database for the application</li>
            <li>Configure the <code>MONGODB_URI</code> environment variable on Heroku with your MongoDB connection string</li>
            <li>Restart the Heroku dynos to use the full application server</li>
          </ol>
        </div>
      </div>
    </body>
    </html>
  `);
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
