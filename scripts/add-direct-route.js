
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
  '\n\n' + 
  directRoute + 
  serverJs.substring(lastRouteEnd + 3);

// Write the new server.js
const newServerJsPath = path.join(__dirname, 'server.js.new');
fs.writeFileSync(newServerJsPath, newServerJs);

console.log(`New server.js created at: ${newServerJsPath}`);
console.log('To apply the changes, run:');
console.log(`cp ${newServerJsPath} ${serverJsPath}`);
