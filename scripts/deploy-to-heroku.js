/**
 * Heroku Deployment Script
 * This script helps deploy the RRDM application to a specific Heroku app
 */
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Available Heroku apps
const apps = {
  'rrdm': 'production',
  'rrdm-stage-app': 'staging'
};

// Function to execute shell commands
function executeCommand(command) {
  try {
    console.log(`Executing: ${command}`);
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    return null;
  }
}

// Main deployment function
async function deploy() {
  console.log('RRDM Heroku Deployment Script');
  console.log('============================\n');
  
  // List available apps
  console.log('Available Heroku apps:');
  Object.entries(apps).forEach(([app, env]) => {
    console.log(`- ${app} (${env})`);
  });
  
  // Prompt for app selection
  const appName = await new Promise(resolve => {
    rl.question('\nEnter the app name to deploy to (rrdm or rrdm-stage-app): ', answer => {
      resolve(answer.trim());
    });
  });
  
  if (!apps[appName]) {
    console.error(`Error: Invalid app name "${appName}". Must be one of: ${Object.keys(apps).join(', ')}`);
    rl.close();
    return;
  }
  
  const environment = apps[appName];
  console.log(`\nDeploying to ${appName} (${environment})...\n`);
  
  // Check if we're on the correct git branch
  const currentBranch = executeCommand('git branch --show-current').trim();
  const deployBranch = environment === 'production' ? 'main' : 'staging';
  
  if (currentBranch !== deployBranch) {
    const proceed = await new Promise(resolve => {
      rl.question(`Warning: You are on branch "${currentBranch}" but deploying to "${environment}" typically uses "${deployBranch}". Continue? (y/n): `, answer => {
        resolve(answer.toLowerCase() === 'y');
      });
    });
    
    if (!proceed) {
      console.log('Deployment cancelled.');
      rl.close();
      return;
    }
  }
  
  // Set environment variables
  console.log('\nSetting environment variables...');
  
  // Common environment variables
  const commonEnvVars = [
    'NODE_ENV=' + environment,
    'SESSION_SECRET=your_session_secret_here' // Replace with your actual secret
  ];
  
  // Environment-specific variables
  const envVars = {
    'production': [
      'MONGODB_URI=mongodb+srv://your_mongodb_uri_for_production' // Replace with your actual URI
    ],
    'staging': [
      'MONGODB_URI=mongodb+srv://your_mongodb_uri_for_staging' // Replace with your actual URI
    ]
  };
  
  // Set the environment variables
  const allEnvVars = [...commonEnvVars, ...envVars[environment]];
  
  for (const envVar of allEnvVars) {
    const [key, value] = envVar.split('=');
    console.log(`Setting ${key}...`);
    executeCommand(`heroku config:set ${key}=${value} --app ${appName}`);
  }
  
  // Deploy to Heroku
  console.log('\nDeploying to Heroku...');
  const remote = environment === 'production' ? 'heroku' : 'staging';
  executeCommand(`git push ${remote} ${currentBranch}:main`);
  
  console.log('\nDeployment completed!');
  console.log(`\nTo view logs, run: heroku logs --tail --app ${appName}`);
  
  rl.close();
}

// Run the deployment
deploy().catch(error => {
  console.error('Deployment failed:', error);
  rl.close();
  process.exit(1);
});
