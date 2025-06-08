/**
 * View Testing Script
 * Tests if views exist and can be rendered
 */

const path = require('path');
const fs = require('fs');
const nunjucks = require('nunjucks');

// Console colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m'
};

// Configure nunjucks
const viewsPath = path.join(__dirname, '../views');
const env = nunjucks.configure(viewsPath, {
  autoescape: true,
  noCache: true
});

// List of entry point views to test
const viewsToTest = [
  // BCR Module
  'modules/bcr/dashboard/index.njk',
  'modules/bcr/submissions/index.njk',
  'modules/bcr/bcrs/index.njk',
  'modules/bcr/workflow/index.njk',
  'modules/bcr/prioritisation/index.njk',
  'modules/bcr/impact-areas/index.njk',
  'modules/bcr/phase-status-mapping/index.njk',
  'modules/bcr/status/index.njk',
  
  // Dashboard Module
  'modules/dashboard/index.njk',
  'modules/dashboard/dashboard.njk',
  
  // Home Module
  'modules/home/index.njk',
  // 'modules/home/home.njk', // Removed - using index.njk instead
  'modules/home/home-page.njk',
  
  // Release Management Module
  'modules/release-management/dashboard.njk',
  
  // Release Notes Module
  'modules/release-notes/index.njk',
  
  // Access Module
  'modules/access/manage.njk',
  'modules/access/login.njk',
  'modules/access/admin-login.njk',
  
  // Ref Data Module
  'modules/ref-data/dashboard/index.njk',
  'modules/ref-data/dfe-data/index.njk',
  'modules/ref-data/values/index.njk',
  'modules/ref-data/release-notes/navigation-tabs/index.njk',
  
  // Funding Module
  'modules/funding/index.njk',
  'modules/funding/requirements.njk',
  'modules/funding/history.njk',
  'modules/funding/reports.njk',
  
  // API Module
  'modules/api/documentation.njk',
  
  // Monitoring Module
  'modules/monitoring/performance.njk',
  
  // Restore Points Module
  'modules/restore-points/restore-points.njk'
];

// Test results
const results = {
  total: viewsToTest.length,
  exists: 0,
  notFound: 0,
  renderSuccess: 0,
  renderFailed: 0
};

// Mock data for rendering
const mockData = {
  title: 'View Test',
  user: { name: 'Test User', email: 'test@example.com', roles: ['admin'] },
  csrfToken: 'mock-csrf-token',
  flash: { success: [], error: [], info: [] }
};

console.log(`${colors.blue}=== Testing Entry Point Views ===${colors.reset}`);
console.log(`${colors.blue}Total views to test: ${viewsToTest.length}${colors.reset}`);
console.log('');

// Test each view
viewsToTest.forEach((viewPath) => {
  const fullPath = path.join(viewsPath, viewPath);
  
  // Check if file exists
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    results.exists++;
    console.log(`${colors.green}✓ EXISTS: ${viewPath}${colors.reset}`);
    
    // Try to render the view
    try {
      const rendered = nunjucks.render(viewPath, mockData);
      if (rendered) {
        results.renderSuccess++;
        console.log(`${colors.green}  ✓ RENDERS: ${viewPath}${colors.reset}`);
      }
    } catch (error) {
      results.renderFailed++;
      console.log(`${colors.red}  ✗ RENDER FAILED: ${viewPath}${colors.reset}`);
      console.log(`${colors.red}    Error: ${error.message}${colors.reset}`);
    }
  } else {
    results.notFound++;
    console.log(`${colors.red}✗ NOT FOUND: ${viewPath}${colors.reset}`);
  }
});

// Print summary
console.log('');
console.log(`${colors.blue}=== Test Results ===${colors.reset}`);
console.log(`Total views tested: ${results.total}`);
console.log(`${colors.green}Files found: ${results.exists}${colors.reset}`);
console.log(`${colors.red}Files not found: ${results.notFound}${colors.reset}`);
console.log(`${colors.green}Successfully rendered: ${results.renderSuccess}${colors.reset}`);
console.log(`${colors.red}Failed to render: ${results.renderFailed}${colors.reset}`);
