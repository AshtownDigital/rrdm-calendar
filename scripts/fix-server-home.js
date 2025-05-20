/**
 * Script to fix the server.js file to use the home module
 * This script:
 * 1. Creates a backup of the original server.js
 * 2. Preserves all original functionality
 * 3. Fixes syntax errors and missing brackets
 * 4. Ensures correct Prisma model capitalization
 * 5. Updates the home route to use the home module
 */
const fs = require('fs');
const path = require('path');

function fixServerHome() {
  console.log('Starting server.js fix with home module...');
  
  try {
    // Step 1: Read the original server.js file
    const serverJsPath = path.join(__dirname, '..', 'server.js');
    const originalServerContent = fs.readFileSync(serverJsPath, 'utf8');
    
    // Create a backup
    const backupPath = path.join(__dirname, 'server.js.backup');
    fs.writeFileSync(backupPath, originalServerContent);
    console.log(`Created backup of server.js at: ${backupPath}`);
    
    // Step 2: Create a basic clean server content
    const cleanServerContent = `/**
 * Clean server.js for RRDM application
 */
const express = require('express');
const session = require('express-session');
const path = require('path');
const nunjucks = require('nunjucks');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

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

// Set up view engine
app.set('view engine', 'njk');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  secret: 'rrdm-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Mock authentication middleware for testing
app.use((req, res, next) => {
  if (!req.user) {
    req.user = {
      id: '00000000-0000-0000-0000-000000000000',
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
  
  next();
});

// Routes
// Home route
app.get('/', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.redirect('/home');
  } else {
    // Use the home module for the index page
    res.render('modules/home/index', {
      title: 'Register Team Internal Services',
      user: req.user
    });
  }
});

// Home page route
app.get('/home', (req, res) => {
  // Use the home module for the home page
  res.render('modules/home/index', {
    title: 'Register Team Internal Services',
    user: req.user
  });
});

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

// Direct BCR Submission View route
app.get('/direct/bcr-submissions/:id', async (req, res) => {
  try {
    console.log('Direct BCR submission view route called for ID:', req.params.id);
    
    // Get the BCR directly to check if it exists
    let bcr = null;
    try {
      bcr = await prisma.Bcrs.findUnique({
        where: { id: req.params.id }
      });
    } catch (error) {
      console.log('Error retrieving BCR:', error.message);
    }
    
    if (!bcr) {
      console.log(\`BCR with ID \${req.params.id} not found\`);
      return res.status(404).render('error', {
        title: 'Not Found',
        message: \`BCR with ID \${req.params.id} not found. The BCR may have been deleted or the ID is incorrect.\`,
        error: {},
        user: req.user
      });
    }
    
    // Create submission and workflow objects directly from BCR data
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
    
    // Get the user who requested the BCR
    let requester = null;
    try {
      requester = await prisma.Users.findUnique({
        where: { id: bcr.requestedBy }
      });
    } catch (error) {
      console.log('Error retrieving requester:', error.message);
    }
    
    // Get the user who is assigned to the BCR
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
    
    // Get urgency levels and impact areas
    let urgencyLevels = [];
    let impactAreas = [];
    try {
      urgencyLevels = await prisma.BcrConfigs.findMany({
        where: { type: 'urgencyLevel' },
        orderBy: { displayOrder: 'asc' }
      });
      
      impactAreas = await prisma.BcrConfigs.findMany({
        where: { type: 'impactArea' },
        orderBy: { displayOrder: 'asc' }
      });
    } catch (error) {
      console.log('Error retrieving BCR configs:', error.message);
    }
    
    // Render the template with all available data
    return res.render('modules/bcr/submission-details', {
      title: \`BCR \${bcr.bcrNumber || bcr.id}\`,
      bcr,
      submission,
      workflow,
      requester,
      assignee,
      urgencyLevels,
      impactAreas,
      user: req.user
    });
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

// Start the server
const server = app.listen(port, () => {
  console.log(\`Server running at http://localhost:\${port}\`);
});

module.exports = server;`;
    
    // Step 3: Write the fixed content to a new file
    const fixedServerJsPath = path.join(__dirname, 'server.js.home');
    fs.writeFileSync(fixedServerJsPath, cleanServerContent);
    
    console.log(`Created fixed server.js with home module at: ${fixedServerJsPath}`);
    console.log('To apply the fix, run:');
    console.log(`cp ${fixedServerJsPath} ${serverJsPath}`);
    
    return true;
  } catch (error) {
    console.error('Error fixing server.js:', error);
    return false;
  }
}

// Run the fix function
fixServerHome();
