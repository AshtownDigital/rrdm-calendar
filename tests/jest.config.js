/**
 * Jest Configuration
 */
module.exports = {
  // The root directory that Jest should scan for tests and modules
  rootDir: '../',
  
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // An array of regexp pattern strings that are matched against all test paths
  // matched tests are skipped
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  
  // An array of regexp pattern strings that are matched against all source file paths
  // matched files will be covered
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**'
  ],
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Setup files to run before each test
  setupFilesAfterEnv: ['./tests/setup.js']
};
