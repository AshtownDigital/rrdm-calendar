/**
 * BCR Module - Automated UAT Test Script
 * 
 * This script automates many of the test cases defined in the BCR UAT document.
 * It uses Puppeteer to simulate user interactions with the application.
 * 
 * Usage: node scripts/bcr-uat-automation.js
 * 
 * Prerequisites:
 * - npm install puppeteer chalk
 */

require('dotenv').config({ path: '.env.development' });
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const chalk = require('chalk');
const prisma = new PrismaClient();

// Configuration
const BASE_URL = 'http://localhost:4000';
const TEST_USER = {
  email: 'prod@email.com',
  password: 'password1254'
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

/**
 * Log a test result
 */
function logTest(id, description, status, notes = '') {
  const test = { id, description, status, notes };
  results.tests.push(test);
  
  let statusText;
  switch (status) {
    case 'PASSED':
      statusText = chalk.green('✓ PASSED');
      results.passed++;
      break;
    case 'FAILED':
      statusText = chalk.red('✗ FAILED');
      results.failed++;
      break;
    case 'SKIPPED':
      statusText = chalk.yellow('⚠ SKIPPED');
      results.skipped++;
      break;
    default:
      statusText = status;
  }
  
  console.log(`${chalk.bold(`[${id}]`)} ${description}: ${statusText}${notes ? ` - ${notes}` : ''}`);
}

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n' + chalk.bold('Test Summary:'));
  console.log(chalk.green(`Passed: ${results.passed}`));
  console.log(chalk.red(`Failed: ${results.failed}`));
  console.log(chalk.yellow(`Skipped: ${results.skipped}`));
  console.log(chalk.bold(`Total: ${results.passed + results.failed + results.skipped}`));
  
  if (results.failed > 0) {
    console.log('\n' + chalk.bold('Failed Tests:'));
    results.tests
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        console.log(`${chalk.bold(`[${test.id}]`)} ${test.description}: ${chalk.red('FAILED')} - ${test.notes}`);
      });
  }
}

/**
 * Run the automated UAT tests
 */
