console.log('<<<<< Current NODE_ENV is:', process.env.NODE_ENV, '>>>>>');/**
 * Clean server.js for RRDM application
 * Updated to use MongoDB instead of Prisma
 */
const express = require('express');
const app = express();

// VERY EARLY REQUEST LOGGER - Placed immediately after app instantiation
app.use((req, res, next) => {
  console.log(`***** INCOMING REQUEST: ${req.method} ${req.originalUrl} [${new Date().toISOString()}] *****`);
  next();
});
const path = require('path');
const nunjucks = require('nunjucks');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { connect, mongoose } = require('./config/database.mongo');
const { setupMockMongoose } = require('./config/mockMongoose');

// EARLY MOCK SETUP FOR DEVELOPMENT/TEST ENVIRONMENTS
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
  console.log('DEVELOPMENT/TEST MODE: Initializing Mongoose mocks EARLY...');
  setupMockMongoose(); // This patches mongoose.model and sets up mock connection
  console.log('DEVELOPMENT/TEST MODE: Mongoose mocks initialized EARLY.');
}

const flash = require('connect-flash');
const compression = require('compression');

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
const debugRoutes = require('./routes/debugRoutes'); // Debug routes for testing

// Note: Legacy modules have been removed as part of modularization

// Load environment variables
require('dotenv').config();

// Connect to MongoDB with automatic reconnection - BYPASSED FOR TESTING
const connectWithRetry = async () => {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    console.log('DEVELOPMENT/TEST MODE: Mock MongoDB connection should already be established by early setup.');
    // setupMockMongoose() was called earlier, so mongoose.connection is already mocked.
    // We can verify readyState if needed: console.log('Mongoose connection readyState:', mongoose.connection.readyState);
    return true;
  } else {
    // Real connection logic for production would go here
    console.log('PRODUCTION MODE: Connecting to real MongoDB');
    try {
      await connect();
      console.log('Connected to MongoDB successfully');
      return true;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      return false;
    }
  }
};

// Initial connection attempt
connectWithRetry();

// Configure session middleware with memory store for testing purposes
// const MongoStore = require('connect-mongo');
// Already required at line 9: const session = require('express-session');

// Initialize cookie-parser middleware (required for CSRF)
app.use(cookieParser(process.env.SESSION_SECRET || 'your-secret-key'));

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: false }));
// Middleware to parse JSON bodies (as sent by API clients)
app.use(express.json());

// TESTING MODE: Using in-memory session store instead of MongoDB
console.log('TESTING MODE: Using in-memory session store');

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  // Using in-memory store for testing
  // Normally we'd use MongoStore.create({...})
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

// Apply compression middleware
app.use(compression());

// Root URL handler - serve the home page from modules/home/index.njk
app.get('/', (req, res) => {
  res.render('modules/home/index', {
    user: req.session.user || null,
    title: 'Home | Register Team Internal Services'
  });
});

// URL pattern validator to prevent malformed URLs
const validateUrlPattern = (pattern) => {
  if (!pattern || typeof pattern !== 'string') {
    throw new TypeError('URL pattern must be a non-empty string');
  }
  // Check for malformed patterns that might cause path-to-regexp errors
  if (pattern.includes('://') || pattern.includes('..')) {
    throw new TypeError(`Invalid URL pattern: ${pattern}`);
  }
  return pattern.replace(/\/+/g, '/'); // Normalize multiple slashes
};

// Static file serving middleware with proper error handling
const serveStaticWithFallback = (urlPath, filePath) => {
  const validatedPath = validateUrlPattern(urlPath);
  return (req, res, next) => {
    // Validate the request URL
    if (req.url.includes('://') || req.url.includes('..')) {
      return next(new TypeError('Invalid request URL'));
    }

    const fullPath = path.join(__dirname, filePath);
    res.sendFile(fullPath, (err) => {
      if (err && err.code === 'ENOENT') {
        // File not found, continue to next middleware
        next();
      } else if (err) {
        // Other errors, send to error handler
        next(err);
      }
    });
  };
};

