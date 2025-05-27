/**
 * Direct form submission test script
 * This script uses the fetch API to directly submit the form to the server
 */
const fetch = require('node-fetch');
const FormData = require('form-data');

async function submitForm() {
  try {
    console.log('Starting direct form submission test...');
    
    // Create form data
    const formData = new FormData();
    formData.append('fullName', 'Direct Test User');
    formData.append('emailAddress', 'direct-test@example.com');
    formData.append('submissionSource', 'Internal');
    formData.append('briefDescription', 'Direct form submission test');
    formData.append('justification', 'Testing direct form submission without browser');
    formData.append('urgencyLevel', 'Medium');
    formData.append('impactAreas', 'Frontend');
    formData.append('attachments', 'No');
    formData.append('declaration', 'true');
    
    // Submit the form
    console.log('Submitting form data...');
    const response = await fetch('http://localhost:3001/bcr/submit', {
      method: 'POST',
      body: formData,
      headers: {
        // No need for Content-Type header as FormData sets it automatically
      }
    });
    
    // Log the response
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    
    // Get the response body
    const responseText = await response.text();
    console.log('Response body (first 500 chars):', responseText.substring(0, 500) + '...');
    
    console.log('Direct form submission test completed.');
  } catch (error) {
    console.error('Error in direct form submission test:', error);
  }
}

// Run the test
submitForm();
