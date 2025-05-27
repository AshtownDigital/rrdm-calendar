#!/usr/bin/env node

/**
 * Heroku Setup Script
 * 
 * This script helps configure the Heroku environment for the RRDM application.
 * It sets up the necessary environment variables and ensures MongoDB connection is properly configured.
 */

const { execSync } = require('child_process');

// Heroku app name
const APP_NAME = 'rrdm-9721c6bbaf86';

// Function to run Heroku CLI commands
function runHerokuCommand(command) {
  try {
    console.log(`Running: heroku ${command}`);
    return execSync(`heroku ${command}`, { encoding: 'utf8', stdio: 'inherit' });
  } catch (error) {
    console.error(`Error running Heroku command: ${error.message}`);
    return null;
  }
}

// Main function
async function setupHeroku() {
  try {
    console.log('🚀 Starting Heroku setup');
    
    // Check if we can access the Heroku app
    console.log(`Checking Heroku app: ${APP_NAME}`);
    runHerokuCommand(`apps:info --app ${APP_NAME}`);
    
    // Prompt for MongoDB Atlas connection string
    console.log('\n📋 Please enter your MongoDB Atlas connection string:');
    console.log('(Format: mongodb+srv://username:password@cluster.mongodb.net/database)');
    
    // This is just a placeholder - in a real scenario, you would use readline or another method to get user input
    console.log('\n⚠️ Since this is a script, you need to manually run the following command:');
    console.log(`heroku config:set MONGODB_URI="your-mongodb-atlas-uri" --app ${APP_NAME}`);
    
    // Set other environment variables
    console.log('\n🔧 Setting up other environment variables...');
    
    // Set NODE_ENV to production
    runHerokuCommand(`config:set NODE_ENV=production --app ${APP_NAME}`);
    
    // Set SESSION_SECRET
    const sessionSecret = `rrdm-session-secret-${Math.random().toString(36).substring(2, 15)}`;
    runHerokuCommand(`config:set SESSION_SECRET="${sessionSecret}" --app ${APP_NAME}`);
    
    // Display current config
    console.log('\n📊 Current Heroku configuration:');
    runHerokuCommand(`config --app ${APP_NAME}`);
    
    console.log('\n✅ Heroku setup completed');
    console.log('\n📝 Next steps:');
    console.log('1. Make sure you\'ve set the MONGODB_URI environment variable with your MongoDB Atlas connection string');
    console.log('2. Deploy your application to Heroku with: git push heroku main');
    console.log('3. Open your application with: heroku open --app ' + APP_NAME);
    
  } catch (error) {
    console.error('❌ Error setting up Heroku:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupHeroku();
