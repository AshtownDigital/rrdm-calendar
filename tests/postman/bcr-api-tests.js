/**
 * API Tests for BCR Submissions
 * 
 * This script tests the BCR submission API endpoints directly
 * without requiring Postman or Newman.
 */
// Use CommonJS for uuid
const { v4: uuidv4 } = require('uuid');

// We'll use axios instead of node-fetch since it works with CommonJS
const axios = require('axios');

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
  },
  critical: {
    description: 'Critical priority BCR submission via API test',
    priority: 'critical',
    impact: 'Systems, Users, Training',
    submitterName: 'Test User',
    submitterEmail: 'test@example.com',
    employmentType: 'yes'
  }
};

// Store created BCR IDs
const createdBcrs = [];

// Helper function to make API requests
async function makeRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Add a test header to identify our test requests
      'X-Test-Request': uuidv4()
    },
    validateStatus: () => true // Don't throw on any status code
  };

  if (body) {
    options.data = body;
  }

  try {
    const response = await axios(`${BASE_URL}${url}`, options);
    return {
      status: response.status,
      headers: response.headers,
      body: response.data
    };
  } catch (error) {
    console.error(`Error making request to ${url}:`, error);
    return {
      status: 0,
      error: error.message
    };
  }
}

// Test: Create a standard BCR submission
async function testCreateStandardBcr() {
  console.log('\n🧪 Testing: Create Standard BCR Submission');
  
  const response = await makeRequest('/bcr/submit-new', 'POST', testData.standard);
  
  if (response.status === 302 || response.status === 200) {
    console.log('✅ Test passed: BCR submission created successfully');
    
    // Extract BCR ID from Location header if available
    if (response.headers && response.headers.get('location')) {
      const location = response.headers.get('location');
      const bcrId = location.split('/').pop();
      createdBcrs.push(bcrId);
      console.log(`   📝 Created BCR ID: ${bcrId}`);
    } else {
      console.log('   ⚠️ Could not extract BCR ID from response');
    }
  } else {
    console.log(`❌ Test failed: Unexpected status code ${response.status}`);
    console.log(`   Response: ${response.body.substring(0, 200)}...`);
  }
}

// Test: Create a critical priority BCR
async function testCreateCriticalBcr() {
  console.log('\n🧪 Testing: Create Critical Priority BCR');
  
  const response = await makeRequest('/bcr/submit-new', 'POST', testData.critical);
  
  if (response.status === 302 || response.status === 200) {
    console.log('✅ Test passed: Critical BCR submission created successfully');
    
    // Extract BCR ID from Location header if available
    if (response.headers && response.headers.get('location')) {
      const location = response.headers.get('location');
      const bcrId = location.split('/').pop();
      createdBcrs.push(bcrId);
      console.log(`   📝 Created BCR ID: ${bcrId}`);
    } else {
      console.log('   ⚠️ Could not extract BCR ID from response');
    }
  } else {
    console.log(`❌ Test failed: Unexpected status code ${response.status}`);
    console.log(`   Response: ${response.body.substring(0, 200)}...`);
  }
}

// Test: Get BCR submission by ID
async function testGetBcrById(bcrId) {
  if (!bcrId) {
    console.log('\n⚠️ Skipping Get BCR test: No BCR ID available');
    return;
  }
  
  console.log(`\n🧪 Testing: Get BCR Submission by ID (${bcrId})`);
  
  const response = await makeRequest(`/direct/bcr-submissions/${bcrId}`);
  
  if (response.status === 200) {
    console.log('✅ Test passed: BCR details retrieved successfully');
    
    // Check for BCR code format
    const bcrCodeRegex = /BCR-\d{2}\/\d{2}-\d{4}/;
    if (bcrCodeRegex.test(response.body)) {
      console.log('   ✅ BCR code format is correct');
    } else {
      console.log('   ❌ BCR code format is incorrect or not found');
    }
    
    // Check for status tag
    const statusTagRegex = /govuk-tag govuk-tag--[a-z-]+/;
    if (statusTagRegex.test(response.body)) {
      console.log('   ✅ Status tag found');
    } else {
      console.log('   ❌ Status tag not found');
    }
  } else {
    console.log(`❌ Test failed: Unexpected status code ${response.status}`);
    console.log(`   Response: ${response.body.substring(0, 200)}...`);
  }
}

// Test: Delete BCR submission
async function testDeleteBcr(bcrId) {
  if (!bcrId) {
    console.log('\n⚠️ Skipping Delete BCR test: No BCR ID available');
    return;
  }
  
  console.log(`\n🧪 Testing: Delete BCR Submission (${bcrId})`);
  
  const response = await makeRequest(`/bcr/submissions/${bcrId}/delete`, 'POST');
  
  if (response.status === 302) {
    console.log('✅ Test passed: BCR deleted successfully');
    
    // Verify deletion by trying to access the deleted BCR
    const verifyResponse = await makeRequest(`/direct/bcr-submissions/${bcrId}`);
    if (verifyResponse.status === 404) {
      console.log('   ✅ Verification passed: BCR no longer accessible');
    } else {
      console.log(`   ❌ Verification failed: BCR still accessible (status ${verifyResponse.status})`);
    }
  } else {
    console.log(`❌ Test failed: Unexpected status code ${response.status}`);
    console.log(`   Response: ${response.body.substring(0, 200)}...`);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting BCR Submissions API Tests');
  console.log('======================================');
  
  // Create a standard BCR
  await testCreateStandardBcr();
  
  // Create a critical BCR
  await testCreateCriticalBcr();
  
  // Get BCR by ID (using the first created BCR)
  if (createdBcrs.length > 0) {
    await testGetBcrById(createdBcrs[0]);
  }
  
  // Delete BCR (using the second created BCR if available, otherwise the first one)
  const bcrToDelete = createdBcrs.length > 1 ? createdBcrs[1] : createdBcrs[0];
  if (bcrToDelete) {
    await testDeleteBcr(bcrToDelete);
  }
  
  console.log('\n======================================');
  console.log('🏁 All tests completed');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
