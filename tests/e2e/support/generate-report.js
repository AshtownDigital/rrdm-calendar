const reporter = require('cucumber-html-reporter');
const path = require('path');
const fs = require('fs');

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Create an empty report file if it doesn't exist
const jsonReportFile = path.join(reportsDir, 'cucumber_report.json');
if (!fs.existsSync(jsonReportFile)) {
  fs.writeFileSync(jsonReportFile, '[]');
  console.log('Created empty report file');
}

// Define options for the HTML report
const options = {
  theme: 'bootstrap',
  jsonFile: jsonReportFile,
  output: path.join(reportsDir, 'cucumber_report.html'),
  reportSuiteAsScenarios: true,
  scenarioTimestamp: true,
  launchReport: true,
  metadata: {
    'App Version': 'RRDM 1.0.0',
    'Test Environment': process.env.NODE_ENV || 'development',
    'Browser': 'Chrome',
    'Platform': process.platform,
    'Parallel': 'Scenarios',
    'Executed': 'Local'
  }
};

try {
  // Generate the report
  reporter.generate(options);
  console.log('E2E Test Report generated successfully!');
} catch (error) {
  console.error('Error generating report:', error.message);
}
