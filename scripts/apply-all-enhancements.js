/**
 * Apply All Enhancements Script
 * 
 * This script runs all enhancement scripts in the correct order.
 * It applies all the enhancements to the RRDM application.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths
const rootDir = path.resolve(__dirname, '..');
const scriptsDir = __dirname;

// Log function
function log(message) {
  console.log(`\n\x1b[36m${message}\x1b[0m`);
}

// Run script function
function runScript(scriptName) {
  const scriptPath = path.join(scriptsDir, scriptName);
  log(`Running ${scriptName}...`);
  execSync(`node ${scriptPath}`, { stdio: 'inherit' });
}

// Create logs directory if it doesn't exist
const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(logsDir)) {
  log('Creating logs directory...');
  fs.mkdirSync(logsDir);
}

// Main function
async function main() {
  try {
    log('Starting enhancement application process...');
    
    // 1. Update dependencies
    runScript('update-dependencies.js');
    
    // 2. Standardize templates
    runScript('standardize-templates.js');
    
    // 3. Integrate enhancements
    runScript('integrate-enhancements.js');
    
    // 4. Generate API documentation
    runScript('generate-api-docs.js');
    
    // 5. Install dependencies
    log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: rootDir });
    
    log('All enhancements have been successfully applied!');
    log('Next steps:');
    log('1. Run database migrations: npx prisma migrate dev --name add_audit_logs');
    log('2. Restart the application: npm start');
    log('3. Access the API documentation at: /docs/api/html/index.html');
    
  } catch (error) {
    console.error('\x1b[31mError applying enhancements:\x1b[0m', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
