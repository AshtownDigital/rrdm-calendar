/**
 * Puppeteer-based test script to verify calendar loading
 */
const puppeteer = require('puppeteer');

async function testCalendar() {
  console.log('Starting calendar load test with Puppeteer');
  
  // Launch the browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless operation
    args: ['--no-sandbox']
  });
  
  // Array to collect console logs
  const consoleLogs = [];
  
  try {
    console.log('Browser launched, creating new page...');
    const page = await browser.newPage();
    
    // Enable more detailed logging
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('fullcalendar')) {
        console.log('Resource request:', request.url());
      }
      request.continue();
    });
    
    // Listen to console events
    page.on('console', message => {
      const text = message.text();
      consoleLogs.push(`[${message.type()}] ${text}`);
      if (message.type() === 'error') {
        console.error(`Browser console error: ${text}`);
      } else if (text.includes('Error') || text.includes('error')) {
        console.warn(`Browser console warning: ${text}`);
      }
    });
    
    // Configure viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to simple calendar page...');
    // Test our simplified calendar page first
    const simpleResponse = await page.goto('http://localhost:3001/debug/simple-calendar', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    if (simpleResponse.ok()) {
      console.log('✅ Simple calendar page loaded successfully');
    } else {
      console.error('❌ Failed to load simple calendar page:', simpleResponse.status());
    }
    
    // Check if FullCalendar rendered on the simple page
    try {
      await page.waitForSelector('.fc', { timeout: 10000 });
      console.log('✅ FullCalendar element found on simple calendar page');
      
      // Check for calendar events
      const simpleEvents = await page.$$('.fc-event');
      console.log(`✅ Found ${simpleEvents.length} events on simple calendar`);
      
      // Take screenshot of simple calendar
      await page.screenshot({ path: './public/simple-calendar-screenshot.png' });
      console.log('Screenshot saved for simple calendar');
    } catch (error) {
      console.error('❌ Calendar elements not found on simple page:', error.message);
    }
    
    // Wait before next test
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Navigating to fully standalone calendar test page...');
    // Test our fully standalone HTML file
    const standaloneResponse = await page.goto('http://localhost:3001/test-calendar-standalone.html', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    if (standaloneResponse.ok()) {
      console.log('✅ Fully standalone calendar page loaded successfully');
    } else {
      console.error('❌ Failed to load fully standalone calendar page:', standaloneResponse.status());
    }
    
    // Check if FullCalendar rendered on the standalone page
    try {
      await page.waitForSelector('.fc', { timeout: 10000 });
      console.log('✅ FullCalendar element found on fully standalone page');
      
      // Check for calendar events
      const standaloneEvents = await page.$$('.fc-event');
      console.log(`✅ Found ${standaloneEvents.length} events on fully standalone calendar`);
      
      // Take screenshot of standalone calendar
      await page.screenshot({ path: './public/standalone-calendar-screenshot.png' });
      console.log('Screenshot saved for fully standalone calendar');
    } catch (error) {
      console.error('❌ Calendar elements not found on fully standalone page:', error.message);
    }
    
    // Wait before next test
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Navigating to static calendar test page...');
    // Next test our independent static test page
    const testPageResponse = await page.goto('http://localhost:3001/calendar-test.html', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    if (testPageResponse.ok()) {
      console.log('✅ Test calendar page loaded successfully');
    } else {
      console.error('❌ Failed to load test calendar page:', testPageResponse.status());
    }
    
    // Take a screenshot of the test page
    console.log('Taking screenshot of test calendar...');
    await page.screenshot({ path: './public/test-calendar-screenshot.png' });
    
    // Wait for 3 seconds to visually verify
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Navigating to actual release diary page...');
    // Now test the actual release diary page
    const diaryResponse = await page.goto('http://localhost:3001/release-diary', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    if (diaryResponse.ok()) {
      console.log('✅ Release diary page loaded successfully');
    } else {
      console.error('❌ Failed to load release diary page:', diaryResponse.status());
    }
    
    // Wait for the calendar to render (look for specific elements)
    try {
      // Wait for calendar container
      await page.waitForSelector('#release-calendar', { timeout: 5000 });
      console.log('✅ Calendar container found');
      
      // Check hidden data elements
      console.log('Checking hidden data elements...');
      const hasCalendarEvents = await page.evaluate(() => {
        const eventsEl = document.getElementById('calendar-events-data');
        const datesEl = document.getElementById('release-dates-data');
        
        return {
          eventsElementExists: !!eventsEl,
          datesElementExists: !!datesEl,
          eventsLength: eventsEl ? eventsEl.value.length : 0,
          datesLength: datesEl ? datesEl.value.length : 0,
          eventsStart: eventsEl ? eventsEl.value.substring(0, 100) : '',
          statusMessage: document.getElementById('calendar-status')?.textContent || 'Not found'
        };
      });
      console.log('Data elements check:', hasCalendarEvents);
      
      // Wait for calendar to initialize (check for FullCalendar element)
      console.log('Waiting for FullCalendar to initialize...');
      await page.waitForSelector('.fc', { timeout: 10000 })
        .then(() => console.log('✅ FullCalendar element found'))
        .catch(err => console.error('❌ FullCalendar element not found:', err.message));
      
      // Check if calendar events loaded
      const events = await page.$$('.fc-event');
      console.log(`${events.length > 0 ? '✅' : '❌'} Found ${events.length} calendar events`);
      
      // Take a screenshot of the release diary calendar
      console.log('Taking screenshot of release diary calendar...');
      await page.screenshot({ path: './public/release-diary-screenshot.png' });
      
      console.log('✅ Calendar test completed successfully!');
    } catch (error) {
      console.error('❌ Calendar elements not found or timed out:', error.message);
      await page.screenshot({ path: './public/release-diary-error-screenshot.png' });
    }
    
  } catch (error) {
    console.error('Error during calendar test:', error);
  } finally {
    // Print console logs
    console.log('\n=== BROWSER CONSOLE LOGS ===');
    if (consoleLogs.length > 0) {
      consoleLogs.forEach(log => console.log(log));
    } else {
      console.log('No console logs captured');
    }
    console.log('=== END CONSOLE LOGS ===\n');
    
    // Wait a few seconds before closing browser to allow viewing the results
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
    console.log('Browser closed. Test complete.');
  }
}

// Run the test
testCalendar().catch(console.error);
