/**
 * BCR Endpoints Test Script
 * 
 * This script tests all BCR endpoints for errors
 * Run with: node scripts/test-bcr-endpoints.js
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.development' });

const prisma = new PrismaClient();
const BASE_URL = 'localhost';
const PORT = 4000;

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Make an HTTP request to a specific endpoint
 */
function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path,
      method
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

/**
 * Test a specific endpoint
 */
async function testEndpoint(method, path) {
  console.log(`Testing ${method} ${path}...`);
  
  try {
    const response = await makeRequest(method, path);
    
    // Check for server errors (5xx)
    if (response.statusCode >= 500) {
      results.failed++;
      const error = {
        path,
        method,
        statusCode: response.statusCode,
        message: `Server error ${response.statusCode} when accessing ${method} ${path}`
      };
      results.errors.push(error);
      console.log(`❌ Failed: ${error.message}`);
      return false;
    } else {
      results.passed++;
      console.log(`✅ Passed: ${method} ${path} returned status ${response.statusCode}`);
      return true;
    }
  } catch (error) {
    results.failed++;
    const errorInfo = {
      path,
      method,
      statusCode: 'Exception',
      message: `Exception when accessing ${method} ${path}: ${error.message}`
    };
    results.errors.push(errorInfo);
    console.log(`❌ Failed: ${errorInfo.message}`);
    return false;
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
      console.log(`${index + 1}. ${error.method} ${error.path}: ${error.message}`);
    });
  } else {
    console.log('\n🎉 No server errors found! All BCR endpoints are responding without 5xx errors.');
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Starting BCR endpoints test...');
  
  try {
    // Get a sample BCR ID for testing detail and edit routes
    const sampleBcr = await prisma.bcrs.findFirst();
    
    if (!sampleBcr) {
      console.log('❌ No BCRs found in the database. Please run the seed script first.');
      return;
    }
    
    // Define routes to test
    const routes = [
      { method: 'GET', path: '/bcr' },
      { method: 'GET', path: `/bcr/${sampleBcr.id}` },
      { method: 'GET', path: '/bcr/submit' },
      { method: 'GET', path: `/bcr/edit/${sampleBcr.id}` }
    ];
    
    // Test all routes
    for (const route of routes) {
      await testEndpoint(route.method, route.path);
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
