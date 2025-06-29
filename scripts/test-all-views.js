/**
 * Comprehensive View Testing Script
 * Tests all views in all modules to ensure they exist and can be rendered
 */

const path = require('path');
const fs = require('fs');
const nunjucks = require('nunjucks');

// Console colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m'
};

// Configure nunjucks
const viewsPath = path.join(__dirname, '../views');
nunjucks.configure(viewsPath, {
  autoescape: true,
  noCache: true
});

// Function to find all .njk files in a directory recursively
function findNjkFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findNjkFiles(filePath, fileList);
    } else if (file.endsWith('.njk')) {
      // Get the path relative to the views directory
      const relativePath = path.relative(viewsPath, filePath);
      fileList.push(relativePath);
    }
  });
  
  return fileList;
}

// Get all modules
const modulesPath = path.join(viewsPath, 'modules');
const modules = fs.readdirSync(modulesPath).filter(item => {
  const itemPath = path.join(modulesPath, item);
  return fs.statSync(itemPath).isDirectory();
});

// Results object
const results = {
  total: 0,
  exists: 0,
  renderSuccess: 0,
  renderFailed: 0,
  byModule: {}
};

// Mock data for rendering
const mockData = {
  title: 'View Test',
  user: { name: 'Test User', email: 'test@example.com', roles: ['admin'] },
  csrfToken: 'mock-csrf-token',
  flash: { success: [], error: [], info: [] },
  query: {},
  params: { id: '123', submissionId: '456', bcrId: '789' }
};

console.log(`${colors.blue}=== Testing All Views in All Modules ===${colors.reset}`);

// Process each module
modules.forEach(moduleName => {
  const modulePath = path.join(modulesPath, moduleName);
  const moduleViews = findNjkFiles(modulePath);
  
  results.byModule[moduleName] = {
    total: moduleViews.length,
    success: 0,
    failed: 0,
    failedViews: []
  };
  
  results.total += moduleViews.length;
  
  console.log(`\n${colors.blue}=== Module: ${moduleName} (${moduleViews.length} views) ===${colors.reset}`);
  
  // Test each view in the module
  moduleViews.forEach(viewPath => {
    results.exists++;
    
    try {
      const rendered = nunjucks.render(viewPath, mockData);
      if (rendered) {
        results.renderSuccess++;
        results.byModule[moduleName].success++;
        console.log(`${colors.green}✓ ${viewPath}${colors.reset}`);
      }
    } catch (error) {
      results.renderFailed++;
      results.byModule[moduleName].failed++;
      results.byModule[moduleName].failedViews.push({
        path: viewPath,
        error: error.message
      });
      console.log(`${colors.red}✗ ${viewPath}${colors.reset}`);
      console.log(`${colors.red}  Error: ${error.message.split('\n')[0]}${colors.reset}`);
    }
  });
});

// Print summary
console.log(`\n${colors.blue}=== Test Results Summary ===${colors.reset}`);
console.log(`Total views tested: ${results.total}`);
console.log(`${colors.green}Successfully rendered: ${results.renderSuccess}${colors.reset}`);
console.log(`${colors.red}Failed to render: ${results.renderFailed}${colors.reset}`);

// Print module-specific results
console.log(`\n${colors.blue}=== Results by Module ===${colors.reset}`);
Object.keys(results.byModule).sort().forEach(moduleName => {
  const moduleResult = results.byModule[moduleName];
  const successRate = ((moduleResult.success / moduleResult.total) * 100).toFixed(1);
  
  if (moduleResult.failed === 0) {
    console.log(`${colors.green}${moduleName}: ${moduleResult.success}/${moduleResult.total} (${successRate}%)${colors.reset}`);
  } else {
    console.log(`${colors.yellow}${moduleName}: ${moduleResult.success}/${moduleResult.total} (${successRate}%)${colors.reset}`);
    
    // List failed views for this module
    if (moduleResult.failedViews.length > 0) {
      console.log(`${colors.yellow}  Failed views:${colors.reset}`);
      moduleResult.failedViews.forEach(failedView => {
        console.log(`${colors.red}  - ${failedView.path}${colors.reset}`);
      });
    }
  }
});
