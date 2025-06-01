/**
 * Clean server.js for RRDM application
 * Updated to use MongoDB instead of Prisma
 */
const express = require('express');
const app = express();
const path = require('path');
const nunjucks = require('nunjucks');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { connect, mongoose } = require('./config/database.mongo');
const flash = require('connect-flash');

// === Core Module Routes ===

// Import all modularized routes

// BCR module routes - preserve all BCR functionality including workflows, urgency levels, and impact areas
const bcrRouter = require('./routes/modules/bcr/routes'); 

// BCR controllers
const bcrController = require('./controllers/modules/bcr/controller');

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

// Academic Year module routes
const academicYearRouter = require('./routes/academicYearRoutes');
const { updateAcademicYearStatuses } = require('./services/academicYearService'); // Added for one-time status update
const releaseRoutes = require('./routes/releaseRoutes'); // Added for Release Diary Management

// View routes (for rendering Nunjucks templates)
const viewRoutes = require('./routes/viewRoutes');

// Note: Legacy modules have been removed as part of modularization

// Load environment variables
require('dotenv').config();

// Connect to MongoDB with automatic reconnection
const connectWithRetry = async () => {
  try {
    await connect();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

// Initial connection attempt
connectWithRetry();

// Configure session middleware with MongoDB store
const MongoStore = require('connect-mongo');

// Initialize cookie-parser middleware (required for CSRF)
app.use(cookieParser(process.env.SESSION_SECRET || 'your-secret-key'));

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: false }));
// Middleware to parse JSON bodies (as sent by API clients)
app.use(express.json());

// Determine the appropriate MongoDB URI based on environment
let mongoUrl = process.env.MONGODB_URI;

// For Heroku, ensure we're using the correct MongoDB URI
if (process.env.NODE_ENV === 'production' && !mongoUrl) {
  console.error('ERROR: MONGODB_URI environment variable is not set in production!');
  // Fallback to a dummy URI that will fail gracefully
  mongoUrl = 'mongodb://atlas-placeholder-uri/rrdm';
} else if (!mongoUrl) {
  // For local development, use localhost
  mongoUrl = 'mongodb://localhost:27017/rrdm';
}

// Mask sensitive parts of the connection string for logging
const maskedUrl = mongoUrl.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:***@');
console.log(`Setting up session store with MongoDB at ${maskedUrl}`);

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUrl,
    ttl: 24 * 60 * 60, // Session TTL (1 day)
    autoRemove: 'native', // Use MongoDB's TTL index
    touchAfter: 24 * 3600, // Only update session every 24 hours unless data changes
    crypto: {
      secret: process.env.SESSION_SECRET || 'your-secret-key'
    },
    mongoOptions: {
      serverSelectionTimeoutMS: 10000 // Increased timeout for staging/production environments
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Flash messages middleware - should be after session middleware
app.use(flash());

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
  console.log('[Nunjucks date Filter] Input date:', date, 'Format:', format);
  if (!date) {
    console.log('[Nunjucks date Filter] No date provided, returning empty string.');
    return '';
  }
  
  let dateObj;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    console.error('[Nunjucks date Filter] Invalid date type provided:', typeof date, date);
    return date; // Return original input if type is unexpected
  }
  
  console.log('[Nunjucks date Filter] Parsed dateObj:', dateObj);

  // Check if dateObj is a valid Date
  if (!(dateObj instanceof Date && !isNaN(dateObj.getTime()))) {
    console.error('[Nunjucks date Filter] Invalid dateObj after parsing:', dateObj, 'Original input:', date);
    return date; // Or return an empty string or a specific error message
  }

  // Default format if not provided
  const targetFormat = format || 'dd/MM/yyyy'; // Defaulting to dd/MM/yyyy
  console.log('[Nunjucks date Filter] Target format:', targetFormat);

  if (targetFormat === 'DD/MM/YYYY') {
    const day = dateObj.getUTCDate().toString().padStart(2, '0');
    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0'); // UTC months are 0-indexed
    const year = dateObj.getUTCFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    console.log('[Nunjucks date Filter] Formatted date (dd/MM/yyyy):', formattedDate);
    return formattedDate;
  } else if (targetFormat === 'DD MMM YYYY') {
    // Example for another format (Moment.js-like)
    const day = dateObj.getUTCDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = months[dateObj.getUTCMonth()];
    const year = dateObj.getUTCFullYear();
    const formattedDate = `${day} ${monthStr} ${year}`;
    console.log('[Nunjucks date Filter] Formatted date (DD MMM YYYY):', formattedDate);
    return formattedDate;
  }
  
  console.warn('[Nunjucks date Filter] Unsupported format string:', targetFormat, '- returning raw date string.');
  return dateObj.toISOString(); // Fallback for unhandled formats
});

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

