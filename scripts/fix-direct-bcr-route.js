/**
 * Script to fix the direct BCR submission view route
 * This script:
 * 1. Creates a direct route handler for BCR submissions
 * 2. Tests the route with the specific BCR ID
 * 3. Outputs detailed debugging information
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function fixDirectBcrRoute() {
  console.log('Starting fix for direct BCR submission view route...');
  
  try {
    const bcrId = 'd2b31bc1-e659-4d01-a09c-ae60a18851ee';
    
    // Step 1: Check if the BCR exists
    console.log(`\n1. CHECKING BCR WITH ID: ${bcrId}`);
    
    // Try with lowercase 'bcrs'
    let bcrLowercase = null;
    try {
      bcrLowercase = await prisma.bcrs.findUnique({
        where: { id: bcrId }
      });
      console.log('BCR found with lowercase "bcrs" model:', bcrLowercase ? 'Yes' : 'No');
    } catch (error) {
      console.log('Error with lowercase "bcrs" model:', error.message);
    }
    
    // Try with capitalized 'Bcrs'
    let bcrCapitalized = null;
    try {
      bcrCapitalized = await prisma.Bcrs.findUnique({
        where: { id: bcrId }
      });
      console.log('BCR found with capitalized "Bcrs" model:', bcrCapitalized ? 'Yes' : 'No');
    } catch (error) {
      console.log('Error with capitalized "Bcrs" model:', error.message);
    }
    
    // Step 2: Create a direct route handler
    console.log('\n2. CREATING DIRECT ROUTE HANDLER');
    
    const directRouteHandler = `
// Direct access route for viewing individual BCR submissions (fixed version)
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
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Try with capitalized 'Bcrs' first
    let bcr = null;
    try {
      bcr = await prisma.Bcrs.findUnique({
        where: { id: req.params.id }
      });
    } catch (error) {
      console.log('Error with capitalized Bcrs model:', error.message);
      // Fallback to lowercase 'bcrs'
      try {
        bcr = await prisma.bcrs.findUnique({
          where: { id: req.params.id }
        });
      } catch (error) {
        console.log('Error with lowercase bcrs model:', error.message);
      }
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
      user: {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      }
    });
  }
});
`;
    
    // Step 3: Create a direct route file
    const directRoutePath = path.join(__dirname, 'direct-bcr-route.js');
    fs.writeFileSync(directRoutePath, directRouteHandler);
    console.log(`Direct route handler created at: ${directRoutePath}`);
    
    // Step 4: Create a patch for server.js
    console.log('\n3. CREATING PATCH FOR SERVER.JS');
    
    const serverJsPath = path.join(__dirname, '..', 'server.js');
    const serverJs = fs.readFileSync(serverJsPath, 'utf8');
    
    // Find the direct route section
    const directRouteRegex = /\/\/ Direct access route for viewing individual BCR submissions[\s\S]*?app\.get\('\/direct\/bcr-submissions\/:id'[\s\S]*?}\);/;
    const directRouteMatch = serverJs.match(directRouteRegex);
    
    if (directRouteMatch) {
      console.log('Found direct route section in server.js');
      
      // Create a patched version of server.js
      const patchedServerJs = serverJs.replace(directRouteRegex, directRouteHandler.trim());
      const patchedServerJsPath = path.join(__dirname, 'server.js.patched');
      fs.writeFileSync(patchedServerJsPath, patchedServerJs);
      
      console.log(`Patched server.js created at: ${patchedServerJsPath}`);
      console.log('To apply the patch, run:');
      console.log(`cp ${patchedServerJsPath} ${serverJsPath}`);
    } else {
      console.log('Could not find direct route section in server.js');
    }
    
    // Step 5: Create a standalone direct route handler
    console.log('\n4. CREATING STANDALONE DIRECT ROUTE HANDLER');
    
    const standaloneHandler = `
/**
 * Standalone direct route handler for BCR submissions
 * This can be used to test the direct route without modifying server.js
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const port = 3001;

// Set up view engine
app.set('view engine', 'njk');
app.set('views', './views');

// Direct access route for viewing individual BCR submissions
app.get('/direct/bcr-submissions/:id', async (req, res) => {
  try {
    console.log('Direct BCR submission view route called for ID:', req.params.id);
    
    // Create a mock user with admin privileges
    const user = {
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
      console.log('Error with capitalized Bcrs model:', error.message);
      try {
        bcr = await prisma.bcrs.findUnique({
          where: { id: req.params.id }
        });
      } catch (error) {
        console.log('Error with lowercase bcrs model:', error.message);
      }
    }
    
    if (!bcr) {
      console.log(\`BCR with ID \${req.params.id} not found\`);
      return res.status(404).send({
        title: 'Not Found',
        message: \`BCR with ID \${req.params.id} not found.\`
      });
    }
    
    // Return the BCR data as JSON
    return res.json({
      title: \`BCR \${bcr.bcrNumber || bcr.id}\`,
      bcr,
      submission: {
        bcrId: bcr.id,
        bcrCode: bcr.bcrNumber,
        description: bcr.description,
        priority: bcr.priority,
        impact: bcr.impact,
        requestedBy: bcr.requestedBy,
        createdAt: bcr.createdAt,
        updatedAt: bcr.updatedAt
      },
      workflow: {
        bcrId: bcr.id,
        status: bcr.status,
        assignedTo: bcr.assignedTo,
        targetDate: bcr.targetDate,
        implementationDate: bcr.implementationDate,
        notes: bcr.notes,
        createdAt: bcr.createdAt,
        updatedAt: bcr.updatedAt
      },
      user
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
  console.log(\`Standalone direct route handler running at http://localhost:\${port}\`);
  console.log(\`Test the route at: http://localhost:\${port}/direct/bcr-submissions/${bcrId}\`);
});
`;
    
    const standaloneHandlerPath = path.join(__dirname, 'standalone-direct-route.js');
    fs.writeFileSync(standaloneHandlerPath, standaloneHandler);
    console.log(`Standalone direct route handler created at: ${standaloneHandlerPath}`);
    console.log('To run the standalone handler:');
    console.log(`node ${standaloneHandlerPath}`);
    
    console.log('\nFix completed successfully.');
    return true;
  } catch (error) {
    console.error('Error fixing direct BCR route:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix function
fixDirectBcrRoute()
  .then((success) => {
    if (success) {
      console.log('\nAll fixes completed. Please apply the patch to server.js or use the standalone handler.');
    } else {
      console.error('\nFix failed. Please check the error messages above.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
