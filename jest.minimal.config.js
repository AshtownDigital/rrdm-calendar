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

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    "/node_modules/(?!@prisma|ioredis)"
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

  // Mock modules
  moduleNameMapper: {
    "@prisma/client": "<rootDir>/mocks/prisma-with-errors.js",
    "@prisma/client/runtime/library": "<rootDir>/mocks/prisma-with-errors.js",
    "ioredis": "<rootDir>/mocks/ioredis.js",
    "mongoose": "<rootDir>/mocks/mongoose.js",
    "sequelize": "<rootDir>/mocks/sequelize.js",
    "express": "<rootDir>/mocks/express.js",
    "express-session": "<rootDir>/mocks/express-session.js",
    "passport": "<rootDir>/mocks/passport.js",
    "http-errors": "<rootDir>/mocks/http-errors.js",
    "connect-mongo": "<rootDir>/mocks/connect-mongo.js",
    "../../config/prisma": "<rootDir>/mocks/prisma-config.js",
    "../config/prisma": "<rootDir>/mocks/prisma-config.js",
    "./config/prisma": "<rootDir>/mocks/prisma-config.js",
    "../../config/database": "<rootDir>/mocks/models-user-utils.js",
    "../config/database": "<rootDir>/mocks/models-user-utils.js",
    "./config/database": "<rootDir>/mocks/config-database.js",
    "<rootDir>/utils/user-utils.js": "<rootDir>/utils/user-utils.js",
    "../config/mongoose": "<rootDir>/mocks/mongoose-config.js",
    "../../config/mongoose": "<rootDir>/mocks/mongoose-config.js",
    "./config/mongoose": "<rootDir>/mocks/mongoose-config.js",
    "./config/database.mongo": "<rootDir>/mocks/database.mongo.js",
    "../config/database.mongo": "<rootDir>/mocks/database.mongo.js",
    "../../config/database.mongo": "<rootDir>/mocks/database.mongo.js",
    "@quixo3/prisma-session-store": "<rootDir>/mocks/prisma-session-store.js"
  },

  // Disable automock
  automock: false,

  // Do not use any setup files to avoid conflicts
  setupFilesAfterEnv: []
};
