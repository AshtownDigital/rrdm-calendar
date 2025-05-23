/**
 * Clean server.js for RRDM application
 * Updated to use MongoDB instead of Prisma
 */
const express = require('express');
const session = require('express-session');
const path = require('path');
const nunjucks = require('nunjucks');
const fs = require('fs');

// Connect to MongoDB
const { connect, db } = require('./config/database.mongo');

// Initialize MongoDB connection
connect().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});

// Create Express app
const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Configure Nunjucks
const env = nunjucks.configure([
  path.join(__dirname, 'views'),
  path.join(__dirname, 'views/modules'),
  path.join(__dirname, 'views/layouts'),
  path.join(__dirname, 'views/partials')
], {
  autoescape: true,
  express: app
});

// Add custom filters to Nunjucks
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

// UK Date format filter (DD/MM/YYYY)
env.addFilter('ukDate', function(date) {
  if (!date) return '';
  
  // Convert string to Date object if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Format as DD/MM/YYYY
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
});

// UK Date with day name format filter (Monday, 12 May 2025)
env.addFilter('ukDateWithDay', function(date) {
  if (!date) return '';
  
  // Convert string to Date object if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Day names
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Month names
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Format as Monday, 12 May 2025
  const dayName = dayNames[dateObj.getDay()];
  const day = dateObj.getDate();
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  
  return `${dayName}, ${day} ${month} ${year}`;
});

// Map filter for arrays
env.addFilter('map', function(arr, property) {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(item => item[property]);
});

