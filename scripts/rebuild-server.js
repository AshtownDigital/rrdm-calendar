/**
 * Script to rebuild the server.js file from scratch
 * This approach:
 * 1. Uses the minimal server as a base
 * 2. Extracts important routes and middleware from the original server
 * 3. Creates a new server.js with clean syntax
 */
const fs = require('fs');
const path = require('path');

function rebuildServer() {
  console.log('Starting server.js rebuild...');
  
  try {
    // Step 1: Read the original server.js file
    const originalServerPath = path.join(__dirname, 'server.js.full-backup');
    const originalServerContent = fs.readFileSync(originalServerPath, 'utf8');
    
    // Step 2: Read the minimal server.js file
    const minimalServerPath = path.join(__dirname, 'minimal-server.js');
    const minimalServerContent = fs.readFileSync(minimalServerPath, 'utf8');
    
    // Step 3: Extract important routes from the original server
    console.log('Extracting important routes from original server...');
    
    // Extract route patterns
    const routePatterns = [
      // Match route definitions like app.get('/path', ...)
      /app\.(get|post|put|delete)\(['"]([^'"]+)['"]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?\}\);/g,
      // Match route definitions with named functions
      /app\.(get|post|put|delete)\(['"]([^'"]+)['"]\s*,\s*([a-zA-Z0-9_]+)\);/g
    ];
    
    const extractedRoutes = [];
    
    for (const pattern of routePatterns) {
      const matches = originalServerContent.matchAll(pattern);
      for (const match of matches) {
        const method = match[1];
        const path = match[2];
        const routeHandler = match[0];
        
        // Skip routes we already have in the minimal server
        if (path === '/' || 
            path === '/bcr/submissions' || 
            path === '/direct/bcr-submissions/:id') {
          continue;
        }
        
        extractedRoutes.push({
          method,
          path,
          handler: routeHandler
        });
      }
    }
    
    console.log(`Extracted ${extractedRoutes.length} routes from original server`);
    
    // Step 4: Extract important middleware from the original server
    console.log('Extracting important middleware from original server...');
    
    // Extract middleware patterns
    const middlewarePatterns = [
      // Match app.use statements
      /app\.use\([^;]*\);/g
    ];
    
    const extractedMiddleware = [];
    
    for (const pattern of middlewarePatterns) {
      const matches = originalServerContent.matchAll(pattern);
      for (const match of matches) {
        const middleware = match[0];
        
        // Skip middleware we already have in the minimal server
        if (middleware.includes('express.json') || 
            middleware.includes('express.urlencoded') || 
            middleware.includes('express.static') || 
            middleware.includes('session')) {
          continue;
        }
        
        extractedMiddleware.push(middleware);
      }
    }
    
    console.log(`Extracted ${extractedMiddleware.length} middleware from original server`);
    
    // Step 5: Create a new server.js file
    console.log('Creating new server.js file...');
    
    // Split the minimal server content into sections
    const importEndIndex = minimalServerContent.indexOf('// Middleware');
    const middlewareEndIndex = minimalServerContent.indexOf('// Routes');
    const routesEndIndex = minimalServerContent.indexOf('// Error handler');
    
    if (importEndIndex === -1 || middlewareEndIndex === -1 || routesEndIndex === -1) {
      console.log('Could not identify sections in minimal server. Using it as is.');
      fs.copyFileSync(minimalServerPath, path.join(__dirname, 'server.js.rebuilt'));
    } else {
      // Extract sections
      const importSection = minimalServerContent.substring(0, importEndIndex);
      const middlewareSection = minimalServerContent.substring(importEndIndex, middlewareEndIndex);
      const routesSection = minimalServerContent.substring(middlewareEndIndex, routesEndIndex);
      const errorHandlerSection = minimalServerContent.substring(routesEndIndex);
      
      // Create new content
      let newServerContent = importSection;
      
      // Add extracted middleware
      newServerContent += middlewareSection;
      for (const middleware of extractedMiddleware) {
        newServerContent += '\n' + middleware;
      }
      
      // Add routes section
      newServerContent += routesSection;
      
      // Add extracted routes
      for (const route of extractedRoutes) {
        newServerContent += '\n' + route.handler + '\n';
      }
      
      // Add error handler and server start
      newServerContent += errorHandlerSection;
      
      // Write the new server.js file
      const newServerPath = path.join(__dirname, 'server.js.rebuilt');
      fs.writeFileSync(newServerPath, newServerContent);
      
      console.log(`Created rebuilt server.js at: ${newServerPath}`);
    }
    
    // Step 6: Create a simplified version with just the essential routes
    console.log('Creating simplified server.js...');
    
    const simplifiedServerPath = path.join(__dirname, 'server.js.simplified');
    fs.copyFileSync(minimalServerPath, simplifiedServerPath);
    
    console.log(`Created simplified server.js at: ${simplifiedServerPath}`);
    console.log('To apply the rebuilt server, run:');
    console.log(`cp ${path.join(__dirname, 'server.js.rebuilt')} ${path.join(__dirname, '..', 'server.js')}`);
    console.log('To apply the simplified server, run:');
    console.log(`cp ${simplifiedServerPath} ${path.join(__dirname, '..', 'server.js')}`);
    
    return true;
  } catch (error) {
    console.error('Error rebuilding server.js:', error);
    return false;
  }
}

// Run the rebuild function
rebuildServer();
