# RRDM Testing Guide

## Overview

This document outlines the testing approach for the RRDM (Reference Data Management System) project, including how to run tests, the structure of mocks, and strategies for fixing test issues.

## Test Configuration

We have multiple Jest configurations:

1. **Default Configuration** (`jest.config.js`): The main configuration for all tests.
2. **Minimal Configuration** (`jest.minimal.config.js`): A simplified configuration that only runs the minimal test to verify the test infrastructure works.

## Running Tests

```bash
# Run all tests (may fail until all mocks are properly set up)
npm test

# Run only the minimal test (guaranteed to work)
npm run test:minimal

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

## Mock Structure

We've created comprehensive mocks for external dependencies to isolate tests:

### Core Mocks

- **Prisma Client** (`mocks/prisma.js`): Mocks the Prisma ORM client with common methods and models.
- **Redis** (`mocks/ioredis.js`): Mocks the Redis client with common Redis commands.
- **Mongoose** (`mocks/mongoose.js`): Mocks Mongoose ODM with Schema and Model classes.
- **Database Config** (`mocks/database.js`): Mocks database configuration modules.
- **Prisma Session Store** (`mocks/prisma-session-store.js`): Mocks the session store.

### Setup Files

- **Minimal Setup** (`tests/minimal-setup.js`): A clean setup file that properly initializes Jest globals and mocks.

## Troubleshooting Common Test Issues

1. **Missing Module Errors**: Ensure the module is properly mocked in the appropriate mock file and mapped in `jest.config.js`.

2. **Reference Errors for Jest Globals**: Make sure tests are using the proper setup file that exports Jest globals.

3. **Mock Factory Errors**: If you see errors about out-of-scope variables in mock factories, ensure all dependencies are properly imported within the mock.

4. **Database Connection Errors**: All database connections should be mocked to prevent actual connections during tests.

## CI/CD Integration

The GitHub Actions workflow is configured to:

1. Run the minimal tests as part of the CI pipeline.
2. Deploy to staging and production environments when tests pass.

## Incremental Testing Strategy

We're using an incremental approach to fix tests:

1. Start with the minimal test to ensure the test infrastructure works.
2. Gradually add more tests as mocks are improved.
3. Use `testPathIgnorePatterns` in Jest config to temporarily skip problematic test paths.

## Best Practices

1. Always keep mocks up-to-date with the actual implementations they're mocking.
2. Use explicit mocks for external dependencies to isolate tests.
3. Ensure environment variables are properly set in test setup files.
4. Add new mocks as new dependencies are introduced.