// CSRF protection is now applied on a per-route basis
// See middleware/csrf.js for the implementation
// and individual route files for usage

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

// Use the view router for frontend pages
app.use('/', wrapRouter('view', viewRoutes));

// Academic Year API routes
app.use('/api/v1/academic-years', wrapRouter('academicYearApi', academicYearRouter));
app.use('/api/v1/releases', wrapRouter('releaseApi', releaseRoutes));

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

// BCR submissions routes
app.get('/bcr/submissions', (req, res) => {
  // Directly render the submissions page with our test data
  const Submission = require('./models/Submission');
  
  // Helper function to get status tag
  const getSubmissionStatusTag = (submission) => {
    const status = submission.status || 'Pending';
    
    switch (status) {
      case 'Approved':
        return { text: 'Approved', class: 'govuk-tag govuk-tag--green' };
      case 'Rejected':
        return { text: 'Rejected', class: 'govuk-tag govuk-tag--red' };
      case 'Paused':
        return { text: 'Paused', class: 'govuk-tag govuk-tag--yellow' };
      case 'Closed':
        return { text: 'Closed', class: 'govuk-tag govuk-tag--grey' };
      case 'More Info Required':
        return { text: 'More Info Required', class: 'govuk-tag govuk-tag--blue' };
      case 'Pending':
      default:
        return { text: 'Pending', class: 'govuk-tag govuk-tag--purple' };
    }
  };
  
  // Get all submissions
  Submission.find().sort({ createdAt: -1 })
    .then(submissions => {
      // Format submissions for display
      const formattedSubmissions = submissions.map(submission => {
        const statusTag = getSubmissionStatusTag(submission);
        
        return {
          id: submission._id || submission.id,
          submissionCode: submission.submissionCode || 'N/A',
          briefDescription: submission.briefDescription || 'No description provided',
          fullName: submission.fullName || 'Unknown',
          emailAddress: submission.emailAddress || 'No email provided',
          submissionSource: submission.submissionSource || 'Unknown',
          organisation: submission.organisation || 'Not specified',
          urgencyLevel: submission.urgencyLevel || 'Not specified',
          impactAreas: Array.isArray(submission.impactAreas) ? submission.impactAreas.join(', ') : 'None',
          displayStatus: statusTag.text,
          statusClass: statusTag.class,
          createdAt: submission.createdAt ? 
            new Date(submission.createdAt).toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            }) : 'Unknown',
          updatedAt: submission.updatedAt ? 
            new Date(submission.updatedAt).toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            }) : 'Unknown',
          reviewedAt: submission.reviewedAt ? 
            new Date(submission.reviewedAt).toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            }) : 'Not reviewed'
        };
      });
      
      // Render the submissions page
      res.render('modules/bcr/submissions/index', {
        title: 'BCR Submissions',
        submissions: formattedSubmissions,
        filters: req.query,
        connectionIssue: false,
        timedOut: false,
        user: req.user
      });
    })
    .catch(error => {
      console.error('Error loading submissions:', error);
      res.render('modules/bcr/submissions/index', {
        title: 'BCR Submissions',
        submissions: [],
        filters: req.query,
        connectionIssue: true,
        timedOut: false,
        error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while loading submissions',
        user: req.user
      });
    });
});

// For backward compatibility
app.get('/bcr/submissions/list', (req, res) => {
  res.redirect('/bcr/submissions');
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

// Add redirect for the main bcr-submission URL
app.get('/bcr-submission', (req, res) => {
  res.redirect('/bcr/submit');
});

// Handle POST requests to bcr-submission
app.post('/bcr-submission', (req, res) => {
  res.redirect(307, '/bcr/submit');
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
console.log('Starting HTTP server');

const port = process.env.PORT || 3001;
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

// Export the Express app
module.exports = app;
