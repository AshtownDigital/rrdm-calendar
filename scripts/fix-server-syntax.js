/**
 * Script to fix the syntax error in the server.js file
 */
const fs = require('fs');
const path = require('path');

function fixServerSyntax() {
  console.log('Starting server.js syntax fix...');
  
  try {
    const serverJsPath = path.join(__dirname, '..', 'server.js');
    const serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
    
    // Find the direct BCR submission route
    const routeRegex = /\/\/ Direct access route for viewing individual BCR submissions[\s\S]*?app\.get\('\/direct\/bcr-submissions\/:id'[\s\S]*?\}\);/;
    const routeMatch = serverJsContent.match(routeRegex);
    
    if (routeMatch) {
      console.log('Found direct BCR submission route in server.js');
      
      // Create a completely new route handler
      const newRouteHandler = `
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
});`;
      
      // Replace the old route with the new one
      const fixedServerJsContent = serverJsContent.replace(routeRegex, newRouteHandler);
      
      // Write the fixed content to a new file
      const fixedServerJsPath = path.join(__dirname, 'server.js.fixed');
      fs.writeFileSync(fixedServerJsPath, fixedServerJsContent);
      
      console.log(`Created fixed server.js at: ${fixedServerJsPath}`);
      console.log('To apply the fix, run:');
      console.log(`cp ${fixedServerJsPath} ${serverJsPath}`);
      
      return true;
    } else {
      console.log('Could not find direct BCR submission route in server.js');
      return false;
    }
  } catch (error) {
    console.error('Error fixing server.js syntax:', error);
    return false;
  }
}

// Run the fix function
fixServerSyntax();