// GOV.UK Frontend assets with validated paths
app.use('/assets', express.static(path.join(__dirname, 'node_modules/govuk-frontend/govuk/assets'), {
  fallthrough: true, // Continue to next middleware if file not found
  index: false // Disable directory index
}));

app.use('/assets/js', serveStaticWithFallback('/assets/js', 'node_modules/govuk-frontend/govuk/all.js'));

// Application assets with proper path resolution and validation
app.use('/assets/css', express.static(path.join(__dirname, 'public/stylesheets'), {
  fallthrough: true,
  index: false
}));

app.use('/stylesheets', express.static(path.join(__dirname, 'public/stylesheets'), {
  fallthrough: true,
  index: false
})); // Legacy support

app.use('/assets/images', express.static(path.join(__dirname, 'public/images'), {
  fallthrough: true,
  index: false
}));
app.use('/scripts', express.static(path.join(__dirname, 'public/scripts')));

// Initialize GOV.UK Frontend
app.use('/govuk-frontend', express.static(path.join(__dirname, 'node_modules/govuk-frontend')));

// Serve manifest.json with proper error handling
app.use('/assets/manifest.json', serveStaticWithFallback('/assets/manifest.json', 'public/assets/manifest.json'));

// Serve files from public directory as a fallback
app.use(express.static(path.join(__dirname, 'public')));

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
  // Store the original methods to enhance them with logging
  const originalUse = router.use;
  const originalGet = router.get;
  const originalPost = router.post;
  const originalPut = router.put;
  const originalDelete = router.delete;
  
  // Create a helper function to validate route parameters
  const validatePath = (path) => {
    if (typeof path !== 'string') {
      console.warn(`[${name}] Warning: Non-string path argument:`, path);
      return path;
    }

    // Check for malformed route parameters
    const paramRegex = /:([^/]+)/g;
    const matches = path.match(paramRegex);
    
    if (matches) {
      matches.forEach(param => {
        const paramName = param.substring(1);
        if (!paramName || paramName.includes('.') || paramName.includes('-')) {
          throw new Error(`Invalid route parameter '${param}' in path '${path}'. Parameters must be valid JavaScript identifiers.`);
        }
      });
    }

    return path;
  };

  // Create a helper function to log handler details
  const logHandlers = (method, path, handlers) => {
    const validatedPath = validatePath(path);
    console.log(`[${name}] ${method.toUpperCase()} ${validatedPath}`);
    if (Array.isArray(handlers)) {
      handlers.forEach((handler, index) => {
        console.log(`  Handler ${index + 1}: ${handler.name || '<anonymous>'}`);
        if (handler.name === 'csrfProtection') {
          console.log('    - CSRF Protection enabled');
        }
      });
    }
  };

  // Replace the HTTP methods with enhanced versions
  router.use = function(path, ...handlers) {
    logHandlers('use', path, handlers);
    return originalUse.call(this, path, ...handlers);
  };

  router.get = function(path, ...handlers) {
    logHandlers('get', path, handlers);
    return originalGet.call(this, path, ...handlers);
  };

  router.post = function(path, ...handlers) {
    logHandlers('post', path, handlers);
    return originalPost.call(this, path, ...handlers);
  };

  router.put = function(path, ...handlers) {
    logHandlers('put', path, handlers);
    return originalPut.call(this, path, ...handlers);
  };

  router.delete = function(path, ...handlers) {
    logHandlers('delete', path, handlers);
    return originalDelete.call(this, path, ...handlers);
  };

  return router;
};

// Special route handler for release-management to avoid routing conflicts
app.get('/release-management', async (req, res, next) => {
  console.log('Direct route handler for /release-management triggered in server.js');
  const viewRouteHandler = require('./routes/viewRoutes');
  
  // Find the release management route handler within viewRoutes router
  let releaseManagementHandler = null;
  if (viewRouteHandler.stack) {
    for (const layer of viewRouteHandler.stack) {
      if (layer.route && layer.route.path === '/release-management' && layer.route.methods.get) {
        // Assuming the GET handler is the first one in the stack for this path
        const getHandler = layer.route.stack.find(s => s.method === 'get');
        if (getHandler) {
          releaseManagementHandler = getHandler.handle;
          break;
        }
      }
    }
  }
  
  if (releaseManagementHandler) {
    console.log('Found and delegating to /release-management handler in viewRoutes.js');
    return releaseManagementHandler(req, res, next);
  } else {
    console.error('Could not find /release-management GET handler in viewRoutes.js. Falling back.');
    next(); // Pass to next general handler if specific one not found
  }
});

