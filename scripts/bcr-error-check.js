/**
 * BCR Error Check Script
 * 
 * This script tests all BCR routes and views for errors
 * Run with: node scripts/bcr-error-check.js
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

// Configuration
const BASE_URL = 'http://localhost:4000';
let authCookie = null;
let csrfToken = null;

// Test user credentials
const TEST_USER = {
  email: 'prod@email.com',
  password: 'password1254'
};

// Routes to test
const ROUTES_TO_TEST = [
  { method: 'GET', path: '/bcr', name: 'BCR List View' },
  { method: 'GET', path: '/bcr/submit', name: 'BCR Creation Form' },
  // Dynamic routes will be added based on database content
];

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Helper function to make authenticated requests
 */
async function makeRequest(method, url, data = null) {
  try {
    const options = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {},
      validateStatus: () => true, // Don't throw on error status codes
      maxRedirects: 0 // Don't follow redirects
    };

    if (authCookie) {
      options.headers.Cookie = authCookie;
    }

    if (csrfToken && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      if (!data) data = {};
      data._csrf = csrfToken;
    }

    if (data) {
      options.data = data;
    }

    const response = await axios(options);
    
    // Save auth cookie if present
    if (response.headers['set-cookie'] && !authCookie) {
      authCookie = response.headers['set-cookie'][0];
    }

    // Extract CSRF token if present
    if (response.data && typeof response.data === 'string' && response.data.includes('name="_csrf"')) {
      const match = response.data.match(/name="_csrf"[^>]*value="([^"]+)"/);
      if (match && match[1]) {
        csrfToken = match[1];
      }
    }

    return response;
  } catch (error) {
    console.error(`Error making ${method} request to ${url}:`, error.message);
    return { status: 500, data: null, error: error.message };
  }
}

/**
 * Login to the application
 */
async function login() {
  console.log('\n🔑 Logging in...');
  
  try {
    // First get the login page to get the CSRF token
    const loginPageResponse = await makeRequest('GET', '/login');
    
    if (loginPageResponse.status !== 200) {
      console.log('❌ Failed to load login page:', loginPageResponse.status);
      return false;
    }
    
    // Now login with the credentials
    const loginResponse = await makeRequest('POST', '/login', TEST_USER);
    
    if (loginResponse.status === 302 || loginResponse.status === 200) {
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', loginResponse.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    return false;
  }
}

/**
 * Test a specific route
 */
async function testRoute(method, path, name, data = null) {
  console.log(`\n🔍 Testing ${name} (${method} ${path})...`);
  
  try {
    const response = await makeRequest(method, path, data);
    
    // Check for client errors (4xx) or server errors (5xx)
    if (response.status >= 400) {
      results.failed++;
      const error = {
        route: path,
        method,
        status: response.status,
        message: `Error ${response.status} when accessing ${method} ${path}`
      };
      results.errors.push(error);
      console.log(`❌ Failed: ${error.message}`);
      return false;
    } else {
      results.passed++;
      console.log(`✅ Passed: ${method} ${path} returned status ${response.status}`);
      return true;
    }
  } catch (error) {
    results.failed++;
    const errorInfo = {
      route: path,
      method,
      status: 'Exception',
      message: `Exception when accessing ${method} ${path}: ${error.message}`
    };
    results.errors.push(errorInfo);
    console.log(`❌ Failed: ${errorInfo.message}`);
    return false;
  }
}

/**
 * Add dynamic routes based on database content
 */
async function addDynamicRoutes() {
  try {
    // Get a BCR ID from the database for detail and edit views
    const bcr = await prisma.bcrs.findFirst();
    
    if (bcr) {
      ROUTES_TO_TEST.push(
        { method: 'GET', path: `/bcr/${bcr.id}`, name: 'BCR Detail View' },
        { method: 'GET', path: `/bcr/edit/${bcr.id}`, name: 'BCR Edit Form' }
      );
      
      // Add POST routes for testing form submissions
      ROUTES_TO_TEST.push(
        { 
          method: 'POST', 
          path: '/bcr/submit', 
          name: 'BCR Creation Submission',
          data: {
            title: `Test BCR ${new Date().toISOString()}`,
            description: 'This is a test BCR created by the error check script',
            priority: 'medium',
            impact: ['security', 'user-interface']
          }
        },
        { 
          method: 'POST', 
          path: `/bcr/edit/${bcr.id}`, 
          name: 'BCR Edit Submission',
          data: {
            title: `${bcr.title} (Updated)`,
            description: `${bcr.description} - Updated by error check script`,
            priority: bcr.priority,
            impact: bcr.impact.split(', ').map(i => i.toLowerCase().replace(/\\s+/g, '-')),
            status: bcr.status
          }
        }
      );
    } else {
      console.log('⚠️ No BCRs found in the database, skipping dynamic routes');
    }
  } catch (error) {
    console.error('❌ Error adding dynamic routes:', error);
  }
}

/**
 * Print summary of test results
 */
function printSummary() {
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.method} ${error.route}: ${error.message}`);
    });
  } else {
    console.log('\n🎉 No errors found! All BCR routes and views are working correctly.');
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Starting BCR error check...');
  
  try {
    // Add dynamic routes based on database content
    await addDynamicRoutes();
    
    // Login first
    const loggedIn = await login();
    if (!loggedIn) {
      console.log('❌ Tests aborted: Login failed');
      return;
    }
    
    // Test all routes
    for (const route of ROUTES_TO_TEST) {
      await testRoute(route.method, route.path, route.name, route.data);
    }
    
    // Print summary
    printSummary();
  } catch (error) {
    console.error('❌ Error running tests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runTests();
