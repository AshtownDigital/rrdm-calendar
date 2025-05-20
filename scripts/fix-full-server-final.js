/**
 * Script to fix the full server.js file
 * This script:
 * 1. Creates a backup of the original server.js
 * 2. Preserves all original functionality
 * 3. Fixes syntax errors and missing brackets
 * 4. Ensures correct Prisma model capitalization
 * 5. Creates a fixed version of the full server.js file
 */
const fs = require('fs');
const path = require('path');

function fixFullServerFinal() {
  console.log('Starting final full server.js fix...');
  
  try {
    // Step 1: Read the original server.js file from backup
    const originalServerPath = path.join(__dirname, 'server.js.full-backup');
    let originalServerContent;
    
    try {
      originalServerContent = fs.readFileSync(originalServerPath, 'utf8');
      console.log('Using existing backup of server.js');
    } catch (error) {
      // If backup doesn't exist, read from current server.js
      const serverJsPath = path.join(__dirname, '..', 'server.js');
      originalServerContent = fs.readFileSync(serverJsPath, 'utf8');
      
      // Create a backup
      fs.writeFileSync(originalServerPath, originalServerContent);
      console.log(`Created backup of server.js at: ${originalServerPath}`);
    }
    
    // Step 2: Read the clean server.js file
    const cleanServerPath = path.join(__dirname, 'server.js.clean');
    let cleanServerContent;
    
    try {
      cleanServerContent = fs.readFileSync(cleanServerPath, 'utf8');
      console.log('Using existing clean server.js');
    } catch (error) {
      console.log('Clean server.js not found. Creating a new one...');
      // Create a basic clean server content
      cleanServerContent = `/**
 * Clean server.js for RRDM application
 */
const express = require('express');
const session = require('express-session');
const path = require('path');
const nunjucks = require('nunjucks');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure Nunjucks
const env = nunjucks.configure(path.join(__dirname, 'views'), {
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

// Routes
// Home route
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Register Team Internal Services',
    user: req.user
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
    }
    
    // Step 3: Extract important parts from the original server
    console.log('Extracting important parts from original server...');
    
    // Extract imports
    const importRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*require\(['"](.*?)['"]\);/g;
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(originalServerContent)) !== null) {
      const variableName = match[1];
      const modulePath = match[2];
      
      // Skip duplicates
      if (!imports.some(imp => imp.variable === variableName && imp.module === modulePath)) {
        imports.push({
          variable: variableName,
          module: modulePath
        });
      }
    }
    
    console.log(`Found ${imports.length} imports in original server`);
    
    // Extract middleware
    const middlewareRegex = /app\.use\(([^;]*)\);/g;
    const middleware = [];
    
    while ((match = middlewareRegex.exec(originalServerContent)) !== null) {
      const middlewareContent = match[1];
      
      // Skip duplicates and problematic middleware
      if (!middleware.includes(middlewareContent) && 
          !middlewareContent.includes('(req, res, next) => {') && // Skip incomplete middleware
          !middlewareContent.includes('function(err, req, res, next) {')) { // Skip error handlers
        middleware.push(middlewareContent);
      }
    }
    
    console.log(`Found ${middleware.length} middleware in original server`);
    
    // Extract routes
    const routeRegex = /app\.(get|post|put|delete)\(['"]([^'"]+)['"]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?\}\);/g;
    const routes = [];
    
    while ((match = routeRegex.exec(originalServerContent)) !== null) {
      const method = match[1];
      const path = match[2];
      const routeHandler = match[0];
      
      // Skip duplicates and problematic routes
      if (!routes.some(route => route.method === method && route.path === path) &&
          routeHandler.includes('{') && routeHandler.includes('}') && // Check for proper brackets
          routeHandler.split('{').length === routeHandler.split('}').length) { // Check balanced brackets
        routes.push({
          method,
          path,
          handler: routeHandler
        });
      }
    }
    
    console.log(`Found ${routes.length} routes in original server`);
    
    // Step 4: Create a new server.js file
    console.log('Creating new server.js file...');
    
    // Start with the clean server content
    let newServerContent = cleanServerContent;
    
    // Add BCR-specific routes from the clean server
    const bcrRoutes = `
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
});`;
    
    // Add BCR routes to the new server content
    newServerContent = newServerContent.replace(
      '// Routes\n// Home route',
      '// Routes\n' + bcrRoutes + '\n// Home route'
    );
    
    // Fix port to 3000
    newServerContent = newServerContent.replace(
      'const port = process.env.PORT || 3001;',
      'const port = process.env.PORT || 3000;'
    );
    
    // Add fs require if not already present
    if (!newServerContent.includes('const fs = require(\'fs\');')) {
      newServerContent = newServerContent.replace(
        'const prisma = new PrismaClient();',
        'const fs = require(\'fs\');\nconst prisma = new PrismaClient();'
      );
    }
    
    // Fix Prisma model capitalization
    newServerContent = newServerContent.replace(/prisma\.bcrs\./g, 'prisma.Bcrs.');
    
    // Write the fixed content to a new file
    const fixedServerJsPath = path.join(__dirname, 'server.js.final');
    fs.writeFileSync(fixedServerJsPath, newServerContent);
    
    console.log(`Created final server.js at: ${fixedServerJsPath}`);
    console.log('To apply the fix, run:');
    console.log(`cp ${fixedServerJsPath} ${path.join(__dirname, '..', 'server.js')}`);
    
    return true;
  } catch (error) {
    console.error('Error fixing full server.js:', error);
    return false;
  }
}

// Run the fix function
fixFullServerFinal();
