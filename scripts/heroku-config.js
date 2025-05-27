#!/usr/bin/env node

/**
 * Heroku Configuration Script
 * 
 * This script sets up the necessary environment variables for Heroku deployment
 * and ensures the MongoDB connection is properly configured.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const APP_NAME = 'rrdm-9721c6bbaf86'; // Your Heroku app name

// Function to run Heroku CLI commands
function runHerokuCommand(command) {
  try {
    console.log(`Running: heroku ${command}`);
    const output = execSync(`heroku ${command}`, { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    console.error(`Error running Heroku command: ${error.message}`);
    return null;
  }
}

// Main function
async function configureHeroku() {
  try {
    console.log('🚀 Starting Heroku configuration');
    
    // Check if .env.production exists
    const envProdPath = path.join(__dirname, '..', '.env.production');
    if (!fs.existsSync(envProdPath)) {
      console.error('❌ .env.production file not found. Please create it with your production MongoDB URI.');
      process.exit(1);
    }
    
    // Read MongoDB URI from .env.production
    const envContent = fs.readFileSync(envProdPath, 'utf8');
    const mongoUriMatch = envContent.match(/MONGODB_URI=(.+)/);
    
    if (!mongoUriMatch) {
      console.error('❌ MONGODB_URI not found in .env.production file.');
      process.exit(1);
    }
    
    const mongoUri = mongoUriMatch[1].trim();
    
    // Set MongoDB URI in Heroku
    console.log('Setting MONGODB_URI in Heroku...');
    runHerokuCommand(`config:set MONGODB_URI="${mongoUri}" --app ${APP_NAME}`);
    
    // Set NODE_ENV to production
    console.log('Setting NODE_ENV to production...');
    runHerokuCommand(`config:set NODE_ENV=production --app ${APP_NAME}`);
    
    // Set SESSION_SECRET
    const sessionSecret = process.env.SESSION_SECRET || 
                         `rrdm-session-secret-${Math.random().toString(36).substring(2, 15)}`;
    console.log('Setting SESSION_SECRET...');
    runHerokuCommand(`config:set SESSION_SECRET="${sessionSecret}" --app ${APP_NAME}`);
    
    // Check current config
    console.log('Current Heroku config:');
    runHerokuCommand(`config --app ${APP_NAME}`);
    
    console.log('✅ Heroku configuration completed successfully');
    
  } catch (error) {
    console.error('❌ Error configuring Heroku:', error.message);
    process.exit(1);
  }
}

// Run the configuration
configureHeroku();
