module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  maxWorkers: '50%',
  maxConcurrency: 1, // Reduce concurrency for integration tests
  testTimeout: 30000, // Increase timeout for integration tests
  detectOpenHandles: true,
  forceExit: true,
  // Add verbose output to help debug test issues
  verbose: true
};