// Special route handler for release-diary to avoid routing/redirection issues
app.get('/release-diary', async (req, res, next) => {
  console.log('Direct route handler for /release-diary triggered in server.js');
  const viewRouteHandler = require('./routes/viewRoutes');
  const releaseDiaryController = require('./controllers/releaseDiaryController');
  
  // Try to find the release diary route handler in viewRoutes first
  let releaseDiaryHandler = null;
  if (viewRouteHandler.stack) {
    for (const layer of viewRouteHandler.stack) {
      if (layer.route && layer.route.path === '/release-diary' && layer.route.methods.get) {
        const getHandler = layer.route.stack.find(s => s.method === 'get');
        if (getHandler) {
          releaseDiaryHandler = getHandler.handle;
          break;
        }
      }
    }
  }
  
  if (releaseDiaryHandler) {
    console.log('Found and delegating to /release-diary handler in viewRoutes.js');
    return releaseDiaryHandler(req, res, next);
  } else {
    console.log('Could not find /release-diary handler in viewRoutes. Using controller directly.');
    // Use the controller directly as a fallback
    return releaseDiaryController.renderReleaseDiaryPage(req, res, next);
  }
});

// Register API routes first
// Academic Year API routes
app.use('/api/v1/academic-years', wrapRouter('academicYearApi', academicYearRouter));
app.use('/api/v1/release-management', wrapRouter('releaseApi', releaseRoutes));

// Debug routes for testing calendar (no authentication required)
app.use('/debug', debugRoutes);

// Register module-specific routes with prefixes
// BCR Module - preserves all BCR functionality including workflows, urgency levels, and impact areas
app.use('/bcr', wrapRouter('bcr', bcrRouter));

// Reference Data Module
app.use('/reference-data', wrapRouter('reference-data', refDataRouter));

// Dashboard Module
app.use('/dashboard', wrapRouter('dashboard', dashboardRouter));

// Access Module
app.use('/access', wrapRouter('access', accessRouter));

// === Supporting Modules ===
app.use('/funding', wrapRouter('funding', fundingRouter));

// Use the view router for specific frontend pages - mounted at root level
// This should come after module-specific routes but before the home router
app.use('/', wrapRouter('view', viewRoutes));

// Use the home router for the root path (should be last to avoid conflicts)
app.use('/', wrapRouter('home', homeRouter));

// Note: Legacy modules (release-management and monitoring) have been removed as part of modularization

// Legacy redirect for home page
app.get('/home', (req, res) => {
  res.redirect('/');
});

// Debug route to show all registered routes
app.get('/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if(middleware.route) { // routes registered directly on the app
      routes.push({path: middleware.route.path, methods: middleware.route.methods});
    } else if(middleware.name === 'router') { // router middleware
      middleware.handle.stack.forEach(handler => {
        if(handler.route) {
          const path = handler.route.path;
          routes.push({path: path, methods: handler.route.methods});
        }
      });
    }
  });
  res.json(routes);
});

// Academic years route now handled directly by the view router mounted at root

// === Legacy BCR Route Redirects ===
// These redirects ensure backward compatibility with existing URLs
// while migrating to the new modular structure

