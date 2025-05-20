const { Before, After, Status } = require('@cucumber/cucumber');
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Before each scenario
Before({ timeout: 60 * 1000 }, async function(scenario) {
  try {
    console.log('\n=== Starting new scenario ===');
    
    // Safely get the scenario name
    const scenarioName = scenario.pickle && scenario.pickle.name 
      ? scenario.pickle.name 
      : 'Unknown Scenario';
    console.log(`Scenario: ${scenarioName}`);
    
    // Store the scenario name for later use
    this.scenarioName = scenarioName;
    
    // Initialize the browser and page
    await this.init();
    
    // Set a longer default timeout for all actions in this scenario
    if (this.page) {
      await this.page.setDefaultTimeout(30000);
      await this.page.setDefaultNavigationTimeout(45000);
      console.log('Browser and page initialized for scenario');
    } else {
      console.error('Failed to initialize page in Before hook');
      throw new Error('Page initialization failed');
    }
  } catch (error) {
    console.error('Error in Before hook:', error);
    // If we have a page, take a screenshot of the failure
    if (this.page) {
      try {
        const screenshotPath = path.join(screenshotsDir, `before-hook-error-${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to: ${screenshotPath}`);
      } catch (screenshotError) {
        console.error('Failed to take screenshot in Before hook:', screenshotError);
      }
    }
    throw error; // Re-throw to fail the test
  }
});

// After each scenario
After({ timeout: 90 * 1000 }, async function(scenario) {
  console.log(`\n=== Scenario finished with status: ${scenario.result.status} ===`);
  
  try {
    // Safely get the scenario name
    const scenarioName = this.scenarioName || 
                       (scenario.pickle && scenario.pickle.name) || 
                       'unknown-scenario';
    const safeScenarioName = scenarioName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    // Take a screenshot if the scenario failed and page is available
    if (scenario.result && scenario.result.status === Status.FAILED) {
      console.log(`Scenario failed with status: ${scenario.result.status}`);
      
      try {
        if (this.page) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const screenshotPath = path.join(screenshotsDir, `failure-${safeScenarioName}-${timestamp}.png`);
          
          console.log(`Taking screenshot of failure: ${screenshotPath}`);
          
          try {
            await this.page.screenshot({ 
              path: screenshotPath, 
              fullPage: true,
              timeout: 10000 // 10 second timeout for screenshot
            });
            
            console.log(`Screenshot saved to: ${screenshotPath}`);
            
            // Attach screenshot to the report
            try {
              const screenshot = fs.readFileSync(screenshotPath);
              this.attach(screenshot, 'image/png');
              console.log('Screenshot attached to report');
            } catch (readError) {
              console.error('Failed to read screenshot for report:', readError.message);
            }
            
            // Also capture the page HTML for debugging
            try {
              const htmlPath = screenshotPath.replace('.png', '.html');
              const pageContent = await this.page.content();
              fs.writeFileSync(htmlPath, pageContent);
              console.log(`Page HTML saved to: ${htmlPath}`);
            } catch (htmlError) {
              console.error('Failed to save page HTML:', htmlError.message);
            }
          } catch (screenshotError) {
            console.error('Failed to take screenshot:', screenshotError.message);
          }
        } else {
          console.log('No page available for screenshot');
        }
      } catch (error) {
        console.error('Error during failure handling:', error);
      }
    }
  } catch (error) {
    console.error('Error in After hook:', error);
  } finally {
    // Clean up browser resources with a timeout
    console.log('Cleaning up test resources...');
    const cleanupPromise = this.cleanup();
    
    // Set a timeout for cleanup to prevent hanging
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => {
        console.warn('Cleanup timed out after 30 seconds');
        resolve();
      }, 30000);
    });
    
    await Promise.race([cleanupPromise, timeoutPromise]);
    console.log('After hook completed');
  }
});
