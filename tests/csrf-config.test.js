/**
 * CSRF Configuration Test
 * Tests whether the CSRF protection is properly configured
 */
const request = require('supertest');
const assert = require('assert');
// Don't require the server directly as it's already running

// Server URL
const SERVER_URL = 'http://localhost:3000';

// Function to test CSRF configuration
async function testCsrfConfiguration() {
  try {
    // Check multiple pages to find CSRF cookies
    const pagesToCheck = [
      '/',                   // Home page
      '/dashboard',          // Dashboard
      '/bcr-submission/new', // BCR submission form
      '/monitoring/performance' // Monitoring page
    ];
    
    let csrfCookieFound = false;
    let csrfCookie = null;
    let checkedPages = [];
    
    // Try each page until we find a CSRF cookie
    for (const page of pagesToCheck) {
      try {
        const response = await request(SERVER_URL).get(page);
        checkedPages.push({ path: page, status: response.status });
        
        // Check if the page has CSRF cookie
        const hasCsrfCookie = response.headers['set-cookie']?.some(cookie => 
          cookie.includes('_csrf') || cookie.includes('XSRF-TOKEN'));
        
        if (hasCsrfCookie) {
          csrfCookieFound = true;
          csrfCookie = response.headers['set-cookie']?.find(cookie => 
            cookie.includes('_csrf') || cookie.includes('XSRF-TOKEN'));
          console.log(`Found CSRF cookie on page: ${page}`);
          break;
        }
      } catch (error) {
        console.log(`Error checking page ${page}:`, error.message);
        checkedPages.push({ path: page, status: 'error', message: error.message });
      }
    }
    
    // If we didn't find a CSRF cookie on any page, return a warning
    if (!csrfCookieFound) {
      return {
        status: 'warning',
        message: 'CSRF cookie not found on any page',
        details: `Checked pages: ${JSON.stringify(checkedPages)}. This may indicate that CSRF protection is not enabled globally.`
      };
    }
    
    // Now let's test if CSRF protection is actually enforced on POST requests
    // We'll try several endpoints that should be protected
    const endpointsToTest = [
      { path: '/api/items', data: { name: 'test item' } },
      { path: '/bcr-submission/submit', data: { title: 'Test Submission' } },
      { path: '/access/login', data: { email: 'test@example.com', password: 'password123' } }
    ];
    
    let csrfProtectionEnforced = false;
    let testedEndpoints = [];
    
    // Try each endpoint to see if CSRF protection is enforced
    for (const endpoint of endpointsToTest) {
      try {
        const response = await request(SERVER_URL)
          .post(endpoint.path)
          .send(endpoint.data);
          
        // Check if CSRF protection is enforced - we should get a 403 FORBIDDEN
        // or at least some kind of error response for missing CSRF token
        const endpointProtected = response.status === 403 || 
                              (response.status >= 400 && 
                               (response.text.toLowerCase().includes('csrf') || 
                                response.text.toLowerCase().includes('forbidden')));
                               
        testedEndpoints.push({
          path: endpoint.path,
          status: response.status,
          protected: endpointProtected
        });
        
        if (endpointProtected) {
          csrfProtectionEnforced = true;
          console.log(`CSRF protection enforced on ${endpoint.path}`);
          break;
        }
      } catch (error) {
        console.log(`Error testing endpoint ${endpoint.path}:`, error.message);
        testedEndpoints.push({
          path: endpoint.path,
          status: 'error',
          message: error.message
        });
      }
    }
    
    // Determine the final status based on our findings
    if (!csrfCookieFound && !csrfProtectionEnforced) {
      return {
        status: 'error',
        message: 'CSRF protection not configured',
        details: `No CSRF cookies found and no endpoints enforce CSRF protection. Checked pages: ${JSON.stringify(checkedPages)}. Tested endpoints: ${JSON.stringify(testedEndpoints)}.`
      };
    } else if (!csrfCookieFound && csrfProtectionEnforced) {
      return {
        status: 'warning',
        message: 'Partial CSRF protection',
        details: `CSRF protection is enforced on some endpoints, but no CSRF cookies were found on standard pages. This suggests a custom implementation. Tested endpoints: ${JSON.stringify(testedEndpoints)}.`
      };
    } else if (csrfCookieFound && !csrfProtectionEnforced) {
      return {
        status: 'warning',
        message: 'CSRF cookies found but not enforced',
        details: `CSRF cookies are set but protection doesn't seem to be enforced on POST requests. This suggests incomplete configuration. Tested endpoints: ${JSON.stringify(testedEndpoints)}.`
      };
    } else {
      return {
        status: 'success',
        message: 'CSRF protection is properly configured',
        details: 'The application sets CSRF cookies and enforces CSRF protection on POST requests.'
      };
    }
  } catch (error) {
    console.error('CSRF test error:', error);
    return {
      status: 'error',
      message: 'Error testing CSRF configuration',
      details: error.message || 'Unknown error occurred during CSRF testing'
    };
  }
}

// Export the test function
module.exports = {
  testCsrfConfiguration
};

// If this file is run directly, execute the test
if (require.main === module) {
  testCsrfConfiguration().then(result => {
    console.log('CSRF Configuration Test Result:', result);
    process.exit(0);
  }).catch(err => {
    console.error('Error running CSRF test:', err);
    process.exit(1);
  });
}
