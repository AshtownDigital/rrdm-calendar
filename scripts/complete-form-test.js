/**
 * Complete form submission test script
 * This script handles both getting the CSRF token and submitting the form
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

async function testFormSubmission() {
  console.log('Starting complete form submission test...');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,  // Show the browser for debugging
    slowMo: 50,       // Slow down operations for better visibility
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable detailed logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.error('Browser page error:', error.message));
    
    // Step 1: Navigate to the form page to get the CSRF token
    console.log('Navigating to form page...');
    await page.goto('http://localhost:3001/bcr/submit', { waitUntil: 'networkidle0' });
    
    // Step 2: Fill in the form
    console.log('Filling form fields...');
    await page.type('#fullName', 'Complete Test User');
    await page.type('#emailAddress', 'complete-test@example.com');
    await page.select('#submissionSource', 'Internal');
    await page.type('#briefDescription', 'Complete form test submission');
    await page.type('#justification', 'Testing the complete form submission process');
    
    // Select urgency level
    await page.click('#urgencyLevel-Medium');
    
    // Select impact areas (using the actual IDs from the form)
    const impactAreaIds = await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[name="impactAreas"]'));
      return checkboxes.slice(0, 2).map(checkbox => checkbox.id);
    });
    
    for (const id of impactAreaIds) {
      console.log(`Clicking impact area checkbox: ${id}`);
      await page.click(`#${id}`);
    }
    
    // Select attachments option
    await page.click('#attachments-No');
    
    // Check declaration checkbox
    await page.click('#declaration');
    
    // Take screenshot before submission
    const screenshotPath = path.join(logsDir, `before-submit-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);
    
    // Step 3: Submit the form
    console.log('Submitting form...');
    
    // Enable request/response logging
    page.on('request', request => {
      if (request.url().includes('/bcr/submit') && request.method() === 'POST') {
        console.log('Form submission request URL:', request.url());
        console.log('Form submission request headers:', request.headers());
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/bcr/submit')) {
        console.log('Form submission response status:', response.status());
        if (response.status() >= 400) {
          try {
            const text = await response.text();
            console.log('Error response (first 500 chars):', text.substring(0, 500) + '...');
            
            // Save full response to file
            const errorPath = path.join(logsDir, `error-response-${Date.now()}.html`);
            fs.writeFileSync(errorPath, text);
            console.log(`Full error response saved to: ${errorPath}`);
          } catch (err) {
            console.error('Failed to capture error response:', err);
          }
        }
      }
    });
    
    // Click the submit button and wait for navigation
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ timeout: 10000 }).catch(e => {
        console.error('Navigation timeout or error:', e.message);
      })
    ]);
    
    // Take screenshot after submission
    const afterScreenshotPath = path.join(logsDir, `after-submit-${Date.now()}.png`);
    await page.screenshot({ path: afterScreenshotPath, fullPage: true });
    console.log(`After submission screenshot saved: ${afterScreenshotPath}`);
    
    // Save page HTML
    const html = await page.content();
    const htmlPath = path.join(logsDir, `page-after-submission-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(`Page HTML saved to: ${htmlPath}`);
    
    // Check if we're on the confirmation page
    const currentUrl = page.url();
    console.log('Current URL after submission:', currentUrl);
    
    const pageTitle = await page.title();
    console.log('Page title after submission:', pageTitle);
    
    if (currentUrl.includes('confirmation') || pageTitle.includes('Confirmation')) {
      console.log('SUCCESS: Form submitted successfully and redirected to confirmation page');
    } else {
      console.log('FAILURE: Form submission failed or did not redirect to confirmation page');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Close the browser
    await browser.close();
    console.log('Test completed.');
  }
}

// Run the test
testFormSubmission().catch(console.error);
