/**
 * Prepare Build Script
 * This script prepares the application for deployment by:
 * 1. Ensuring all necessary directories exist
 * 2. Setting up environment variables
 * 3. Preparing assets for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Preparing build for deployment...');

// Ensure directories exist
const directories = [
  'public',
  'public/stylesheets',
  'public/scripts',
  'public/assets'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Copy necessary files for BCR module
try {
  console.log('Ensuring BCR module assets are available...');
  
  // Copy GOV.UK Frontend assets if they exist
  const govukSrcPath = path.join(__dirname, '..', 'node_modules', 'govuk-frontend', 'dist', 'assets');
  const govukDestPath = path.join(__dirname, '..', 'public', 'assets');
  
  if (fs.existsSync(govukSrcPath)) {
    console.log('Copying GOV.UK Frontend assets...');
    // Create a recursive copy function since fs.cpSync might not be available in all Node versions
    const copyRecursive = (src, dest) => {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();
      
      if (isDirectory) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItemName => {
          copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    
    copyRecursive(govukSrcPath, govukDestPath);
  }
  
  // Copy stylesheets if they exist
  const stylesheetsPath = path.join(__dirname, '..', 'public', 'stylesheets');
  if (!fs.existsSync(path.join(stylesheetsPath, 'application.css'))) {
    console.log('Creating basic stylesheet...');
    const cssContent = `/* Base application styles */
.app-card {
  padding: 20px;
  background-color: #f8f8f8;
  border: 1px solid #ddd;
  margin-bottom: 20px;
  border-radius: 4px;
}

.app-card--green { border-left: 4px solid #00703c; }
.app-card--blue { border-left: 4px solid #1d70b8; }
.app-card--red { border-left: 4px solid #d4351c; }
.app-card--orange { border-left: 4px solid #f47738; }
.app-card--purple { border-left: 4px solid #4c2c92; }
.app-card--turquoise { border-left: 4px solid #28a197; }
.app-card--grey { border-left: 4px solid #505a5f; }
`;
    fs.writeFileSync(path.join(stylesheetsPath, 'application.css'), cssContent);
  }
  
  // Make sure the consolidated.js file is up to date
  const apiDir = path.join(__dirname, '..', 'api');
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }
  
  // Check if we need to update the consolidated.js file
  const consolidatedPath = path.join(apiDir, 'consolidated.js');
  if (!fs.existsSync(consolidatedPath)) {
    console.log('Creating consolidated.js for serverless deployment');
    // Create a basic consolidated.js if it doesn't exist
    const consolidatedContent = `// Consolidated serverless entry point
const serverless = require('serverless-http');
const app = require('../server');

// Export the serverless handler
module.exports = serverless(app);
`;
    fs.writeFileSync(consolidatedPath, consolidatedContent);
  }
  
  console.log('✅ Build preparation complete!');
} catch (error) {
  console.error('❌ Error during build preparation:', error);
  process.exit(1);
}
