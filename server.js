/**
 * Clean server.js for RRDM application
 * Updated to use MongoDB instead of Prisma
 */
const express = require('express');
const app = express();
const path = require('path');
const nunjucks = require('nunjucks');
const session = require('express-session');
const { connect, mongoose } = require('./config/database.mongo');

// === Core Module Routes ===

// Import all modularized routes

// BCR module routes - preserve all BCR functionality including workflows, urgency levels, and impact areas
const bcrRouter = require('./routes/modules/bcr/routes'); 

// Reference Data module routes
const refDataRouter = require('./routes/modules/reference-data/routes');

// Dashboard module routes
const dashboardRouter = require('./routes/modules/dashboard/routes');

// Access module routes
const accessRouter = require('./routes/modules/access/routes');

// Home module routes
const homeRouter = require('./routes/modules/home/routes');

// Funding module routes
const fundingRouter = require('./routes/modules/funding/routes');

// Note: Legacy modules have been removed as part of modularization

// Load environment variables
require('dotenv').config();

// Connect to MongoDB
if (!process.env.VERCEL) {
  // In non-serverless environments, connect immediately
  connect().catch(error => {
    console.error('Failed to connect to MongoDB:', error);
  });
} else {
  // In serverless environments, connection will be handled per-request
  console.log('Serverless environment detected, deferring MongoDB connection');
}

// Configure session middleware with MongoDB store
const MongoStore = require('connect-mongo');

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60, // Session TTL (1 day)
    autoRemove: 'native', // Use MongoDB's TTL index
    touchAfter: 24 * 3600, // Only update session every 24 hours unless data changes
    crypto: {
      secret: process.env.SESSION_SECRET || 'your-secret-key'
    },
    mongoOptions: {
      serverSelectionTimeoutMS: process.env.VERCEL === '1' ? 3000 : 5000
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Configure Nunjucks view engine
const env = nunjucks.configure([
  path.join(__dirname, 'views'),
  path.join(__dirname, 'node_modules', 'govuk-frontend')
], {
  autoescape: true,
  express: app,
  watch: process.env.NODE_ENV !== 'production',
  noCache: process.env.NODE_ENV !== 'production'
});

// Set view engine
app.set('view engine', 'njk');
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'node_modules', 'govuk-frontend')
]);

// Add custom filters
env.addFilter('json', function(value) {
  return JSON.stringify(value, null, 2);
});

env.addFilter('date', function(date, format) {
  if (!date) return '';
  
  // Convert string to Date object if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Default format
  if (!format) format = 'DD MMM YYYY';
  
  // Simple date formatter
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();
  
  // Month names
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Replace format tokens
  return format
    .replace('DD', day)
    .replace('MMM', monthNames[month])
    .replace('YYYY', year);
});

env.addFilter('ukDate', function(date) {
  if (!date) return '';
  
  // Convert string to Date object if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Format as DD/MM/YYYY
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
});

// Add ukDateWithDay filter
env.addFilter('ukDateWithDay', function(date) {
  if (!date) return '';
  
  // Convert string to Date object if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Day names
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Format as Day DD/MM/YYYY
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const dayOfWeek = dayNames[dateObj.getDay()];
  
  return `${dayOfWeek} ${day}/${month}/${year}`;
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use('/assets', express.static(path.join(__dirname, 'node_modules/govuk-frontend/govuk/assets')));
app.use('/assets/js', express.static(path.join(__dirname, 'node_modules/govuk-frontend/govuk/all.js')));
app.use('/assets/css', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/assets/images', express.static(path.join(__dirname, 'public/images')));

// Ensure direct access to stylesheets works (for compatibility)
app.use('/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/assets/images', express.static(path.join(__dirname, 'public/images')));

// Initialize GOV.UK Frontend
app.use('/govuk-frontend', express.static(path.join(__dirname, 'node_modules/govuk-frontend')));

// Add request timestamp for debugging
app.use((req, res, next) => {
  req.requestTime = new Date();
  next();
});

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || {};
  req.session.flash = {};
  next();
});

// CSRF protection middleware
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });

