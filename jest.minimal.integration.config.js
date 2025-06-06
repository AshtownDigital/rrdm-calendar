/**
 * Minimal Jest configuration for integration tests
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/redis-manager.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$|@prisma|ioredis|express|passport|http-errors|connect-mongo|@quixo3/prisma-session-store))'
  ],
  verbose: true
};