// Set up view engine
app.set('view engine', 'njk');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Create virtual path prefixes for assets with explicit mappings
app.use('/assets', express.static(path.join(__dirname, 'public')));
app.use('/assets/css', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/assets/images', express.static(path.join(__dirname, 'public/images')));

// Ensure direct access to stylesheets works too (for compatibility)
app.use('/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));

// Add a special handler for GOV.UK Frontend assets
app.use('/assets/govuk-frontend', express.static(path.join(__dirname, 'node_modules/govuk-frontend/govuk')));

// Session middleware
app.use(session({
  secret: 'rrdm-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Cookie parser middleware - required for cookie-based CSRF protection
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// MongoDB connection status middleware
app.use((req, res, next) => {
  // Add MongoDB connection status to response locals
  res.locals.mongoConnected = db.readyState === 1;
  next();
});

// CSRF Protection Middleware
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

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
  
  // Add CSRF token to all responses
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  
  next();
});

// Import route modules
const refDataRouter = require('./routes/ref-data');
const fundingRouter = require('./routes/funding');
const releaseManagementRouter = require('./routes/release-management');
const accessRouter = require('./routes/access');
const monitoringRouter = require('./routes/monitoring');

// BCR module routes
const bcrRouter = require('./routes/bcr/routes');
const bcrSubmissionRouter = require('./routes/bcr-submission/routes');
const impactedAreasRouter = require('./routes/impacted-areas/routes');

// Routes
// Home route
app.get('/', (req, res) => {
  // Use the home.njk template directly as the index page
  res.render('modules/home/home', {
    title: 'Register Team Internal Services',
    user: req.user
  });
});

// Home page route
app.get('/home', (req, res) => {
  // Use the home.njk template for the home page
  res.render('modules/home/home', {
    title: 'Register Team Internal Services',
    user: req.user
  });
});

// Mount BCR module routes
app.use('/bcr', bcrRouter);
app.use('/bcr-submission', bcrSubmissionRouter);
app.use('/impacted-areas', impactedAreasRouter);

// Register all module routes
app.use('/ref-data', refDataRouter);
app.use('/funding', fundingRouter);
app.use('/release-management', releaseManagementRouter);
app.use('/access', accessRouter);
app.use('/monitoring', monitoringRouter);

// BCR Submissions route
app.get('/bcr/submissions', async (req, res) => {
  try {
    console.log('BCR Submissions route called');
    
    // Get BCR submissions controller
    const submissionsController = require('./controllers/bcr/submissionsController');
    
    // Call the controller's listSubmissions function
    return await submissionsController.listSubmissions(req, res);
  } catch (error) {
    console.error('Error in BCR submissions route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to list BCR submissions.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// BCR routes that must come before the generic /:id route
// BCR Submit Form route
app.get('/bcr/submit', async (req, res) => {
  try {
    console.log('BCR Submit Form route called');
    const formController = require('./controllers/bcr/formController');
    await formController.showSubmitForm(req, res);
  } catch (error) {
    console.error('Error in BCR Submit Form route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to load the BCR submission form.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// BCR Phase-Status Mapping route
app.get('/bcr/phase-status-mapping', async (req, res) => {
  try {
    console.log('BCR Phase-Status Mapping route called');
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.listPhaseStatusMappings(req, res);
  } catch (error) {
    console.error('Error in BCR Phase-Status Mapping route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to load the phase-status mapping page.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// BCR Phase-Status Mapping sub-routes
// Create phase
app.get('/bcr/phase-status-mapping/create-phase', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showCreatePhaseForm(req, res);
  } catch (error) {
    console.error('Error in BCR create phase route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Create status
app.get('/bcr/phase-status-mapping/create-status', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showCreateStatusForm(req, res);
  } catch (error) {
    console.error('Error in BCR create status route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Phase detail view
app.get('/bcr/phase-status-mapping/phase/:id', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showPhaseDetail(req, res);
  } catch (error) {
    console.error('Error in BCR phase detail route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Edit phase
app.get('/bcr/phase-status-mapping/edit-phase/:id', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showEditPhaseForm(req, res);
  } catch (error) {
    console.error('Error in BCR edit phase route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Edit status
app.get('/bcr/phase-status-mapping/edit-status/:id', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showEditStatusForm(req, res);
  } catch (error) {
    console.error('Error in BCR edit status route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Delete phase warning
app.get('/bcr/phase-status-mapping/delete-phase/:id', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showDeletePhaseWarning(req, res);
  } catch (error) {
    console.error('Error in BCR delete phase route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Delete status warning
app.get('/bcr/phase-status-mapping/delete-status/:id', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showDeleteStatusWarning(req, res);
  } catch (error) {
    console.error('Error in BCR delete status route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Confirmation pages
app.get('/bcr/phase-status-mapping/create-phase-confirmation', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showCreatePhaseConfirmation(req, res);
  } catch (error) {
    console.error('Error in BCR create phase confirmation route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

app.get('/bcr/phase-status-mapping/create-status-confirmation', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showCreateStatusConfirmation(req, res);
  } catch (error) {
    console.error('Error in BCR create status confirmation route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

app.get('/bcr/phase-status-mapping/edit-phase-confirmation', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showEditPhaseConfirmation(req, res);
  } catch (error) {
    console.error('Error in BCR edit phase confirmation route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

app.get('/bcr/phase-status-mapping/edit-status-confirmation', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showEditStatusConfirmation(req, res);
  } catch (error) {
    console.error('Error in BCR edit status confirmation route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

app.get('/bcr/phase-status-mapping/delete-phase-confirmation', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showDeletePhaseConfirmation(req, res);
  } catch (error) {
    console.error('Error in BCR delete phase confirmation route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

app.get('/bcr/phase-status-mapping/delete-status-confirmation', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.showDeleteStatusConfirmation(req, res);
  } catch (error) {
    console.error('Error in BCR delete status confirmation route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// BCR workflow route
app.get('/bcr/workflow', async (req, res) => {
  try {
    const workflowController = require('./controllers/bcr/workflowController');
    await workflowController.showWorkflow(req, res);
  } catch (error) {
    console.error('Error in BCR workflow route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// BCR submissions list
app.get('/bcr/submissions', async (req, res) => {
  try {
    const submissionsController = require('./controllers/bcr/submissionsController');
    await submissionsController.listSubmissions(req, res);
  } catch (error) {
    console.error('Error in BCR submissions list route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// BCR Impact Areas routes
// List impact areas
app.get('/bcr/impact-areas', async (req, res) => {
  try {
    const impactAreaController = require('./controllers/bcr/impactAreaController');
    await impactAreaController.listImpactAreas(req, res);
  } catch (error) {
    console.error('Error in BCR impact areas list route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Create impact area form
app.get('/bcr/impact-areas/create', async (req, res) => {
  try {
    const impactAreaController = require('./controllers/bcr/impactAreaController');
    await impactAreaController.showCreateForm(req, res);
  } catch (error) {
    console.error('Error in BCR create impact area route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Process create impact area form
app.post('/bcr/impact-areas/create', async (req, res) => {
  try {
    const impactAreaController = require('./controllers/bcr/impactAreaController');
    await impactAreaController.createImpactArea(req, res);
  } catch (error) {
    console.error('Error in BCR create impact area POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Create impact area confirmation
app.get('/bcr/impact-areas/create-confirmation', async (req, res) => {
  try {
    const impactAreaController = require('./controllers/bcr/impactAreaController');
    await impactAreaController.showCreateConfirmation(req, res);
  } catch (error) {
    console.error('Error in BCR create impact area confirmation route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Edit impact area form
app.get('/bcr/impact-areas/edit/:id', async (req, res) => {
  try {
    const impactAreaController = require('./controllers/bcr/impactAreaController');
    await impactAreaController.showEditForm(req, res);
  } catch (error) {
    console.error('Error in BCR edit impact area route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Process edit impact area form
app.post('/bcr/impact-areas/edit/:id', async (req, res) => {
  try {
    const impactAreaController = require('./controllers/bcr/impactAreaController');
    await impactAreaController.updateImpactArea(req, res);
  } catch (error) {
    console.error('Error in BCR edit impact area POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Edit impact area confirmation
app.get('/bcr/impact-areas/edit-confirmation', async (req, res) => {
  try {
    const impactAreaController = require('./controllers/bcr/impactAreaController');
    await impactAreaController.showEditConfirmation(req, res);
  } catch (error) {
    console.error('Error in BCR edit impact area confirmation route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Delete impact area warning
app.get('/bcr/impact-areas/delete/:id', async (req, res) => {
  try {
    const impactAreaController = require('./controllers/bcr/impactAreaController');
    await impactAreaController.showDeleteWarning(req, res);
  } catch (error) {
    console.error('Error in BCR delete impact area route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Process delete impact area
app.post('/bcr/impact-areas/delete/:id', async (req, res) => {
  try {
    const impactAreaController = require('./controllers/bcr/impactAreaController');
    await impactAreaController.deleteImpactArea(req, res);
  } catch (error) {
    console.error('Error in BCR delete impact area POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Delete impact area confirmation
app.get('/bcr/impact-areas/delete-confirmation', async (req, res) => {
  try {
    const impactAreaController = require('./controllers/bcr/impactAreaController');
    await impactAreaController.showDeleteConfirmation(req, res);
  } catch (error) {
    console.error('Error in BCR delete impact area confirmation route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// POST routes for form submissions
// Submit form
app.post('/bcr/submit', async (req, res) => {
  try {
    const formController = require('./controllers/bcr/formController');
    await formController.processSubmission(req, res);
  } catch (error) {
    console.error('Error in BCR submit form POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while processing your submission.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Create phase
app.post('/bcr/phase-status-mapping/create-phase', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.createPhase(req, res);
  } catch (error) {
    console.error('Error in BCR create phase POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Create status
app.post('/bcr/phase-status-mapping/create-status', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.createStatus(req, res);
  } catch (error) {
    console.error('Error in BCR create status POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Edit phase
app.post('/bcr/phase-status-mapping/edit-phase/:id', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.updatePhase(req, res);
  } catch (error) {
    console.error('Error in BCR edit phase POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Edit status
app.post('/bcr/phase-status-mapping/edit-status/:id', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.updateStatus(req, res);
  } catch (error) {
    console.error('Error in BCR edit status POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Delete phase
app.post('/bcr/phase-status-mapping/delete-phase/:id', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.deletePhase(req, res);
  } catch (error) {
    console.error('Error in BCR delete phase POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Delete status
app.post('/bcr/phase-status-mapping/delete-status/:id', async (req, res) => {
  try {
    const phaseStatusController = require('./controllers/bcr/phaseStatusController');
    await phaseStatusController.deleteStatus(req, res);
  } catch (error) {
    console.error('Error in BCR delete status POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Update BCR status
app.post('/bcr/update-status/:id', async (req, res) => {
  try {
    const statusController = require('./controllers/bcr/statusController');
    await statusController.updateStatus(req, res);
  } catch (error) {
    console.error('Error in BCR update status POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Update workflow
app.post('/bcr/workflow', async (req, res) => {
  try {
    const workflowController = require('./controllers/bcr/workflowController');
    await workflowController.updateWorkflow(req, res);
  } catch (error) {
    console.error('Error in BCR workflow POST route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Direct BCR Submission View route
// Canonical BCR view route (loads the same as direct BCR submission details)
app.get('/bcr/:id', async (req, res) => {
  // Reuse the same logic as /direct/bcr-submissions/:id
  try {
    console.log('Canonical BCR view route called for ID:', req.params.id);
    let bcr = null;
    try {
      bcr = await prisma.Bcrs.findUnique({
        where: { id: req.params.id }
      });
    } catch (error) {
      console.log('Error retrieving BCR:', error.message);
    }
    if (!bcr) {
      console.log(`BCR with ID ${req.params.id} not found`);
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${req.params.id} not found. The BCR may have been deleted or the ID is incorrect.`,
        error: {},
        user: req.user
      });
    }
    const submission = {
      bcrId: bcr.id,
      bcrCode: bcr.bcrNumber,
      description: bcr.description,
      priority: bcr.priority,
      impact: bcr.impact,
      requestedBy: bcr.requestedBy,
      createdAt: bcr.createdAt,
      updatedAt: bcr.updatedAt
    };
    const workflow = {
      bcrId: bcr.id,
      status: bcr.status,
      assignedTo: bcr.assignedTo,
      targetDate: bcr.targetDate,
      implementationDate: bcr.implementationDate,
      notes: bcr.notes,
      createdAt: bcr.createdAt,
      updatedAt: bcr.updatedAt
    };
    let requester = null;
    try {
      requester = await prisma.Users.findUnique({
        where: { id: bcr.requestedBy }
      });
    } catch (error) {
      console.log('Error retrieving requester:', error.message);
    }
    let assignee = null;
    if (bcr.assignedTo) {
      try {
        assignee = await prisma.Users.findUnique({
          where: { id: bcr.assignedTo }
        });
      } catch (error) {
        console.log('Error retrieving assignee:', error.message);
      }
    }
    let urgencyLevels = [];
    let impactAreas = [];
    let phases = [];
    try {
      urgencyLevels = await prisma.BcrConfigs.findMany({
        where: { type: 'urgencyLevel' },
        orderBy: { displayOrder: 'asc' }
      });
      impactAreas = await prisma.BcrConfigs.findMany({
        where: { type: 'impactArea' },
        orderBy: { displayOrder: 'asc' }
      });
      phases = await prisma.BcrConfigs.findMany({
        where: { type: 'phase' },
        orderBy: { displayOrder: 'asc' }
      });
    } catch (error) {
      console.log('Error retrieving BCR configs:', error.message);
    }
    // Aggregate all submission-related dates
    let submissionDates = [];
    if (bcr.createdAt) {
      submissionDates.push(bcr.createdAt);
    }
    if (submission.createdAt && submission.createdAt !== bcr.createdAt) {
      submissionDates.push(submission.createdAt);
    }
    const histories = [];
    if (bcr.history && Array.isArray(bcr.history)) histories.push(...bcr.history);
    if (submission.history && Array.isArray(submission.history)) histories.push(...submission.history);
    if (bcr.workflowHistory && Array.isArray(bcr.workflowHistory)) histories.push(...bcr.workflowHistory);
    if (submission.workflowHistory && Array.isArray(submission.workflowHistory)) histories.push(...submission.workflowHistory);
    histories.forEach(item => {
      if (item.action && item.action.toLowerCase().includes('submit') && item.date) {
        submissionDates.push(item.date);
      }
    });
    submissionDates = [...new Set(submissionDates.map(d => new Date(d).toISOString()))].sort();
    return res.render('modules/bcr/bcr-details.njk', {
      title: `BCR ${bcr.bcrNumber || bcr.id}`,
      bcr,
      submission,
      workflow,
      requester,
      assignee,
      urgencyLevels,
      impactAreas,
      phases,
      submissionDates,
      user: req.user
    });
  } catch (error) {
    console.error('Error in canonical BCR view route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to view the BCR.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

app.get('/direct/bcr-submissions/:id', async (req, res) => {
  try {
    console.log('Direct BCR submission view route called for ID:', req.params.id);
    
    // Use the dedicated controller for BCR submission details
    const submissionDetailsController = require('./controllers/bcr/submissionDetailsController');
    await submissionDetailsController.showSubmissionDetails(req, res);
  } catch (error) {
    console.error('Error in direct BCR submission view route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to view the BCR submission.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Direct BCR submissions list route
app.get('/direct/bcr-submissions', async (req, res) => {
  try {
    console.log('Direct BCR submissions list route called');
    
    // Call the submissions controller
    const submissionsController = require('./controllers/bcr/submissionsController');
    await submissionsController.listSubmissions(req, res);
  } catch (error) {
    console.error('Error in direct BCR submissions list route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to list BCR submissions.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Direct BCR edit route
app.get('/direct/bcr-edit/:id', async (req, res) => {
  try {
    console.log('Direct BCR edit route called for ID:', req.params.id);
    
    // Call the form controller
    const formController = require('./controllers/bcr/formController');
    await formController.showEditForm(req, res);
  } catch (error) {
    console.error('Error in direct BCR edit route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to edit the BCR.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// BCR edit submission form processing
app.post('/bcr/edit/:id', async (req, res) => {
  try {
    console.log('BCR edit submission route called for ID:', req.params.id);
    
    // Call the form controller
    const formController = require('./controllers/bcr/formController');
    await formController.processEditSubmission(req, res);
  } catch (error) {
    console.error('Error in BCR edit submission route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to process the BCR edit.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// BCR delete confirmation page
app.get('/bcr/submissions/:id/delete-confirmation', async (req, res) => {
  try {
    console.log('BCR delete confirmation route called for ID:', req.params.id);
    
    // Call the form controller
    const formController = require('./controllers/bcr/formController');
    await formController.showDeleteConfirmation(req, res);
  } catch (error) {
    console.error('Error in BCR delete confirmation route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to load the BCR delete confirmation page.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// BCR delete processing
app.post('/bcr/submissions/:id/delete', async (req, res) => {
  try {
    console.log('BCR delete route called for ID:', req.params.id);
    
    // Call the form controller
    const formController = require('./controllers/bcr/formController');
    await formController.deleteBcr(req, res);
  } catch (error) {
    console.error('Error in BCR delete route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to delete the BCR.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  const currentYear = new Date().getFullYear();
  res.render('modules/dashboard/index', {
    serviceName: 'Reference Data Management',
    selectedYear: currentYear,
    latestYear: currentYear,
    latestVersion: '1.0',
    user: req.user
  });
});

// Serve stylesheets
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

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).render('error', {
    title: 'Error',
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {},
    user: req.user
  });
});

// BCR Submission Routes
app.get('/bcr-submission/new', async (req, res) => {
  try {
    const submissionController = require('./controllers/bcr/submissionController');
    await submissionController.newSubmission(req, res);
  } catch (error) {
    console.error('Error in new BCR submission route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to access the new BCR submission form.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});



// Legacy routes for backward compatibility
app.post('/direct/bcr-submissions/:id/update', async (req, res) => {
  try {
    console.log('Legacy update BCR submission status route called for ID:', req.params.id);
    res.redirect(`/bcr/${req.params.id}/update`);
  } catch (error) {
    console.error('Error in legacy update BCR submission status route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to update the BCR submission status.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Check if we're in a serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Only start the server if not in a serverless environment
let server;
if (!isServerless) {
  // For local development, try the specified port first
  server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // If port is in use, try a different port
      const alternatePort = parseInt(port) + 1000;
      console.log(`Port ${port} is in use, trying port ${alternatePort}...`);
      server = app.listen(alternatePort, () => {
        console.log(`Server running at http://localhost:${alternatePort}`);
      });
    } else {
      console.error('Server error:', err);
    }
  });
} else {
  console.log('Running in serverless mode - no HTTP server started');
}

// For Vercel serverless functions, we need to export a handler function
if (isServerless) {
  // Export a request handler function for serverless environments
  module.exports = (req, res) => {
    // Vercel serverless function handler
    return app(req, res);
  };
} else {
  // Export the Express app for standard environments
  module.exports = app;
}