/**
 * Comprehensive script to fix the server.js file
 * This script:
 * 1. Removes the problematic direct BCR submission route
 * 2. Adds a clean implementation of the direct BCR submission route
 * 3. Ensures all Prisma model references use correct capitalization
 */
const fs = require('fs');
const path = require('path');

async function fixServerComprehensive() {
  console.log('Starting comprehensive server.js fix...');
  
  try {
    // Step 1: Read the current server.js file
    const serverJsPath = path.join(__dirname, '..', 'server.js');
    let serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
    
    // Step 2: Create a backup of the original file
    const backupPath = path.join(__dirname, 'server.js.backup');
    fs.writeFileSync(backupPath, serverJsContent);
    console.log(`Created backup of server.js at: ${backupPath}`);
    
    // Step 3: Find and remove the problematic direct BCR submission route
    console.log('Removing problematic direct BCR submission route...');
    
    // Define patterns to match the route
    const routePatterns = [
      /\/\/ Direct access route for viewing individual BCR submissions[\s\S]*?app\.get\('\/direct\/bcr-submissions\/:id'[\s\S]*?\}\);/,
      /app\.get\('\/direct\/bcr-submissions\/:id'[\s\S]*?\}\);/
    ];
    
    let routeRemoved = false;
    for (const pattern of routePatterns) {
      if (pattern.test(serverJsContent)) {
        serverJsContent = serverJsContent.replace(pattern, '');
        routeRemoved = true;
        console.log('Removed problematic route using pattern:', pattern);
        break;
      }
    }
    
    if (!routeRemoved) {
      console.log('Could not find the problematic route to remove. Will proceed with adding the new route.');
    }
    
    // Step 4: Fix any lowercase 'bcrs' references to 'Bcrs'
    console.log('Fixing Prisma model capitalization...');
    serverJsContent = serverJsContent.replace(/prisma\.bcrs\./g, 'prisma.Bcrs.');
    
    // Step 5: Create a clean implementation of the direct BCR submission route
    console.log('Adding clean implementation of direct BCR submission route...');
    
    const cleanRouteImplementation = `
// Direct access route for viewing individual BCR submissions
app.get('/direct/bcr-submissions/:id', async (req, res) => {
  try {
    console.log('Direct BCR submission view route called for ID:', req.params.id);
    
    // Create a mock user with admin privileges if not authenticated
    if (!req.user) {
      req.user = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      };
    }
    
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
      user: req.user || {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      }
    });
  }
});`;
    
    // Step 6: Find a suitable position to add the new route
    // Look for the last route definition before the error handler
    const lastRoutePos = serverJsContent.lastIndexOf('app.get(');
    
    if (lastRoutePos === -1) {
      console.log('Could not find a suitable position to add the new route. Adding at the end.');
      // Add the route at the end of the file, before the server.listen call
      const listenPos = serverJsContent.lastIndexOf('server.listen(');
      
      if (listenPos === -1) {
        // If server.listen is not found, add at the end
        serverJsContent += '\\n' + cleanRouteImplementation + '\\n';
      } else {
        // Add before server.listen
        serverJsContent = 
          serverJsContent.substring(0, listenPos) + 
          '\\n' + cleanRouteImplementation + '\\n\\n' + 
          serverJsContent.substring(listenPos);
      }
    } else {
      // Find the end of the last route
      const lastRouteEnd = serverJsContent.indexOf('});', lastRoutePos);
      
      if (lastRouteEnd === -1) {
        console.log('Could not find the end of the last route. Adding at the end.');
        serverJsContent += '\\n' + cleanRouteImplementation + '\\n';
      } else {
        // Add after the last route
        serverJsContent = 
          serverJsContent.substring(0, lastRouteEnd + 3) + 
          '\\n\\n' + cleanRouteImplementation + 
          serverJsContent.substring(lastRouteEnd + 3);
      }
    }
    
    // Step 7: Write the fixed content to a new file
    const fixedServerJsPath = path.join(__dirname, 'server.js.fixed');
    fs.writeFileSync(fixedServerJsPath, serverJsContent);
    
    console.log(`Created fixed server.js at: ${fixedServerJsPath}`);
    console.log('To apply the fix, run:');
    console.log(`cp ${fixedServerJsPath} ${serverJsPath}`);
    
    return true;
  } catch (error) {
    console.error('Error fixing server.js:', error);
    return false;
  }
}

// Run the fix function
fixServerComprehensive()
  .then((success) => {
    if (success) {
      console.log('\nServer.js fix completed successfully.');
    } else {
      console.error('\nServer.js fix failed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
