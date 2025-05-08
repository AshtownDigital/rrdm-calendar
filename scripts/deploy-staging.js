/**
 * Staging Environment Deployment Script
 * 
 * This script deploys the RRDM application to the staging environment on Vercel.
 * It uses the Vercel CLI to deploy the application with the staging configuration.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set environment variables
process.env.NODE_ENV = 'staging';

// Log the deployment start
console.log('Starting staging deployment...');

// Path to the Vercel configuration file
const vercelConfigPath = path.join(__dirname, '..', 'vercel.staging.json');

// Check if the Vercel configuration file exists
if (!fs.existsSync(vercelConfigPath)) {
  console.error(`Error: Vercel configuration file not found at ${vercelConfigPath}`);
  process.exit(1);
}

try {
  // Run Vercel CLI command to deploy with the staging configuration
  console.log('Deploying to Vercel staging environment...');
  
  // Execute the Vercel CLI command
  const output = execSync(`npx vercel --confirm --prod -A ${vercelConfigPath}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('Staging deployment completed successfully!');
} catch (error) {
  console.error('Deployment failed:', error.message);
  process.exit(1);
}