// Fix for incorrect /bcr/submissions/business-change-requests URL
app.get('/bcr/submissions/business-change-requests', (req, res) => {
  res.redirect('/bcr/business-change-requests' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
});

// Redirect legacy BCR routes to the new modular BCR routes
app.get('/bcr/submit', (req, res) => {
  res.redirect('/bcr/submissions/new');
});

// Redirect malformed BCR URLs with double bcr prefix
app.get('/bcr/bcr-*', (req, res) => {
  const newPath = req.path.replace('/bcr/bcr-', '/bcr/');
  res.redirect(newPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
});

app.get('/bcr/business-change-requests/*', (req, res) => {
  const newPath = req.path.replace('/bcr/business-change-requests/', '/bcr/business-change-requests/');
  res.redirect(newPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
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
app.post('/bcr/phase-status-mapping/create-status/:legacyPhaseId', (req, res) => {
  res.redirect(`/bcr/workflow/phases/${req.params.legacyPhaseId}/statuses/new`);
});

// Redirect legacy BCR phase detail route to the new modular BCR routes
app.get('/bcr/phase-status-mapping/phase/:legacyPhaseId', (req, res) => {
  res.redirect(`/bcr/workflow/phases/${req.params.legacyPhaseId}`);
});

// Redirect legacy BCR edit phase route
app.get('/bcr/phase-status-mapping/edit-phase/:legacyPhaseId', (req, res) => {
  res.redirect(`/bcr/workflow/phases/${req.params.legacyPhaseId}/edit`);
});

// Redirect legacy BCR edit status route to the new modular BCR routes
app.get('/bcr/phase-status-mapping/edit-status/:legacyStatusId', (req, res) => {
  res.redirect(`/bcr/workflow/statuses/${req.params.legacyStatusId}/edit`);
});

// Redirect legacy BCR delete phase route
app.get('/bcr/phase-status-mapping/delete-phase/:legacyPhaseId', (req, res) => {
  res.redirect(`/bcr/workflow/phases/${req.params.legacyPhaseId}/delete`);
});

// Redirect legacy BCR delete status route
app.get('/bcr/phase-status-mapping/delete-status/:legacyStatusId', (req, res) => {
  res.redirect(`/bcr/workflow/statuses/${req.params.legacyStatusId}/delete`);
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
app.get('/bcr/impact-areas/edit/:impactAreaId', (req, res) => {
  res.redirect(`/bcr/impact-areas/${req.params.impactAreaId}/edit`);
});

// Redirect legacy BCR edit impact area POST form to GET (since we can't do POST redirects properly)
app.post('/bcr/impact-areas/edit/:impactAreaId', (req, res) => {
  res.redirect(`/bcr/impact-areas/${req.params.impactAreaId}/edit`);
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
app.post('/bcr/phase-status-mapping/delete-status/:legacyStatusId', (req, res) => {
  res.redirect(`/bcr/workflow/statuses/${req.params.legacyStatusId}/delete`);
});

// Redirect legacy BCR update status POST
app.post('/bcr/update-status/:legacyBcrId', (req, res) => {
  res.redirect(`/bcr/submissions/${req.params.legacyBcrId}/status/update`);
});

// Redirect legacy BCR view route to the new modular BCR route
app.get('/bcr/:legacyBcrId', (req, res) => {
  res.redirect(`/bcr/submissions/${req.params.legacyBcrId}`);
});

// === Error handling ===

// URL sanitizer to prevent malformed URLs from being used in error messages
const sanitizeUrl = (url) => {
  if (!url) return '';
  try {
    // Remove any potentially problematic characters
    return url.replace(/[<>"'`]/g, '');
  } catch (e) {
    return '[Invalid URL]';
  }
};

// 404 handler
app.use((req, res, next) => {
  const sanitizedPath = sanitizeUrl(req.path);
  res.status(404).render('error', {
    title: 'Page not found',
    message: `The requested page '${sanitizedPath}' was not found`,
    error: {
      status: 404,
      stack: process.env.NODE_ENV === 'development' ? `Path: ${sanitizedPath}` : ''
    },
    user: req.user
  });
});

// Error handler
app.use((err, req, res, next) => {
  // Log error details
  console.error('Application error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle path-to-regexp errors specifically
  if (err instanceof TypeError && err.message.includes('path-to-regexp')) {
    const sanitizedPath = sanitizeUrl(req.path);
    err.status = 400;
    err.message = `Invalid route pattern in URL: ${sanitizedPath}`;
  }

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

// Export the Express app
module.exports = app;