// Apply CSRF protection globally
app.use(csrfProtection);

// Add CSRF token to all responses
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Mock authentication middleware for testing
app.use((req, res, next) => {
  if (!req.user) {
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    };
  }
  next();
});

// Pass user info to all views
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// === CORE ROUTES ===
// Add debug wrapper for routers to identify undefined routes
// Super detailed router debugging
const wrapRouter = (name, router) => {
  console.log(`Registering ${name} router`);
  // Store original methods
  const origUse = router.use;
  const origGet = router.get;
  const origPost = router.post;
  const origPut = router.put;
  const origDelete = router.delete;
  
  // Create a helper function to log handler details
  const logHandlers = (method, path, handlers) => {
    console.log(`[${name}] ${method} route for path: '${path}' with ${handlers.length} handlers`);
    
    for (let i = 0; i < handlers.length; i++) {
      const handler = handlers[i];
      if (handler === undefined) {
        console.error(`[${name}] ${method} UNDEFINED HANDLER at position ${i} for path: '${path}'`);
      } else {
        const handlerName = handler.name || 'anonymous';
        console.log(`[${name}] ${method} handler at position ${i} for path: '${path}': ${handlerName}`);
      }
    }
  };
  
  // Override router methods to add logging
  router.use = function(path, ...handlers) {
    if (typeof path !== 'string') {
      // If path is a middleware function
      handlers.unshift(path);
      path = '*';
    }
    logHandlers('USE', path, handlers);
    return origUse.apply(this, [path, ...handlers]);
  };
  
  router.get = function(path, ...handlers) {
    logHandlers('GET', path, handlers);
    return origGet.apply(this, [path, ...handlers]);
  };
  
  router.post = function(path, ...handlers) {
    logHandlers('POST', path, handlers);
    return origPost.apply(this, [path, ...handlers]);
  };
  
  router.put = function(path, ...handlers) {
    logHandlers('PUT', path, handlers);
    return origPut.apply(this, [path, ...handlers]);
  };
  
  router.delete = function(path, ...handlers) {
    logHandlers('DELETE', path, handlers);
    return origDelete.apply(this, [path, ...handlers]);
  };
  
  return router;
};

// Use the home router for root route
app.use('/', wrapRouter('home', homeRouter));

// BCR Module - preserves all BCR functionality including workflows, urgency levels, and impact areas
app.use('/bcr', wrapRouter('bcr', bcrRouter));

// Reference Data Module
app.use('/reference-data', wrapRouter('reference-data', refDataRouter));
// Legacy path for backward compatibility
app.use('/ref-data', wrapRouter('ref-data', refDataRouter));

// Dashboard Module
app.use('/dashboard', wrapRouter('dashboard', dashboardRouter));

// Access Module
app.use('/access', wrapRouter('access', accessRouter));

// === Supporting Modules ===
app.use('/funding', wrapRouter('funding', fundingRouter));

// Note: Legacy modules (release-management and monitoring) have been removed as part of modularization

// Legacy redirect for home page
app.get('/home', (req, res) => {
  res.redirect('/');
});

// === Legacy BCR Route Redirects ===
// These redirects ensure backward compatibility with existing URLs
// while migrating to the new modular structure

// Redirect legacy BCR routes to the new modular BCR routes
app.get('/bcr/submit', (req, res) => {
  res.redirect('/bcr/submissions/new');
});

// Redirect legacy BCR phase-status mapping route to the new modular BCR routes
app.get('/bcr/phase-status-mapping', (req, res) => {
  res.redirect('/bcr/workflow/phases');
});

// Redirect legacy BCR create phase route to the new modular BCR routes
app.get('/bcr/phase-status-mapping/create-phase', (req, res) => {
  res.redirect('/bcr/workflow/phases/new');
});

// Redirect legacy BCR create status POST
app.post('/bcr/phase-status-mapping/create-status/:phaseId', (req, res) => {
  res.redirect(`/bcr/workflow/phases/${req.params.phaseId}/statuses/new`);
});

