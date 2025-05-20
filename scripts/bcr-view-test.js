/**
 * BCR View Test Script
 * 
 * This script tests all the BCR views and functionality
 * Run with: node scripts/bcr-view-test.js
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration
const BASE_URL = 'http://localhost:4000';
let authCookie = null;

// Test user credentials
const TEST_USER = {
  email: 'prod@email.com',
  password: 'password1254'
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
      validateStatus: () => true // Don't throw on error status codes
    };

    if (authCookie) {
      options.headers.Cookie = authCookie;
    }

    if (data) {
      options.data = data;
    }

    const response = await axios(options);
    
    // Save auth cookie if present
    if (response.headers['set-cookie'] && !authCookie) {
      authCookie = response.headers['set-cookie'][0];
    }

    return response;
  } catch (error) {
    console.error(`Error making ${method} request to ${url}:`, error.message);
    return { status: 500, data: null };
  }
}

/**
 * Login to the application
 */
async function login() {
  console.log('\n🔑 Testing login...');
  const response = await makeRequest('POST', '/auth/login', TEST_USER);
  
  if (response.status === 302 || response.status === 200) {
    console.log('✅ Login successful');
    return true;
  } else {
    console.log('❌ Login failed:', response.status);
    return false;
  }
}

/**
 * Test BCR list view
 */
async function testBcrListView() {
  console.log('\n📋 Testing BCR list view...');
  const response = await makeRequest('GET', '/bcr');
  
  if (response.status === 200) {
    console.log('✅ BCR list view loaded successfully');
    return true;
  } else {
    console.log('❌ BCR list view failed:', response.status);
    return false;
  }
}

/**
 * Test BCR detail view for a specific BCR
 */
async function testBcrDetailView() {
  console.log('\n🔍 Testing BCR detail view...');
  
  // Get a BCR ID from the database
  const bcr = await prisma.bcrs.findFirst();
  
  if (!bcr) {
    console.log('❌ No BCRs found in the database');
    return false;
  }
  
  const response = await makeRequest('GET', `/bcr/${bcr.id}`);
  
  if (response.status === 200) {
    console.log(`✅ BCR detail view loaded successfully for BCR: ${bcr.bcrNumber} - ${bcr.title}`);
    return true;
  } else {
    console.log('❌ BCR detail view failed:', response.status);
    return false;
  }
}

/**
 * Test BCR creation form
 */
async function testBcrCreationForm() {
  console.log('\n➕ Testing BCR creation form...');
  
  // Test form load
  const formResponse = await makeRequest('GET', '/bcr/submit');
  
  if (formResponse.status !== 200) {
    console.log('❌ BCR creation form failed to load:', formResponse.status);
    return false;
  }
  
  console.log('✅ BCR creation form loaded successfully');
  
  // Test form submission with a new BCR
  const newBcr = {
    title: `Test BCR ${new Date().toISOString()}`,
    description: 'This is a test BCR created by the automated test script',
    priority: 'medium',
    impact: ['security', 'user-interface'],
    status: 'draft'
  };
  
  const submitResponse = await makeRequest('POST', '/bcr/submit', newBcr);
  
  if (submitResponse.status === 302) {
    console.log('✅ BCR creation form submitted successfully');
    return true;
  } else {
    console.log('❌ BCR creation form submission failed:', submitResponse.status);
    return false;
  }
}

/**
 * Test BCR edit form
 */
async function testBcrEditForm() {
  console.log('\n✏️ Testing BCR edit form...');
  
  // Get a BCR ID from the database
  const bcr = await prisma.bcrs.findFirst();
  
  if (!bcr) {
    console.log('❌ No BCRs found in the database');
    return false;
  }
  
  // Test form load
  const formResponse = await makeRequest('GET', `/bcr/edit/${bcr.id}`);
  
  if (formResponse.status !== 200) {
    console.log('❌ BCR edit form failed to load:', formResponse.status);
    return false;
  }
  
  console.log(`✅ BCR edit form loaded successfully for BCR: ${bcr.bcrNumber}`);
  
  // Test form submission with updated BCR
  const updatedBcr = {
    title: `${bcr.title} (Updated)`,
    description: `${bcr.description} - Updated by test script`,
    priority: bcr.priority,
    impact: bcr.impact.split(', ').map(i => i.toLowerCase().replace(/\s+/g, '-')),
    status: bcr.status
  };
  
  const submitResponse = await makeRequest('POST', `/bcr/edit/${bcr.id}`, updatedBcr);
  
  if (submitResponse.status === 302) {
    console.log('✅ BCR edit form submitted successfully');
    return true;
  } else {
    console.log('❌ BCR edit form submission failed:', submitResponse.status);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Starting BCR view tests...');
  
  try {
    // Login first
    const loggedIn = await login();
    if (!loggedIn) {
      console.log('❌ Tests aborted: Login failed');
      return;
    }
    
    // Run all tests
    await testBcrListView();
    await testBcrDetailView();
    await testBcrCreationForm();
    await testBcrEditForm();
    
    console.log('\n✅ All BCR view tests completed!');
  } catch (error) {
    console.error('❌ Error running tests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runTests();
