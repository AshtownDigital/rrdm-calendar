/**
 * Minimal Jest configuration for workflowController tests
 */
module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // The test environment that will be used for testing
  testEnvironment: "node",
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    "**/workflowController.test.js"
  ],
  
  // Don't use any setup files that might be causing issues
  setupFilesAfterEnv: [],
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Don't ignore any test paths
  testPathIgnorePatterns: []
};