// Redirect legacy BCR phase detail route to the new modular BCR routes
app.get('/bcr/phase-status-mapping/phase/:id', (req, res) => {
  res.redirect(`/bcr/workflow/phases/${req.params.id}`);
});

// Redirect legacy BCR edit phase route
app.get('/bcr/phase-status-mapping/edit-phase/:id', (req, res) => {
  res.redirect(`/bcr/workflow/phases/${req.params.id}/edit`);
});

// Redirect legacy BCR edit status route to the new modular BCR routes
app.get('/bcr/phase-status-mapping/edit-status/:id', (req, res) => {
  res.redirect(`/bcr/workflow/statuses/${req.params.id}/edit`);
});

// Redirect legacy BCR delete phase route
app.get('/bcr/phase-status-mapping/delete-phase/:id', (req, res) => {
  res.redirect(`/bcr/workflow/phases/${req.params.id}/delete`);
});

// Redirect legacy BCR delete status route
app.get('/bcr/phase-status-mapping/delete-status/:id', (req, res) => {
  res.redirect(`/bcr/workflow/statuses/${req.params.id}/delete`);
});

// Redirect legacy BCR confirmation pages
app.get('/bcr/phase-status-mapping/create-status-confirmation', (req, res) => {
  res.redirect('/bcr/workflow/phases');
});

app.get('/bcr/phase-status-mapping/edit-phase-confirmation', (req, res) => {
  res.redirect('/bcr/workflow/phases');
});

app.get('/bcr/phase-status-mapping/edit-status-confirmation', (req, res) => {
  res.redirect('/bcr/workflow/phases');
});

app.get('/bcr/phase-status-mapping/delete-phase-confirmation', (req, res) => {
  res.redirect('/bcr/workflow/phases');
});

app.get('/bcr/phase-status-mapping/delete-status-confirmation', (req, res) => {
  res.redirect('/bcr/workflow/phases');
});

// Redirect legacy BCR workflow route
app.get('/bcr/workflow', (req, res) => {
  res.redirect('/bcr/workflow/phases');
});

// Redirect legacy BCR submissions list
app.get('/bcr/submissions', (req, res) => {
  res.redirect('/bcr/submissions/list');
});

// Redirect legacy BCR Impact Areas routes
app.get('/bcr/impact-areas', (req, res) => {
  res.redirect('/bcr/impact-areas/list');
});

// Redirect legacy BCR create impact area confirmation
app.get('/bcr/impact-areas/create-confirmation', (req, res) => {
  res.redirect('/bcr/impact-areas/list');
});

// Redirect legacy BCR edit impact area form
app.get('/bcr/impact-areas/edit/:id', (req, res) => {
  res.redirect(`/bcr/impact-areas/${req.params.id}/edit`);
});

// Redirect legacy BCR edit impact area POST form to GET (since we can't do POST redirects properly)
app.post('/bcr/impact-areas/edit/:id', (req, res) => {
  res.redirect(`/bcr/impact-areas/${req.params.id}/edit`);
});

// Redirect legacy BCR edit impact area confirmation
app.get('/bcr/impact-areas/edit-confirmation', (req, res) => {
  res.redirect('/bcr/impact-areas/list');
});

// Redirect BCR submission form to the new modular path
app.get('/bcr-submission/new', (req, res) => {
  res.redirect('/bcr/submit');
});

// Redirect legacy BCR delete impact area confirmation
app.get('/bcr/impact-areas/delete-confirmation', (req, res) => {
  res.redirect('/bcr/impact-areas/list');
});

// Redirect legacy BCR submit form POST
app.post('/bcr/submit', (req, res) => {
  res.redirect('/bcr/submissions/new');
});

// Redirect legacy BCR create phase POST
app.post('/bcr/phase-status-mapping/create-phase', (req, res) => {
  res.redirect('/bcr/workflow/phases/new');
});

// Redirect legacy BCR delete status POST
app.post('/bcr/phase-status-mapping/delete-status/:id', (req, res) => {
  res.redirect(`/bcr/workflow/statuses/${req.params.id}/delete`);
});

