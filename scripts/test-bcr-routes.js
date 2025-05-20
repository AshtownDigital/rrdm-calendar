/**
 * BCR Routes Test Script
 * 
 * This script tests all BCR models, routes, views, and controllers
 * to ensure they're functioning correctly after the route updates.
 */
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Base URL for the application
const BASE_URL = 'http://localhost:3000/bcr';

// Test data
const testData = {
  submission: {
    title: 'Test BCR Submission',
    description: 'This is a test BCR submission created by the test script',
    impactArea: 'test_impact_area',
    urgencyLevel: 'medium'
  }
};

// Track created resources for cleanup
const createdResources = {
  bcrs: [],
  impactAreas: []
};

// Helper functions
const log = {
  info: (message) => console.log(`\x1b[34m[INFO] ${message}\x1b[0m`),
  success: (message) => console.log(`\x1b[32m[SUCCESS] ${message}\x1b[0m`),
  error: (message) => console.log(`\x1b[31m[ERROR] ${message}\x1b[0m`),
  warning: (message) => console.log(`\x1b[33m[WARNING] ${message}\x1b[0m`)
};

/**
 * Test a route
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - Route path
 * @param {Object} data - Request data (for POST, PUT, etc.)
 * @param {number} expectedStatus - Expected HTTP status code
 * @returns {Promise<Object>} - Response data
 */