async function runTests() {
  console.log(chalk.bold('Starting BCR Module Automated UAT Tests'));
  console.log(chalk.gray(`Application URL: ${BASE_URL}`));
  console.log(chalk.gray(`Test User: ${TEST_USER.email}`));
  
  let browser;
  let page;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--window-size=1280,800']
    });
    
    page = await browser.newPage();
    
    // Set default navigation timeout
    page.setDefaultNavigationTimeout(10000);
    
    // Test 1.1: Access BCR module without authentication
    try {
      await page.goto(`${BASE_URL}/bcr`);
      const url = page.url();
      
      if (url.includes('/login')) {
        logTest('1.1', 'Access BCR module without authentication', 'PASSED', 'Redirected to login page');
      } else {
        logTest('1.1', 'Access BCR module without authentication', 'FAILED', `Expected redirect to login, got: ${url}`);
      }
    } catch (error) {
      logTest('1.1', 'Access BCR module without authentication', 'FAILED', error.message);
    }
    
    // Test 1.2: Login with valid credentials
    try {
      await page.goto(`${BASE_URL}/login`);
      await page.type('input[name="email"]', TEST_USER.email);
      await page.type('input[name="password"]', TEST_USER.password);
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation()
      ]);
      
      const url = page.url();
      if (url.includes('/dashboard') || url === `${BASE_URL}/`) {
        logTest('1.2', 'Login with valid credentials', 'PASSED', 'Redirected to dashboard');
      } else {
        logTest('1.2', 'Login with valid credentials', 'FAILED', `Expected redirect to dashboard, got: ${url}`);
      }
    } catch (error) {
      logTest('1.2', 'Login with valid credentials', 'FAILED', error.message);
    }
    
    // Test 1.3: Access BCR module after authentication
    try {
      await page.goto(`${BASE_URL}/bcr`);
      const url = page.url();
      
      if (url === `${BASE_URL}/bcr`) {
        const title = await page.title();
        if (title.includes('BCR') || title.includes('Business Change Request')) {
          logTest('1.3', 'Access BCR module after authentication', 'PASSED', 'BCR module loaded');
        } else {
          logTest('1.3', 'Access BCR module after authentication', 'FAILED', `Expected BCR title, got: ${title}`);
        }
      } else {
        logTest('1.3', 'Access BCR module after authentication', 'FAILED', `Expected /bcr, got: ${url}`);
      }
    } catch (error) {
      logTest('1.3', 'Access BCR module after authentication', 'FAILED', error.message);
    }
    
    // Test 2.1: View BCR list
    try {
      await page.goto(`${BASE_URL}/bcr`);
      
      // Check if BCR table exists
      const tableExists = await page.evaluate(() => {
        const table = document.querySelector('table');
        return !!table;
      });
      
      if (tableExists) {
        // Check if table has data
        const rowCount = await page.evaluate(() => {
          const rows = document.querySelectorAll('table tbody tr');
          return rows.length;
        });
        
        if (rowCount > 0) {
          logTest('2.1', 'View BCR list', 'PASSED', `Found ${rowCount} BCRs in the list`);
        } else {
          logTest('2.1', 'View BCR list', 'FAILED', 'BCR table exists but has no data');
        }
      } else {
        logTest('2.1', 'View BCR list', 'FAILED', 'BCR table not found');
      }
    } catch (error) {
      logTest('2.1', 'View BCR list', 'FAILED', error.message);
    }
    
    // Test 3.1: Access BCR creation form
    try {
      await page.goto(`${BASE_URL}/bcr`);
      
      // Look for "Create New BCR" button and click it
      const createButtonExists = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('a, button'));
        return buttons.some(button => 
          button.textContent.includes('Create') && 
          button.textContent.includes('BCR')
        );
      });
      
      if (createButtonExists) {
        await Promise.all([
          page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('a, button'));
            const createButton = buttons.find(button => 
              button.textContent.includes('Create') && 
              button.textContent.includes('BCR')
            );
            createButton.click();
          }),
          page.waitForNavigation()
        ]);
        
        const url = page.url();
        if (url.includes('/bcr/submit')) {
          // Check if form elements exist
          const formExists = await page.evaluate(() => {
            const titleInput = document.querySelector('input[name="title"]');
            const submitButton = document.querySelector('button[type="submit"]');
            return !!titleInput && !!submitButton;
          });
          
          if (formExists) {
            logTest('3.1', 'Access BCR creation form', 'PASSED', 'BCR creation form loaded');
          } else {
            logTest('3.1', 'Access BCR creation form', 'FAILED', 'BCR creation form elements not found');
          }
        } else {
          logTest('3.1', 'Access BCR creation form', 'FAILED', `Expected /bcr/submit, got: ${url}`);
        }
      } else {
        logTest('3.1', 'Access BCR creation form', 'SKIPPED', 'Create BCR button not found');
      }
    } catch (error) {
      logTest('3.1', 'Access BCR creation form', 'FAILED', error.message);
    }
    
    // Test 3.2: Submit form without required fields
    try {
      await page.goto(`${BASE_URL}/bcr/submit`);
      
      // Submit the form without filling required fields
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {})
      ]);
      
      // Check if error message is displayed
      const errorExists = await page.evaluate(() => {
        const errorElements = Array.from(document.querySelectorAll('.error, .alert-danger, .text-danger'));
        return errorElements.some(el => el.textContent.includes('required'));
      });
      
      if (errorExists) {
        logTest('3.2', 'Submit form without required fields', 'PASSED', 'Validation error displayed');
      } else {
        logTest('3.2', 'Submit form without required fields', 'FAILED', 'No validation error displayed');
      }
    } catch (error) {
      logTest('3.2', 'Submit form without required fields', 'FAILED', error.message);
    }
    
    // Test 3.3: Create BCR with minimum required fields
    try {
      await page.goto(`${BASE_URL}/bcr/submit`);
      
      // Fill in minimum required fields
      await page.type('input[name="title"]', `Test BCR ${new Date().toISOString()}`);
      
      // Select medium priority if dropdown exists
      const priorityExists = await page.evaluate(() => {
        return !!document.querySelector('select[name="priority"]');
      });
      
      if (priorityExists) {
        await page.select('select[name="priority"]', 'medium');
      }
      
      // Submit the form
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation()
      ]);
      
      // Check if redirected to BCR detail or list view
      const url = page.url();
      if (url.includes('/bcr/') && !url.includes('/submit')) {
        logTest('3.3', 'Create BCR with minimum required fields', 'PASSED', 'BCR created successfully');
      } else {
        logTest('3.3', 'Create BCR with minimum required fields', 'FAILED', `Expected redirect to BCR detail, got: ${url}`);
      }
    } catch (error) {
      logTest('3.3', 'Create BCR with minimum required fields', 'FAILED', error.message);
    }
    
    // Get a sample BCR for testing detail view and editing
    let sampleBcr;
    try {
      sampleBcr = await prisma.bcrs.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      
      if (sampleBcr) {
        console.log(chalk.gray(`Using sample BCR for testing: ${sampleBcr.bcrNumber} - ${sampleBcr.title}`));
      } else {
        console.log(chalk.yellow('No sample BCR found for testing detail view and editing'));
      }
    } catch (error) {
      console.error('Error getting sample BCR:', error);
    }
    
    // Test 4.1: View BCR details
    if (sampleBcr) {
      try {
        await page.goto(`${BASE_URL}/bcr/${sampleBcr.id}`);
        
        // Check if BCR details are displayed
        const detailsExist = await page.evaluate((bcrNumber, bcrTitle) => {
          const content = document.body.textContent;
          return content.includes(bcrNumber) && content.includes(bcrTitle);
        }, sampleBcr.bcrNumber, sampleBcr.title);
        
        if (detailsExist) {
          logTest('4.1', 'View BCR details', 'PASSED', `BCR details displayed for ${sampleBcr.bcrNumber}`);
        } else {
          logTest('4.1', 'View BCR details', 'FAILED', 'BCR details not found on page');
        }
      } catch (error) {
        logTest('4.1', 'View BCR details', 'FAILED', error.message);
      }
    } else {
      logTest('4.1', 'View BCR details', 'SKIPPED', 'No sample BCR available');
    }
    
    // Test 5.1: Access BCR edit form
    if (sampleBcr) {
      try {
        await page.goto(`${BASE_URL}/bcr/${sampleBcr.id}`);
        
        // Look for "Edit" button and click it
        const editButtonExists = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('a, button'));
          return buttons.some(button => 
            button.textContent.includes('Edit')
          );
        });
        
        if (editButtonExists) {
          await Promise.all([
            page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('a, button'));
              const editButton = buttons.find(button => 
                button.textContent.includes('Edit')
              );
              editButton.click();
            }),
            page.waitForNavigation()
          ]);
          
          const url = page.url();
          if (url.includes(`/bcr/edit/${sampleBcr.id}`)) {
            // Check if form is pre-populated
            const titleValue = await page.evaluate(() => {
              const titleInput = document.querySelector('input[name="title"]');
              return titleInput ? titleInput.value : '';
            });
            
            if (titleValue && titleValue === sampleBcr.title) {
              logTest('5.1', 'Access BCR edit form', 'PASSED', 'BCR edit form loaded with pre-populated data');
            } else {
              logTest('5.1', 'Access BCR edit form', 'FAILED', 'BCR edit form not pre-populated correctly');
            }
          } else {
            logTest('5.1', 'Access BCR edit form', 'FAILED', `Expected /bcr/edit/${sampleBcr.id}, got: ${url}`);
          }
        } else {
          logTest('5.1', 'Access BCR edit form', 'SKIPPED', 'Edit button not found');
        }
      } catch (error) {
        logTest('5.1', 'Access BCR edit form', 'FAILED', error.message);
      }
    } else {
      logTest('5.1', 'Access BCR edit form', 'SKIPPED', 'No sample BCR available');
    }
    
    // Test 10.1: Access non-existent BCR
    try {
      await page.goto(`${BASE_URL}/bcr/non-existent-id`);
      
      // Check if 404 error is displayed
      const notFoundExists = await page.evaluate(() => {
        const content = document.body.textContent;
        return content.includes('Not Found') || content.includes('404');
      });
      
      if (notFoundExists) {
        logTest('10.1', 'Access non-existent BCR', 'PASSED', '404 Not Found page displayed');
      } else {
        logTest('10.1', 'Access non-existent BCR', 'FAILED', '404 Not Found page not displayed');
      }
    } catch (error) {
      logTest('10.1', 'Access non-existent BCR', 'FAILED', error.message);
    }
    
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Print test summary
    printSummary();
    
    // Close browser
    if (browser) {
      await browser.close();
    }
    
    // Close Prisma connection
    await prisma.$disconnect();
  }
}

// Run the tests
runTests();