// Redirect legacy BCR update status POST
app.post('/bcr/update-status/:id', (req, res) => {
  res.redirect(`/bcr/submissions/${req.params.id}/status/update`);
});

// Redirect legacy BCR view route to the new modular BCR route
app.get('/bcr/:id', (req, res) => {
  res.redirect(`/bcr/submissions/${req.params.id}`);
});

// === Error handling ===

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: 'Page not found',
    message: 'The requested page was not found',
    error: {
      status: 404,
      stack: process.env.NODE_ENV === 'development' ? 'Page not found' : ''
    },
    user: req.user
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Application error:', err);
  
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV === 'development' ? err : {};
  
  // Render the error page
  res.status(err.status || 500);
  res.render('error', {
    title: 'Error',
    message: err.message || 'An unexpected error occurred',
    error: res.locals.error,
    user: req.user
  });
});

// === Server startup ===
const isServerless = process.env.VERCEL === '1';

if (!isServerless) {
  console.log('Running in standard mode - starting HTTP server');
  
  const port = process.env.PORT || 3000;
  let server;
  
  // Function to kill process on a specific port
  const killPortProcess = async (port) => {
    try {
      // Use different commands based on platform
      let command;
      if (process.platform === 'win32') {
        // Windows
        command = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a`;
      } else {
        // Unix-like
        command = `lsof -i :${port} -t | xargs kill -9`;
      }
      
      const { execSync } = require('child_process');
      execSync(command, { stdio: 'ignore' });
      
      // Give the OS a moment to release the port
      return new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      // No process found on port, continue
      return Promise.resolve();
    }
  };

  // Start server on specified port, kill any existing process if needed
  const startServer = async () => {
    try {
      // First try to start normally
      server = app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
      });
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, attempting to kill existing process...`);
        await killPortProcess(port);
        // Try again after killing the process
        server = app.listen(port, () => {
          console.log(`Server running at http://localhost:${port}`);
        });
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    }
  };

  // Wrap in IIFE to use async/await at the top level
  (async () => {
    try {
      await startServer();
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  })();
} else {
  console.log('Running in serverless mode - no HTTP server started');
}

// For Vercel serverless functions, we need to export a handler function
if (isServerless) {
  console.log('Running in serverless mode - exporting handler function');
  
  // Export a request handler function for serverless environments
  const handler = async (req, res) => {
    console.log(`[${new Date().toISOString()}] Serverless function invoked: ${req.method} ${req.url}`);
    
    try {
      // Log environment info for debugging
      console.log('Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        MONGODB_URI: process.env.MONGODB_URI ? '***' : 'Not set'
      });
      
      // Ensure database is connected
      if (mongoose.connection.readyState !== 1) {
        console.log('Attempting to connect to MongoDB...');
        try {
          await connect();
          console.log('MongoDB connection established successfully');
        } catch (dbError) {
          console.error('Failed to connect to MongoDB:', dbError);
          // Don't fail the request if we can't connect to MongoDB
          // The routes will handle the missing connection
        }
      }
      
      // Add a timeout for the request
      const requestTimeout = setTimeout(() => {
        if (!res.headersSent) {
          console.error('Request timed out');
          res.status(504).json({ error: 'Gateway Timeout', message: 'Request took too long to process' });
        }
      }, 10000); // 10 second timeout
      
      try {
        // Handle the request
        await new Promise((resolve, reject) => {
          res.on('finish', resolve);
          res.on('error', reject);
          app(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } finally {
        clearTimeout(requestTimeout);
      }
      
    } catch (error) {
      console.error('Serverless function error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      });
      
      // If headers are already sent, we can't send another response
      if (res.headersSent) {
        console.error('Headers already sent, could not send error response');
        return;
      }
      
      // Send error response
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' ? { 
          details: error.message,
          stack: error.stack 
        } : {})
      });
    }
  };
  
  // Export the handler with the app attached for testing
  module.exports = handler;
  module.exports.app = app;
} else {
  console.log('Running in standard mode - starting HTTP server');
  // Export the Express app for standard environments
  module.exports = app;
}