async function testRoute(method, path, data = null, expectedStatus = 200) {
  try {
    log.info(`Testing ${method} ${path}`);
    
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      url,
      validateStatus: () => true // Don't throw on non-2xx responses
    };
    
    if (data) {
      options.data = data;
    }
    
    const response = await axios(options);
    
    if (response.status === expectedStatus) {
      log.success(`${method} ${path} - Status: ${response.status}`);
    } else {
      log.error(`${method} ${path} - Expected status ${expectedStatus}, got ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    log.error(`Error testing ${method} ${path}: ${error.message}`);
    throw error;
  }
}

/**
 * Test database models
 */
async function testModels() {
  log.info('Testing database models...');
  
  try {
    // Test BcrConfigs model
    const configCount = await prisma.bcrConfigs.count();
    log.success(`BcrConfigs model - Found ${configCount} configs`);
    
    // Test Users model
    const userCount = await prisma.users.count();
    log.success(`Users model - Found ${userCount} users`);
    
    // Test Bcrs model
    const bcrCount = await prisma.bcrs.count();
    log.success(`Bcrs model - Found ${bcrCount} BCRs`);
  } catch (error) {
    log.error(`Error testing models: ${error.message}`);
  }
}

/**
 * Test BCR submission routes
 */
async function testBcrSubmissionRoutes() {
  log.info('Testing BCR submission routes...');
  
  try {
    // Test GET /bcr-submission/new
    await testRoute('GET', '/bcr-submission/new');
    
    // Test POST /bcr-submission
    // Note: This would create a real submission, so we're not actually executing it
    log.warning('Skipping POST /bcr-submission to avoid creating real data');
    
    // Test POST /bcr-submission/:id/review
    // Note: This would update a real submission, so we're not actually executing it
    log.warning('Skipping POST /bcr-submission/:id/review to avoid modifying real data');
  } catch (error) {
    log.error(`Error testing BCR submission routes: ${error.message}`);
  }
}

/**
 * Test BCR routes
 */
async function testBcrRoutes() {
  log.info('Testing BCR routes...');
  
  try {
    // Get a sample BCR ID from the database
    const sampleBcr = await prisma.bcrs.findFirst({
      select: { id: true }
    });
    
    if (!sampleBcr) {
      log.warning('No BCRs found in database, skipping BCR routes tests');
      return;
    }
    
    const bcrId = sampleBcr.id;
    
    // Test GET /bcr/:id
    await testRoute('GET', `/bcr/${bcrId}`);
    
    // Test GET /bcr/:id/update
    await testRoute('GET', `/bcr/${bcrId}/update`);
    
    // Test GET /bcr/:id/confirm
    await testRoute('GET', `/bcr/${bcrId}/confirm`);
    
    // Test GET /bcr/:id/warning
    await testRoute('GET', `/bcr/${bcrId}/warning`);
    
    // Test POST /bcr/:id/update
    // Note: This would update a real BCR, so we're not actually executing it
    log.warning('Skipping POST /bcr/:id/update to avoid modifying real data');
  } catch (error) {
    log.error(`Error testing BCR routes: ${error.message}`);
  }
}

/**
 * Test impacted areas routes
 */
async function testImpactedAreasRoutes() {
  log.info('Testing impacted areas routes...');
  
  try {
    // Test GET /impacted-areas
    await testRoute('GET', '/impacted-areas');
    
    // Test GET /impacted-areas/new
    await testRoute('GET', '/impacted-areas/new');
    
    // Get a sample impact area ID from the database
    const sampleImpactArea = await prisma.bcrConfigs.findFirst({
      where: { type: 'impact_area' },
      select: { id: true }
    });
    
    if (!sampleImpactArea) {
      log.warning('No impact areas found in database, skipping impact area detail routes tests');
      return;
    }
    
    const impactAreaId = sampleImpactArea.id;
    
    // Test GET /impacted-areas/:id/edit
    await testRoute('GET', `/impacted-areas/${impactAreaId}/edit`);
    
    // Test POST routes
    // Note: These would modify real data, so we're not actually executing them
    log.warning('Skipping POST /impacted-areas to avoid creating real data');
    log.warning('Skipping POST /impacted-areas/:id/update to avoid modifying real data');
    log.warning('Skipping POST /impacted-areas/:id/delete to avoid deleting real data');
  } catch (error) {
    log.error(`Error testing impacted areas routes: ${error.message}`);
  }
}

/**
 * Test authentication routes
 */
async function testAuthRoutes() {
  log.info('Testing authentication routes...');
  
  try {
    // Test GET /login
    await testRoute('GET', '/login');
    
    // Test POST /login and GET /logout
    // Note: These would affect the session, so we're not actually executing them
    log.warning('Skipping POST /login to avoid authentication side effects');
    log.warning('Skipping GET /logout to avoid authentication side effects');
  } catch (error) {
    log.error(`Error testing authentication routes: ${error.message}`);
  }
}

/**
 * Test views by checking for specific elements in the HTML response
 */
async function testViews() {
  log.info('Testing views...');
  
  try {
    // Test BCR submission form view
    const submissionFormResponse = await axios.get(`${BASE_URL}/bcr-submission/new`);
    if (submissionFormResponse.data.includes('New BCR Submission')) {
      log.success('BCR submission form view rendered correctly');
    } else {
      log.error('BCR submission form view not rendering correctly');
    }
    
    // Test impacted areas list view
    const impactAreasResponse = await axios.get(`${BASE_URL}/impacted-areas`);
    if (impactAreasResponse.data.includes('Impact Areas')) {
      log.success('Impacted areas list view rendered correctly');
    } else {
      log.error('Impacted areas list view not rendering correctly');
    }
    
    // Test login view
    const loginResponse = await axios.get(`${BASE_URL}/login`, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    }).catch(error => {
      // If we get a redirect, that's actually expected due to the mock auth middleware
      if (error.response && error.response.status === 302) {
        return error.response;
      }
      throw error;
    });
    
    // With mock auth middleware, we expect a redirect (302) to home page
    if (loginResponse.status === 302 && loginResponse.headers.location === '/') {
      log.success('Login view correctly redirects to home (mock auth is working)');
    } else if (loginResponse.data.includes('type="email"') && loginResponse.data.includes('type="password"')) {
      // If we somehow see the actual login form
      log.success('Login view rendered correctly');
    } else {
      log.error('Login view not behaving as expected');
      // Log more details about the response
      log.info(`Login response status: ${loginResponse.status}`);
      if (loginResponse.headers && loginResponse.headers.location) {
        log.info(`Redirect location: ${loginResponse.headers.location}`);
      }
      // Log the first 200 characters of the response if available
      if (loginResponse.data) {
        log.info(`Login response preview: ${loginResponse.data.substring(0, 200)}...`);
      }
    }
  } catch (error) {
    log.error(`Error testing views: ${error.message}`);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  log.info('Starting tests...');
  
  try {
    // Test models
    await testModels();
    
    // Test routes
    await testBcrSubmissionRoutes();
    await testBcrRoutes();
    await testImpactedAreasRoutes();
    await testAuthRoutes();
    
    // Test views
    await testViews();
    
    log.info('Tests completed');
  } catch (error) {
    log.error(`Error running tests: ${error.message}`);
  } finally {
    // Clean up Prisma client
    await prisma.$disconnect();
  }
}

// Run the tests
runTests();
