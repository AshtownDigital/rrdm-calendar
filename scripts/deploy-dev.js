/**
 * Development Environment Deployment Script
 * 
 * This script deploys the RRDM application to the development environment on Vercel.
 * It uses the Vercel CLI to deploy the application with the development configuration.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set environment variables
process.env.NODE_ENV = 'development';

// Log the deployment start
console.log('Starting development deployment...');

// Path to the Vercel configuration file
const vercelConfigPath = path.join(__dirname, '..', 'vercel.development.json');

// Check if the Vercel configuration file exists
if (!fs.existsSync(vercelConfigPath)) {
  console.error(`Error: Vercel configuration file not found at ${vercelConfigPath}`);
  process.exit(1);
}

try {
  // Run Vercel CLI command to deploy with the development configuration
  console.log('Deploying to Vercel development environment...');
  
  // Execute the Vercel CLI command
  const output = execSync(`npx vercel --confirm --prod -A ${vercelConfigPath}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('Development deployment completed successfully!');
} catch (error) {
  console.error('Deployment failed:', error.message);
  process.exit(1);
}