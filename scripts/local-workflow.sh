#!/bin/bash

echo "Starting local workflow test..."

# Set environment variables
export NODE_ENV=test
export NODE_OPTIONS="--max-old-space-size=4096"

# Verify Node.js and npm versions
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Clean install dependencies
echo "Cleaning and installing dependencies..."
rm -rf node_modules package-lock.json
npm install

# Copy GOV.UK assets
echo "Copying GOV.UK assets..."
npm run copy-govuk-assets

# Run tests
echo "Running tests..."
npm run test:minimal -- --ci --colors --verbose --detectOpenHandles --forceExit --maxWorkers=2

# Run linting
echo "Running linting..."
npm run lint || echo "Linting completed with warnings/errors (allowed)"

echo "Local workflow test completed"
