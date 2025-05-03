/**
 * Main script to fetch all reference data
 * 
 * This script runs all the category-specific scripts to fetch all reference data
 */

const { exec } = require('child_process');
const path = require('path');

// Path to the scripts directory
const scriptsDir = __dirname;

// List of scripts to run
const scripts = [
  'fetch-countries.js',
  'fetch-academic-data.js',
  'fetch-equality-diversity-data.js',
  'fetch-qualifications-data.js',
  'fetch-itt-data.js'
];

/**
 * Run a script using Node.js
 * 
 * @param {string} scriptName - The name of the script to run
 * @returns {Promise<void>} - A promise that resolves when the script completes
 */
function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(scriptsDir, scriptName);
    console.log(`\n======= Running ${scriptName} =======\n`);
    
    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running ${scriptName}:`, error);
        reject(error);
        return;
      }
      
      console.log(stdout);
      
      if (stderr) {
        console.error(stderr);
      }
      
      console.log(`\n======= Completed ${scriptName} =======\n`);
      resolve();
    });
  });
}

/**
 * Run all scripts sequentially
 */
async function runAllScripts() {
  console.log('Starting to fetch all reference data...');
  console.log('This may take a few minutes depending on API availability.');
  console.log('=====================================================\n');
  
  try {
    for (const script of scripts) {
      await runScript(script);
    }
    
    console.log('\n=====================================================');
    console.log('All reference data fetched successfully!');
    console.log('You can now access all reference lists through the DFE Reference Data module.');
  } catch (error) {
    console.error('Error fetching reference data:', error);
    process.exit(1);
  }
}

// Run all scripts
runAllScripts();
