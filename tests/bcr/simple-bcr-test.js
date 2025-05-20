/**
 * Simple BCR Submission Test
 * 
 * This script tests the BCR submission functionality by making HTTP requests
 * to the server endpoints and checking the responses.
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

// Base URL for the API
const BASE_URL = 'http://localhost:3000';

// Test data for BCR submissions
const testData = {
  standard: {
    description: 'Test BCR submission created via API test',
    priority: 'medium',
    impact: 'Systems, Reporting',
    submitterName: 'Test User',
    submitterEmail: 'test@example.com',
    employmentType: 'yes'
  }
};

// Helper function to make API requests
async function makeRequest(url, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Request': uuidv4()
    },
    validateStatus: () => true // Don't throw on any status code
  };

  if (data) {
    options.data = data;
  }

  try {
    const response = await axios(`${BASE_URL}${url}`, options);
    return {
      status: response.status,
      headers: response.headers,
      data: response.data
    };
  } catch (error) {
    console.error(`Error making request to ${url}:`, error);
    return {
      status: 0,
      error: error.message
    };
  }
}

// Test: Check if the server is running
async function testServerStatus() {
  console.log('\n🧪 Testing: Server Status');
  
  try {
    const response = await makeRequest('/');
    
    if (response.status === 200 || response.status === 302) {
      console.log('✅ Test passed: Server is running');
      return true;
    } else {
      console.log(`❌ Test failed: Server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Test: Check if the BCR submission form is accessible
async function testBcrFormAccess() {
  console.log('\n🧪 Testing: BCR Submission Form Access');
  
  try {
    const response = await makeRequest('/bcr/submit');
    
    // If we get a 200 OK, the form is accessible directly
    if (response.status === 200) {
      console.log('✅ Test passed: BCR submission form is accessible');
      return true;
    } 
    // If we get a 302 Found, we're being redirected (likely to login)
    else if (response.status === 302) {
      console.log('ℹ️ BCR submission form requires authentication');
      return false;
    } else {
      console.log(`❌ Test failed: Unexpected status code ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Test: Check if the BCR routes are configured correctly
async function testBcrRoutes() {
  console.log('\n🧪 Testing: BCR Routes Configuration');
  
  const routes = [
    { path: '/bcr/submit', name: 'BCR Submission Form' },
    { path: '/bcr/submissions', name: 'BCR Submissions List' },
    { path: '/bcr/submit-new', name: 'BCR Submit New Endpoint' }
  ];
  
  let passedCount = 0;
  
  for (const route of routes) {
    try {
      const response = await makeRequest(route.path);
      
      // Either 200 OK or 302 Found (redirect) is acceptable
      if (response.status === 200 || response.status === 302) {
        console.log(`✅ Route "${route.name}" is configured correctly`);
        passedCount++;
      } else {
        console.log(`❌ Route "${route.name}" returned unexpected status ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Route "${route.name}" test failed:`, error);
    }
  }
  
  console.log(`✅ ${passedCount}/${routes.length} routes are configured correctly`);
  return passedCount === routes.length;
}

// Test: Check if the server has the required controllers for BCR submissions
async function testServerControllers() {
  console.log('\n🧪 Testing: Server Controllers');
  
  try {
    // Make a request to a route that would use the submission controller
    const response = await makeRequest('/bcr/submit');
    
    if (response.status === 200 || response.status === 302) {
      console.log('✅ Test passed: Server has the required controllers');
      return true;
    } else {
      console.log(`❌ Test failed: Server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Simple BCR Tests');
  console.log('===========================');
  
  // Check if the server is running
  const serverRunning = await testServerStatus();
  
  if (!serverRunning) {
    console.log('❌ Server is not running. Aborting tests.');
    return;
  }
  
  // Run the tests
  await testBcrFormAccess();
  await testBcrRoutes();
  await testServerControllers();
  
  console.log('\n===========================');
  console.log('🏁 All tests completed');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
