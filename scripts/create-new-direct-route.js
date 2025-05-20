/**
 * Script to create a new direct route handler for BCR submissions
 * This will create a standalone route handler that can be used to test the BCR submission view
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function createDirectRoute() {
  console.log('Creating new direct route handler for BCR submissions...');
  
  try {
    // Create a standalone direct route handler
    const directRouteHandler = `
// Direct access route for viewing individual BCR submissions
app.get('/direct/bcr-submissions/:id', async (req, res) => {
  try {
    console.log('Direct BCR submission view route called for ID:', req.params.id);
    
    // Create a mock user with admin privileges
    req.user = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    };
    
    // Get the BCR directly to check if it exists
    let bcr = null;
    try {
      bcr = await prisma.Bcrs.findUnique({
        where: { id: req.params.id }
      });
    } catch (error) {
      console.log('Error with Bcrs model:', error.message);
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
});`;
    
    // Create a new direct route file
    const directRoutePath = path.join(__dirname, 'direct-route.js');
    fs.writeFileSync(directRoutePath, directRouteHandler);
    console.log(`Direct route handler created at: ${directRoutePath}`);
    
    // Create a script to add the route to server.js
    const addRouteScript = `
/**
 * Script to add the direct route handler to server.js
 */
const fs = require('fs');
const path = require('path');

// Read the server.js file
const serverJsPath = path.join(__dirname, '..', 'server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

// Read the direct route handler
const directRoutePath = path.join(__dirname, 'direct-route.js');
const directRoute = fs.readFileSync(directRoutePath, 'utf8');

// Find the position to insert the direct route
// Look for the last route before the error handler
const lastRoutePos = serverJs.lastIndexOf('app.get(');
if (lastRoutePos === -1) {
  console.error('Could not find a suitable position to insert the direct route');
  process.exit(1);
}

// Find the end of the last route
const lastRouteEnd = serverJs.indexOf('});', lastRoutePos);
if (lastRouteEnd === -1) {
  console.error('Could not find the end of the last route');
  process.exit(1);
}

// Insert the direct route after the last route
const newServerJs = 
  serverJs.substring(0, lastRouteEnd + 3) + 
  '\\n\\n' + 
  directRoute + 
  serverJs.substring(lastRouteEnd + 3);

// Write the new server.js
const newServerJsPath = path.join(__dirname, 'server.js.new');
fs.writeFileSync(newServerJsPath, newServerJs);

console.log(\`New server.js created at: \${newServerJsPath}\`);
console.log('To apply the changes, run:');
console.log(\`cp \${newServerJsPath} \${serverJsPath}\`);
`;
    
    // Create the add route script
    const addRouteScriptPath = path.join(__dirname, 'add-direct-route.js');
    fs.writeFileSync(addRouteScriptPath, addRouteScript);
    console.log(`Add route script created at: ${addRouteScriptPath}`);
    console.log('To add the route to server.js, run:');
    console.log(`node ${addRouteScriptPath}`);
    
    // Create a standalone server for testing
    const standaloneServer = `
/**
 * Standalone server for testing the direct BCR submission route
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const nunjucks = require('nunjucks');

const app = express();
const port = 3001;

// Set up view engine
app.set('view engine', 'njk');
app.set('views', path.join(__dirname, '..', 'views'));

// Configure Nunjucks
const env = nunjucks.configure(path.join(__dirname, '..', 'views'), {
  autoescape: true,
  express: app
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Direct access route for viewing individual BCR submissions
app.get('/direct/bcr-submissions/:id', async (req, res) => {
  try {
    console.log('Direct BCR submission view route called for ID:', req.params.id);
    
    // Create a mock user with admin privileges
    req.user = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    };
    
    // Get the BCR directly to check if it exists
    let bcr = null;
    try {
      bcr = await prisma.Bcrs.findUnique({
        where: { id: req.params.id }
      });
    } catch (error) {
      console.log('Error with Bcrs model:', error.message);
    }
    
    if (!bcr) {
      console.log(\`BCR with ID \${req.params.id} not found\`);
      return res.status(404).send({
        title: 'Not Found',
        message: \`BCR with ID \${req.params.id} not found.\`
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
    res.status(500).send({
      title: 'Error',
      message: 'An unexpected error occurred while trying to view the BCR submission.',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(\`Standalone server running at http://localhost:\${port}\`);
  console.log(\`Test the direct route at: http://localhost:\${port}/direct/bcr-submissions/d2b31bc1-e659-4d01-a09c-ae60a18851ee\`);
});
`;
    
    // Create the standalone server
    const standaloneServerPath = path.join(__dirname, 'standalone-server.js');
    fs.writeFileSync(standaloneServerPath, standaloneServer);
    console.log(`Standalone server created at: ${standaloneServerPath}`);
    console.log('To run the standalone server, run:');
    console.log(`node ${standaloneServerPath}`);
    
    return true;
  } catch (error) {
    console.error('Error creating direct route:', error);
    return false;
  }
}

// Run the function
createDirectRoute()
  .then((success) => {
    if (success) {
      console.log('\nAll files created successfully.');
    } else {
      console.error('\nFailed to create files.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
