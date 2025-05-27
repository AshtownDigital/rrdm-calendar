/**
 * Script to generate test BCR submissions
 * This script uses Puppeteer to automate form submissions for testing
 * Enhanced with detailed logging for debugging and form fixing
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create a log file for this run
const logFile = path.join(logsDir, `submission-log-${new Date().toISOString().replace(/:/g, '-')}.log`);
const logger = fs.createWriteStream(logFile, { flags: 'a' });

// Log function that writes to console and file
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  logger.write(logMessage + '\n');
}

// Test data for submissions
const testSubmissions = [
  {
    fullName: 'Test User 1',
    emailAddress: 'test1@example.com',
    submissionSource: 'Internal',
    briefDescription: 'Test submission for frontend validation',
    justification: 'This is a test submission to verify that form validation works correctly',
    urgencyLevel: 'Medium',
    impactAreas: ['Frontend', 'API'],
    attachments: 'Yes',
  },
  {
    fullName: 'Test User 2',
    emailAddress: 'test2@example.com',
    submissionSource: 'External',
    briefDescription: 'Test submission for database integration',
    justification: 'This is a test submission to verify that data is correctly saved to MongoDB',
    urgencyLevel: 'High',
    impactAreas: ['Backend', 'Database'],
    attachments: 'No',
  },
  {
    fullName: 'Test User 3',
    emailAddress: 'test3@example.com',
    submissionSource: 'Other',
    organisation: 'Test Organization',
    briefDescription: 'Test submission with Other source',
    justification: 'This is a test submission to verify that the Other fields work correctly',
    urgencyLevel: 'Critical',
    impactAreas: ['Reference Data', 'Documentation & Guidance'],
    attachments: 'Yes',
  }
];

// Function to submit a single form with detailed logging
async function submitForm(page, data) {
  log(`Starting submission process for ${data.fullName}...`);
  
  try {
    // Take screenshot of initial state
    await takeScreenshot(page, `before-${data.fullName.replace(/\s+/g, '-')}`);
    
    // Navigate to the submission form
    log(`Navigating to submission form...`);
    await page.goto('http://localhost:3001/bcr/submit', { waitUntil: 'networkidle0' });
    
    // Check if the form loaded correctly
    const formExists = await page.evaluate(() => {
      return !!document.querySelector('form[action="/bcr/submit"]');
    });
    
    if (!formExists) {
      log(`Form not found at expected URL`, 'ERROR');
      await takeScreenshot(page, `form-not-found-${data.fullName.replace(/\s+/g, '-')}`);
      throw new Error('Form not found at expected URL');
    }
    
    log(`Form loaded successfully, beginning to fill fields...`);
    
    // Fill in the form fields with logging
    log(`Setting fullName to: ${data.fullName}`);
    await page.type('#fullName', data.fullName);
    
    log(`Setting emailAddress to: ${data.emailAddress}`);
    await page.type('#emailAddress', data.emailAddress);
    
    // Select submission source
    log(`Setting submissionSource to: ${data.submissionSource}`);
    if (data.submissionSource === 'Internal') {
      await page.select('#submissionSource', 'Internal');
    } else if (data.submissionSource === 'External') {
      await page.select('#submissionSource', 'External');
    } else {
      await page.select('#submissionSource', 'Other');
      // Fill in organisation if source is Other
      if (data.organisation) {
        log(`Setting organisation to: ${data.organisation}`);
        await page.type('#organisation', data.organisation);
      }
    }
    
    // Fill in description and justification
    log(`Setting briefDescription to: ${data.briefDescription}`);
    await page.type('#briefDescription', data.briefDescription);
    
    log(`Setting justification to: ${data.justification}`);
    await page.type('#justification', data.justification);
    
    // Select urgency level
    log(`Setting urgencyLevel to: ${data.urgencyLevel}`);
    const urgencyLevelSelector = `input[name="urgencyLevel"][value="${data.urgencyLevel}"]`;
    const urgencyLevelSet = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.click();
        return true;
      }
      return false;
    }, urgencyLevelSelector);
    
    if (!urgencyLevelSet) {
      log(`Could not find urgency level: ${data.urgencyLevel}`, 'WARNING');
    }
    
    // Select impact areas
    log(`Setting impactAreas to: ${data.impactAreas.join(', ')}`);
    for (const area of data.impactAreas) {
      // Find the checkbox by its label text
      const areaSet = await page.evaluate((areaName) => {
        const labels = Array.from(document.querySelectorAll('.govuk-checkboxes__label'));
        const label = labels.find(l => l.textContent.trim() === areaName);
        if (label) {
          const input = document.getElementById(label.getAttribute('for'));
          if (input) {
            input.click();
            return true;
          }
        }
        return false;
      }, area);
      
      if (!areaSet) {
        log(`Could not find impact area: ${area}`, 'WARNING');
      }
    }
    
    // Select attachments option
    log(`Setting attachments to: ${data.attachments}`);
    const attachmentsSelector = `input[name="attachments"][value="${data.attachments}"]`;
    const attachmentsSet = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.click();
        return true;
      }
      return false;
    }, attachmentsSelector);
    
    if (!attachmentsSet) {
      log(`Could not find attachments option: ${data.attachments}`, 'WARNING');
    }
    
    // Check the declaration checkbox
    log(`Setting declaration checkbox...`);
    const declarationSet = await page.evaluate(() => {
      const declaration = document.getElementById('declaration');
      if (declaration) {
        declaration.click();
        return true;
      }
      return false;
    });
    
    if (!declarationSet) {
      log(`Could not find declaration checkbox`, 'WARNING');
    }
    
    // Take screenshot before submission
    await takeScreenshot(page, `before-submit-${data.fullName.replace(/\s+/g, '-')}`);
    
    // Check for any validation errors before submitting
    const hasErrors = await page.evaluate(() => {
      return !!document.querySelector('.govuk-error-message');
    });
    
    if (hasErrors) {
      log(`Form has validation errors before submission`, 'WARNING');
      const errors = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('.govuk-error-message');
        return Array.from(errorElements).map(el => el.textContent.trim());
      });
      log(`Validation errors: ${errors.join(', ')}`, 'WARNING');
    }
    
    // Submit the form
    log(`Submitting form...`);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Check if submission was successful
    const isConfirmationPage = await page.evaluate(() => {
      return !!document.querySelector('.govuk-panel--confirmation');
    });
    
    if (isConfirmationPage) {
      log(`Submission for ${data.fullName} completed successfully!`, 'SUCCESS');
      
      // Get the submission ID from the confirmation page if available
      const submissionInfo = await page.evaluate(() => {
        const panel = document.querySelector('.govuk-panel--confirmation');
        const title = panel ? panel.querySelector('.govuk-panel__title').textContent : '';
        const body = panel ? panel.querySelector('.govuk-panel__body').textContent : '';
        return { title, body };
      });
      
      log(`Confirmation: ${submissionInfo.title}`, 'SUCCESS');
      log(`Submission ID: ${submissionInfo.body}`, 'SUCCESS');
      
      await takeScreenshot(page, `success-${data.fullName.replace(/\s+/g, '-')}`);
    } else {
      // Check if there are validation errors
      const hasPostErrors = await page.evaluate(() => {
        return !!document.querySelector('.govuk-error-message');
      });
      
      if (hasPostErrors) {
        log(`Form submission failed due to validation errors`, 'ERROR');
        const errors = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('.govuk-error-message');
          return Array.from(errorElements).map(el => el.textContent.trim());
        });
        log(`Validation errors: ${errors.join(', ')}`, 'ERROR');
      } else {
        log(`Form submission failed for unknown reason`, 'ERROR');
      }
      
      await takeScreenshot(page, `error-${data.fullName.replace(/\s+/g, '-')}`);
    }
  } catch (error) {
    log(`Error during form submission: ${error.message}`, 'ERROR');
    await takeScreenshot(page, `exception-${data.fullName.replace(/\s+/g, '-')}`);
  }
}

// Helper function to take screenshots
async function takeScreenshot(page, name) {
  const screenshotDir = path.join(__dirname, 'logs', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  const screenshotPath = path.join(screenshotDir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  log(`Screenshot saved: ${screenshotPath}`);
}

// Main function to run the script with enhanced debugging
async function run() {
  log('Starting test submission generation with detailed logging...', 'START');
  
  // Create a debug test submission with specific data to test problematic fields
  const debugSubmission = {
    fullName: 'Debug Test User',
    emailAddress: 'debug@example.com',
    submissionSource: 'Internal',
    briefDescription: 'Debugging submission for form testing',
    justification: 'This submission is specifically designed to test and debug the form submission process',
    urgencyLevel: 'Medium',
    impactAreas: ['Frontend', 'Backend', 'API'],  // Testing multiple selections
    attachments: 'Yes',
    additionalNotes: 'This is a debug submission with detailed logging'
  };
  
  // Log system information
  log(`Node.js version: ${process.version}`);
  log(`Operating system: ${process.platform} ${process.arch}`);
  log(`Current directory: ${process.cwd()}`);
  
  const browser = await puppeteer.launch({
    headless: false,  // Show the browser for debugging
    slowMo: 100,      // Slow down operations for better visibility
    defaultViewport: { width: 1280, height: 800 },  // Larger viewport for better screenshots
    args: ['--window-size=1280,800']
  });
  
  // Log browser version
  const version = await browser.version();
  log(`Browser version: ${version}`);
  
  const page = await browser.newPage();
  
  // Enable console logging from the browser
  page.on('console', msg => log(`Browser console: ${msg.text()}`, 'BROWSER'));
  
  // Log network requests and responses
  page.on('request', request => {
    if (request.url().includes('/bcr/submit')) {
      log(`Network request: ${request.method()} ${request.url()}`, 'NETWORK');
      if (request.method() === 'POST') {
        // Log POST data for debugging
        try {
          const postData = request.postData();
          if (postData) {
            log(`POST data: ${postData}`, 'NETWORK');
          }
        } catch (err) {
          log(`Could not get POST data: ${err.message}`, 'NETWORK');
        }
      }
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/bcr/submit')) {
      log(`Network response: ${response.status()} ${response.url()}`, 'NETWORK');
      
      // For 500 errors, try to capture the response body
      if (response.status() === 500) {
        try {
          const text = await response.text();
          log(`Error response body: ${text.substring(0, 500)}...`, 'ERROR');
          
          // Save the full response to a file
          const errorResponsePath = path.join(logsDir, `error-response-${Date.now()}.html`);
          fs.writeFileSync(errorResponsePath, text);
          log(`Saved full error response to ${errorResponsePath}`, 'ERROR');
        } catch (err) {
          log(`Failed to capture error response: ${err.message}`, 'ERROR');
        }
      }
    }
  });
  
  // Run the debug submission
  try {
    log('Running debug submission test...', 'DEBUG');
    await submitForm(page, debugSubmission);
    
    // Capture DOM state after submission
    const html = await page.content();
    const htmlPath = path.join(logsDir, `page-after-submission-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, html);
    log(`Saved page HTML to ${htmlPath}`, 'DEBUG');
    
    // Check MongoDB for the submission
    log('Checking database for submission...', 'DEBUG');
    // This would require a MongoDB connection, which we're not implementing here
    // but would be useful for a complete debugging solution
    
    log('Debug test completed', 'DEBUG');
  } catch (error) {
    log(`Error in debug test: ${error.stack}`, 'ERROR');
  }
  
  log('All tests completed!', 'END');
  await browser.close();
  logger.end();
}

// Run the script
run().catch(error => {
  log(`Unhandled error: ${error.stack}`, 'FATAL');
  process.exit(1);
});
