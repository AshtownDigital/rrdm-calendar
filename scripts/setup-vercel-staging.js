/**
 * Vercel Staging Environment Setup Script
 * 
 * This script helps set up the RRDM application for deployment to Vercel's staging environment.
 * It guides you through:
 * 1. Installing the Vercel CLI if needed
 * 2. Logging in to Vercel
 * 3. Setting up required environment variables as secrets
 * 4. Deploying the application to Vercel
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to execute commands
function executeCommand(command, options = {}) {
  try {
    return execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
      ...options
    });
  } catch (error) {
    if (options.ignoreError) {
      return null;
    }
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Helper function to ask questions
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

// Main function
async function setupVercelStaging() {
  console.log('\n🚀 RRDM Vercel Staging Environment Setup\n');
  console.log('This script will help you set up and deploy the RRDM application to Vercel staging.\n');

  // Step 1: Check if Vercel CLI is installed
  console.log('Checking if Vercel CLI is installed...');
  try {
    const vercelVersion = executeCommand('npx vercel --version', { silent: true });
    console.log(`✅ Vercel CLI is installed (${vercelVersion.trim()})`);
  } catch (error) {
    console.log('⚠️ Vercel CLI not found. Installing...');
    executeCommand('npm install -g vercel');
    console.log('✅ Vercel CLI installed');
  }

  // Step 2: Login to Vercel if needed
  console.log('\nChecking Vercel login status...');
  try {
    const isLoggedIn = executeCommand('npx vercel whoami', { silent: true, ignoreError: true });
    if (isLoggedIn && isLoggedIn.trim()) {
      console.log(`✅ Logged in to Vercel as ${isLoggedIn.trim()}`);
    } else {
      console.log('⚠️ Not logged in to Vercel. Please login:');
      executeCommand('npx vercel login');
    }
  } catch (error) {
    console.log('⚠️ Not logged in to Vercel. Please login:');
    executeCommand('npx vercel login');
  }

  // Step 3: Set up environment variables as secrets
  console.log('\n🔐 Setting up environment variables as Vercel secrets\n');
  console.log('You will need to provide the following information:');
  console.log('1. Neon PostgreSQL Database URL (for serverless compatibility)');
  console.log('2. Upstash Redis URL (for serverless compatibility)');
  console.log('3. Session Secret (for secure cookies)\n');

  // Get database URL
  const databaseUrl = await question('Enter your Neon PostgreSQL Database URL: ');
  if (!databaseUrl) {
    console.error('❌ Database URL is required');
    process.exit(1);
  }
  
  // Get Redis URL
  const redisUrl = await question('Enter your Upstash Redis URL (or press Enter to skip): ');
  
  // Generate session secret if not provided
  let sessionSecret = await question('Enter a session secret (or press Enter to generate one): ');
  if (!sessionSecret) {
    sessionSecret = require('crypto').randomBytes(32).toString('hex');
    console.log(`Generated session secret: ${sessionSecret}`);
  }

  // Set up Vercel secrets
  console.log('\nSetting up Vercel secrets...');
  
  // Remove existing secrets if they exist (to update them)
  console.log('Removing any existing secrets...');
  executeCommand('npx vercel secrets rm rrdm-database-url', { ignoreError: true, silent: true });
  executeCommand('npx vercel secrets rm rrdm-redis-url', { ignoreError: true, silent: true });
  executeCommand('npx vercel secrets rm rrdm-session-secret', { ignoreError: true, silent: true });
  
  // Add new secrets
  console.log('Adding new secrets...');
  executeCommand(`npx vercel secrets add rrdm-database-url "${databaseUrl}"`, { silent: true });
  console.log('✅ Added database URL secret');
  
  if (redisUrl) {
    executeCommand(`npx vercel secrets add rrdm-redis-url "${redisUrl}"`, { silent: true });
    console.log('✅ Added Redis URL secret');
  } else {
    console.log('⚠️ Skipped Redis URL secret');
  }
  
  executeCommand(`npx vercel secrets add rrdm-session-secret "${sessionSecret}"`, { silent: true });
  console.log('✅ Added session secret');

  // Step 4: Deploy to Vercel
  console.log('\n🚀 Ready to deploy to Vercel staging environment');
  const deploy = await question('Deploy now? (y/n): ');
  
  if (deploy.toLowerCase() === 'y' || deploy.toLowerCase() === 'yes') {
    console.log('\nDeploying to Vercel staging environment...');
    executeCommand('npm run deploy:staging');
    console.log('\n✅ Deployment complete!');
    
    // Get the deployment URL
    try {
      const deploymentUrl = executeCommand('npx vercel ls rrdm --json', { silent: true });
      const deployments = JSON.parse(deploymentUrl);
      if (deployments && deployments.length > 0) {
        console.log(`\n🌐 Your staging application is available at: https://${deployments[0].url}`);
      }
    } catch (error) {
      console.log('\nUse the Vercel dashboard to view your deployment URL.');
    }
  } else {
    console.log('\nDeployment skipped. You can deploy later using:');
    console.log('npm run deploy:staging');
  }

  console.log('\n🎉 Setup complete!');
  rl.close();
}

// Run the script
setupVercelStaging().catch(error => {
  console.error('Setup failed:', error);
  rl.close();
  process.exit(1);
});
