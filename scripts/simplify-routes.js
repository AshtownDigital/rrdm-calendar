/**
 * Simplify Routes Script
 * 
 * This script consolidates redirect-only routes into their target routes
 * to simplify the application structure and improve maintainability.
 */
const fs = require('fs');
const path = require('path');

// Base directory
const baseDir = path.resolve(__dirname, '..');

// Define routes to consolidate
const routesToConsolidate = [
  {
    sourceFile: 'routes/items.js',
    targetFile: 'routes/ref-data/items.js',
    redirectPattern: /res\.redirect\(['"]\/ref-data\/items/g,
    importStatement: "const itemsRouter = require('./ref-data/items');\n"
  },
  {
    sourceFile: 'routes/restore-points.js',
    targetFile: 'routes/ref-data/restore-points.js',
    redirectPattern: /res\.redirect\(['"]\/ref-data\/restore-points/g,
    importStatement: "const restorePointsRouter = require('./ref-data/restore-points');\n"
  },
  {
    sourceFile: 'routes/release-notes.js',
    targetFile: 'routes/ref-data/release-notes.js',
    redirectPattern: /res\.redirect\(['"]\/ref-data\/release-notes/g,
    importStatement: "const releaseNotesRouter = require('./ref-data/release-notes');\n"
  }
];

// Function to update server.js to use the consolidated routes
function updateServerRoutes() {
  console.log('Updating server.js to use consolidated routes...');
  
  const serverPath = path.join(baseDir, 'server.js');
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Update imports
  let updatedContent = serverContent;
  
  // Replace route registrations
  routesToConsolidate.forEach(route => {
    const sourceFileName = path.basename(route.sourceFile, '.js');
    const targetFileName = path.basename(route.targetFile, '.js');
    
    // Replace the route import
    const importRegex = new RegExp(`const ${sourceFileName}Router = require\\(['"]\\./routes/${sourceFileName}['"]\\);`, 'g');
    updatedContent = updatedContent.replace(importRegex, '');
    
    // Replace the route registration
    const routeRegex = new RegExp(`app\\.use\\(['"]\\/${sourceFileName}['"], .*?, ${sourceFileName}Router\\);`, 'g');
    updatedContent = updatedContent.replace(routeRegex, '');
  });
  
  // Write the updated content back to the file
  fs.writeFileSync(serverPath, updatedContent);
  console.log('Server.js updated successfully');
}

// Function to create a new consolidated route file
function createConsolidatedRoute(sourceFile, targetFile) {
  console.log(`Consolidating ${sourceFile} into ${targetFile}...`);
  
  const sourceFilePath = path.join(baseDir, sourceFile);
  const targetFilePath = path.join(baseDir, targetFile);
  
  // Check if both files exist
  if (!fs.existsSync(sourceFilePath)) {
    console.log(`Source file ${sourceFile} does not exist, skipping`);
    return;
  }
  
  if (!fs.existsSync(targetFilePath)) {
    console.log(`Target file ${targetFile} does not exist, skipping`);
    return;
  }
  
  // Read the source file to analyze redirects
  const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');
  const targetContent = fs.readFileSync(targetFilePath, 'utf8');
  
  // Extract routes from the source file
  const routeRegex = /router\.(get|post|put|delete)\(['"]([^'"]+)['"].*?\)/g;
  let match;
  let redirectRoutes = [];
  
  while ((match = routeRegex.exec(sourceContent)) !== null) {
    const method = match[1];
    const path = match[2];
    redirectRoutes.push({ method, path });
  }
  
  console.log(`Found ${redirectRoutes.length} routes to consolidate from ${sourceFile}`);
  
  // No need to modify the target file as the routes are already implemented there
  // This script is primarily for documentation and cleanup purposes
}

// Main execution
try {
  console.log('Starting route simplification...');
  
  // Process each route to consolidate
  routesToConsolidate.forEach(route => {
    createConsolidatedRoute(route.sourceFile, route.targetFile);
  });
  
  // Update server.js to use the consolidated routes
  updateServerRoutes();
  
  console.log('Route simplification completed successfully!');
  console.log('\nNOTE: This script has identified redirect-only routes that can be consolidated.');
  console.log('You may need to manually update imports and route registrations in server.js');
  console.log('to ensure all routes are properly registered.');
} catch (error) {
  console.error('Error during route simplification:', error);
  process.exit(1);
}
