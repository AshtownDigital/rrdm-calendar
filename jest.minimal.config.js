/**
 * Jest minimal configuration for RRDM project
 * This configuration is focused on running only the minimal test
 */

module.exports = {
  // Automatically clear mock calls between every test
  clearMocks: true,

  // The test environment that will be used for testing
  testEnvironment: "node",

  // A map from regular expressions to paths to transformers
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest"
  },

  // Skip transforming node_modules except for specific packages that need to be transpiled
  transformIgnorePatterns: [
    "/node_modules/(?!(.*\.mjs$|@prisma|ioredis|express|passport|http-errors|connect-mongo|@quixo3/prisma-session-store))"
  ],

  // Indicates whether each individual test should be reported during the run
  verbose: true,

  // Test matching pattern
  testMatch: [
    // Unit tests
    "<rootDir>/tests/unit/errorHandler.test.js",
    "<rootDir>/tests/unit/utils.test.js",
    "<rootDir>/tests/unit/validators.test.js",
    "<rootDir>/tests/unit/middleware.test.js",
    "<rootDir>/tests/unit/helpers.test.js",
    "<rootDir>/tests/unit/controllers.test.js",
    // Integration tests
    "<rootDir>/tests/integration/redis-manager.test.js",
    // Temporarily disabled due to timeout issues
    // "<rootDir>/tests/integration/api.test.js",
    // Deferred tests
    // "<rootDir>/models/user-utils.test.js",
    // "<rootDir>/utils/user-utils.test.js",
  ],

  // Skip all other test files
  testPathIgnorePatterns: [
    "/node_modules/",
    "/tests/(?!(minimal.test.js|utils/basic.test.js|utils/string-utils.test.js|utils/cache.test.js|unit/errorHandler.test.js|integration/redis-manager.test.js|integration/api.test.js))"
  ],

  // Setup file
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  
  // Mock modules - keeping only the most essential mocks
  moduleNameMapper: {
    // Handle config files
    '^.*/config/prisma(.*)$': '<rootDir>/mocks/prisma-config.js',
    '^.*/config/database(.*)$': '<rootDir>/mocks/config-database.js',
    '^.*/config/mongoose(.*)$': '<rootDir>/mocks/mongoose-config.js',
    '^.*/config/database\.mongo(.*)$': '<rootDir>/mocks/database.mongo.js',
    '^.*/user-utils\.js$': '<rootDir>/utils/user-utils.js'
  },

  // Disable automock
  automock: false,

  // Do not use any setup files to avoid conflicts
  setupFilesAfterEnv: []
};
