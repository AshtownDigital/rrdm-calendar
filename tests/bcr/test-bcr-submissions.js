/**
 * BCR Submissions Integration Tests
 * 
 * This script tests the BCR submission functionality by simulating form submissions
 * and verifying the responses.
 * 
 * NOTE: This test requires authentication. You need to run the server and log in manually
 * before running these tests, or modify the script to handle authentication programmatically.
 */
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const cheerio = require('cheerio');
const FormData = require('form-data');
const qs = require('querystring');

// Base URL for the application
const BASE_URL = 'http://localhost:3000';

// Store created BCR IDs
const createdBcrs = [];

// Test data for BCR submissions
const testData = {
  standard: {
    description: 'Test BCR submission created via integration test',
    priority: 'medium',
    impact: 'Systems, Reporting',
    submitterName: 'Test User',
    submitterEmail: 'test@example.com',
    employmentType: 'yes'
  },
  critical: {
    description: 'Critical priority BCR submission via integration test',
    priority: 'critical',
    impact: 'Systems, Users, Training',
    submitterName: 'Test User',
    submitterEmail: 'test@example.com',
    employmentType: 'yes'
  }
};

// Helper function to make API requests
async function makeRequest(url, method = 'GET', data = null, isFormSubmission = false) {
  const options = {
    method,
    headers: {
      // Add a test header to identify our test requests
      'X-Test-Request': uuidv4()
    },
    validateStatus: () => true, // Don't throw on any status code
    maxRedirects: 0 // Don't follow redirects automatically
  };

  if (data) {
    if (isFormSubmission) {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.data = qs.stringify(data);
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.data = data;
    }
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

// Helper function to extract BCR ID from a redirect location
function extractBcrId(location) {
  if (!location) return null;
  
  const parts = location.split('/');
  return parts[parts.length - 1];
}

// Helper function to extract CSRF token from HTML
function extractCsrfToken(html) {
  const $ = cheerio.load(html);
  return $('input[name="_csrf"]').val();
}

// Test: Get the BCR submission form and extract CSRF token
async function testGetBcrForm() {
  console.log('\n🧪 Testing: Get BCR Submission Form');
  
  const response = await makeRequest('/bcr/submit');
  
  if (response.status === 200) {
    console.log('✅ Test passed: BCR submission form retrieved successfully');
    
    // Extract CSRF token
    const csrfToken = extractCsrfToken(response.body);
    if (csrfToken) {
      console.log('   ✅ CSRF token extracted successfully');
      return csrfToken;
    } else {
      console.log('   ❌ Failed to extract CSRF token');
      return null;
    }
  } else {
    console.log(`❌ Test failed: Unexpected status code ${response.status}`);
    console.log(`   Response: ${typeof response.body === 'string' ? response.body.substring(0, 200) : 'Not a string'}...`);
    return null;
  }
}

// Test: Create a standard BCR submission
async function testCreateStandardBcr(csrfToken) {
  console.log('\n🧪 Testing: Create Standard BCR Submission');
  
  if (!csrfToken) {
    console.log('   ⚠️ Skipping test: No CSRF token available');
    return;
  }
  
  // Prepare form data with CSRF token
  const formData = {
    ...testData.standard,
    _csrf: csrfToken
  };
  
  const response = await makeRequest('/bcr/submit-new', 'POST', formData, true);
  
  if (response.status === 302) {
    console.log('✅ Test passed: BCR submission created successfully');
    
    // Extract BCR ID from Location header if available
    if (response.headers && response.headers.location) {
      const location = response.headers.location;
      const bcrId = extractBcrId(location);
      if (bcrId) {
        createdBcrs.push(bcrId);
        console.log(`   📝 Created BCR ID: ${bcrId}`);
      } else {
        console.log(`   ⚠️ Could not extract BCR ID from location: ${location}`);
      }
    } else {
      console.log('   ⚠️ No Location header in response');
    }
  } else {
    console.log(`❌ Test failed: Unexpected status code ${response.status}`);
    console.log(`   Response: ${typeof response.body === 'string' ? response.body.substring(0, 200) : 'Not a string'}...`);
  }
}

// Test: Create a critical priority BCR
async function testCreateCriticalBcr(csrfToken) {
  console.log('\n🧪 Testing: Create Critical Priority BCR');
  
  if (!csrfToken) {
    console.log('   ⚠️ Skipping test: No CSRF token available');
    return;
  }
  
  // Prepare form data with CSRF token
  const formData = {
    ...testData.critical,
    _csrf: csrfToken
  };
  
  const response = await makeRequest('/bcr/submit-new', 'POST', formData, true);
  
  if (response.status === 302) {
    console.log('✅ Test passed: Critical BCR submission created successfully');
    
    // Extract BCR ID from Location header if available
    if (response.headers && response.headers.location) {
      const location = response.headers.location;
      const bcrId = extractBcrId(location);
      if (bcrId) {
        createdBcrs.push(bcrId);
        console.log(`   📝 Created BCR ID: ${bcrId}`);
      } else {
        console.log(`   ⚠️ Could not extract BCR ID from location: ${location}`);
      }
    } else {
      console.log('   ⚠️ No Location header in response');
    }
  } else {
    console.log(`❌ Test failed: Unexpected status code ${response.status}`);
    console.log(`   Response: ${typeof response.body === 'string' ? response.body.substring(0, 200) : 'Not a string'}...`);
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
    
    // Use cheerio to parse the HTML and check for specific elements
    const $ = cheerio.load(response.body);
    
    // Check for BCR code format
    const bcrCodeText = $('.govuk-heading-l').text();
    const bcrCodeRegex = /BCR-\d{2}\/\d{2}-\d{4}/;
    if (bcrCodeRegex.test(bcrCodeText)) {
      console.log(`   ✅ BCR code format is correct: ${bcrCodeText.trim()}`);
    } else {
      console.log('   ❌ BCR code format is incorrect or not found');
    }
    
    // Check for status tag
    const statusTag = $('.govuk-tag').first();
    if (statusTag.length > 0) {
      console.log(`   ✅ Status tag found: ${statusTag.text().trim()}`);
      
      // Check if the tag has the correct GOV.UK Design System class
      const tagClasses = statusTag.attr('class');
      if (tagClasses && tagClasses.includes('govuk-tag--')) {
        console.log(`   ✅ Status tag has correct GOV.UK Design System class: ${tagClasses}`);
      } else {
        console.log('   ❌ Status tag does not have correct GOV.UK Design System class');
      }
    } else {
      console.log('   ❌ Status tag not found');
    }
    
    // Check for description
    const description = $('.govuk-body').text();
    if (description && description.includes(testData.standard.description) || 
        description.includes(testData.critical.description)) {
      console.log('   ✅ BCR description matches test data');
    } else {
      console.log('   ❌ BCR description does not match test data');
    }
  } else {
    console.log(`❌ Test failed: Unexpected status code ${response.status}`);
    console.log(`   Response: ${typeof response.body === 'string' ? response.body.substring(0, 200) : 'Not a string'}...`);
  }
}

// Test: Delete BCR submission
async function testDeleteBcr(bcrId, csrfToken) {
  if (!bcrId) {
    console.log('\n⚠️ Skipping Delete BCR test: No BCR ID available');
    return;
  }
  
  if (!csrfToken) {
    console.log('\n⚠️ Skipping Delete BCR test: No CSRF token available');
    return;
  }
  
  console.log(`\n🧪 Testing: Delete BCR Submission (${bcrId})`);
  
  // Prepare form data with CSRF token
  const formData = {
    _csrf: csrfToken
  };
  
  const response = await makeRequest(`/bcr/submissions/${bcrId}/delete`, 'POST', formData, true);
  
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
    console.log(`   Response: ${typeof response.body === 'string' ? response.body.substring(0, 200) : 'Not a string'}...`);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting BCR Submissions Integration Tests');
  console.log('============================================');
  
  // Get the BCR submission form and extract CSRF token
  const csrfToken = await testGetBcrForm();
  
  // Create a standard BCR
  await testCreateStandardBcr(csrfToken);
  
  // Create a critical BCR
  await testCreateCriticalBcr(csrfToken);
  
  // Get BCR by ID (using the first created BCR)
  if (createdBcrs.length > 0) {
    await testGetBcrById(createdBcrs[0]);
  }
  
  // Delete BCR (using the second created BCR if available, otherwise the first one)
  const bcrToDelete = createdBcrs.length > 1 ? createdBcrs[1] : createdBcrs[0];
  if (bcrToDelete) {
    // Get a fresh CSRF token for deletion
    const deleteCsrfToken = await testGetBcrForm();
    await testDeleteBcr(bcrToDelete, deleteCsrfToken);
  }
  
  console.log('\n============================================');
  console.log('🏁 All tests completed');
  
  // Summary of test results
  console.log('\n📊 Test Summary:');
  console.log(`   BCRs created: ${createdBcrs.length}`);
  console.log(`   BCR IDs: ${createdBcrs.join(', ')}`);
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
