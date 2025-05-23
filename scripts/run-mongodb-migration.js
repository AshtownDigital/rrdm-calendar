/**
 * Run MongoDB Migration Script
 * 
 * This script guides you through the process of migrating data from PostgreSQL to MongoDB.
 * It helps set up the MongoDB connection, test it, and run the migration.
 */
const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run a command and return its output
function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('=== RRDM MongoDB Migration Tool ===');
  console.log('This tool will help you migrate your data from PostgreSQL to MongoDB.');
  
  // Step 1: Check MongoDB connection
  console.log('\nStep 1: Checking MongoDB connection...');
  
  // Check if MongoDB password is set in .env
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes('MONGODB_URI=') && !envContent.includes('<db_password>')) {
    console.log('✅ MongoDB connection string found in .env file');
  } else {
    console.log('❌ MongoDB connection string not properly configured in .env file');
    
    const setupPassword = await prompt('Would you like to set up your MongoDB password now? (y/n): ');
    
    if (setupPassword.toLowerCase() === 'y') {
      console.log('\nRunning MongoDB password setup script...');
      runCommand('node scripts/set-mongo-password.js');
    } else {
      console.log('\n⚠️ You need to configure your MongoDB connection before proceeding.');
      console.log('Please run: node scripts/set-mongo-password.js');
      rl.close();
      return;
    }
  }
  
  // Step 2: Test MongoDB connection
  console.log('\nStep 2: Testing MongoDB connection...');
  const testConnection = await prompt('Would you like to test the MongoDB connection? (y/n): ');
  
  if (testConnection.toLowerCase() === 'y') {
    console.log('\nRunning MongoDB connection test...');
    runCommand('node scripts/test-mongo-connection.js');
  }
  
  // Step 3: Run the migration
  console.log('\nStep 3: Running the migration...');
  console.log('You can migrate all entities or select specific ones to migrate.');
  console.log('Available entities: users, bcrconfigs, submissions, bcrs, workflowphases, impactedareas, fundings');
  
  const migrateAll = await prompt('Would you like to migrate all entities? (y/n): ');
  
  if (migrateAll.toLowerCase() === 'y') {
    console.log('\nMigrating all entities...');
    
    const overwrite = await prompt('Would you like to overwrite existing data? (y/n): ');
    
    if (overwrite.toLowerCase() === 'y') {
      console.log('\nRunning migration with overwrite...');
      runCommand('node scripts/migrate-to-mongodb.js --overwrite');
    } else {
      console.log('\nRunning migration without overwrite...');
      runCommand('node scripts/migrate-to-mongodb.js');
    }
  } else {
    const entity = await prompt('Which entity would you like to migrate? (e.g., users, bcrconfigs, bcrs): ');
    
    const overwrite = await prompt('Would you like to overwrite existing data? (y/n): ');
    
    if (overwrite.toLowerCase() === 'y') {
      console.log(`\nMigrating ${entity} with overwrite...`);
      runCommand(`node scripts/migrate-to-mongodb.js --entity=${entity} --overwrite`);
    } else {
      console.log(`\nMigrating ${entity} without overwrite...`);
      runCommand(`node scripts/migrate-to-mongodb.js --entity=${entity}`);
    }
  }
  
  // Step 4: Verify migration
  console.log('\nStep 4: Verifying migration...');
  console.log('To verify the migration, you can run the application with MongoDB.');
  
  const verifyMigration = await prompt('Would you like to update your application to use MongoDB instead of PostgreSQL? (y/n): ');
  
  if (verifyMigration.toLowerCase() === 'y') {
    console.log('\nUpdating application configuration...');
    
    // Create a backup of the current config
    const configPath = path.join(__dirname, '..', 'config', 'index.js');
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, `${configPath}.bak`);
      console.log('✅ Created backup of current configuration');
    }
    
    // Create a new config file that uses MongoDB
    const configContent = `/**
 * Application configuration
 * Using MongoDB for data storage
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isStaging: process.env.NODE_ENV === 'staging',
  isDev: process.env.NODE_ENV === 'development',
  isServerless: process.env.VERCEL === '1',
  database: {
    type: 'mongodb',
    url: process.env.MONGODB_URI
  },
  session: {
    secret: process.env.SESSION_SECRET || 'rrdm-secret-key',
    resave: false,
    saveUninitialized: true
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  }
};`;
    
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Updated application configuration to use MongoDB');
    
    console.log('\nYou can now run the application with MongoDB:');
    console.log('npm run dev');
  }
  
  console.log('\n=== Migration Process Complete ===');
  console.log('Your data has been migrated from PostgreSQL to MongoDB.');
  console.log('You can now use MongoDB as your primary database for the RRDM application.');
  
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  rl.close();
});
