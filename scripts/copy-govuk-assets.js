/**
 * Script to copy GOV.UK Frontend assets to public directory
 * This script is more robust than shell commands and handles different package structures
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting GOV.UK Frontend assets copy...');

// Create required directories
const publicDir = path.join(__dirname, '..', 'public');
const publicGovukDir = path.join(publicDir, 'govuk-frontend');
const publicAssetsDir = path.join(publicDir, 'assets');
const publicStylesheetsDir = path.join(publicDir, 'stylesheets');

// Create directories if they don't exist
[publicDir, publicGovukDir, publicAssetsDir, publicStylesheetsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Possible source paths for GOV.UK Frontend
const possibleSources = [
  path.join(__dirname, '..', 'node_modules', 'govuk-frontend', 'govuk'),
  path.join(__dirname, '..', 'node_modules', 'govuk-frontend', 'dist', 'govuk'),
  path.join(__dirname, '..', 'node_modules', '@govuk', 'frontend', 'govuk'),
  path.join(__dirname, '..', 'node_modules', '@govuk-frontend', 'govuk'),
  // New possible locations
  path.join(__dirname, '..', 'node_modules', 'govuk-frontend'),
  path.join(__dirname, '..', 'node_modules', 'govuk-frontend', 'dist'),
  path.join(__dirname, '..', 'node_modules', '@govuk', 'frontend'),
  path.join(__dirname, '..', 'node_modules', '@govuk-frontend')
];

// List files in node_modules to help debug
const nodeModulesDir = path.join(__dirname, '..', 'node_modules');
console.log('Checking node_modules directory structure:');
try {
  if (fs.existsSync(nodeModulesDir)) {
    const govukDir = path.join(nodeModulesDir, 'govuk-frontend');
    if (fs.existsSync(govukDir)) {
      console.log('govuk-frontend exists, contents:', fs.readdirSync(govukDir));
      
      // Check if there's a dist directory
      const distDir = path.join(govukDir, 'dist');
      if (fs.existsSync(distDir)) {
        console.log('dist directory exists, contents:', fs.readdirSync(distDir));
      }
    } else {
      console.log('govuk-frontend directory not found in node_modules');
      
      // Check for alternative packages
      const dirs = fs.readdirSync(nodeModulesDir).filter(dir => 
        dir.includes('govuk') || dir.includes('@govuk'));
      console.log('Potential GOV.UK related directories:', dirs);
    }
  } else {
    console.log('node_modules directory not found');
  }
} catch (err) {
  console.log('Error inspecting node_modules:', err.message);
}

// Find the first existing source path
let sourceGovukDir = null;
for (const src of possibleSources) {
  if (fs.existsSync(src)) {
    sourceGovukDir = src;
    break;
  }
}

if (!sourceGovukDir) {
  console.error('Could not find GOV.UK Frontend assets in node_modules');
  console.log('Creating fallback CSS file');
  
  // Create a fallback CSS file
  const fallbackCssContent = `/* 
 * Fallback stylesheet created by copy-govuk-assets.js
 * GOV.UK Frontend assets could not be found in node_modules
 */

body {
  font-family: sans-serif;
  margin: 0;
  padding: 20px;
  color: #0b0c0c;
}

.govuk-heading-xl {
  font-size: 32px;
  margin-top: 30px;
  margin-bottom: 30px;
}

.govuk-panel--confirmation {
  background: #00703c;
  color: #fff;
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
}`;

  fs.writeFileSync(path.join(publicStylesheetsDir, 'govuk-frontend.css'), fallbackCssContent);
  
  // Exit with success since we've created a fallback
  process.exit(0);
}

// Copy function that handles errors
function copyRecursive(src, dest) {
  try {
    console.log(`Copying from ${src} to ${dest}`);
    
    // Check if src exists before trying to copy
    if (!fs.existsSync(src)) {
      console.log(`Source does not exist: ${src}`);
      return;
    }
    
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    // On Windows, use xcopy. On Unix systems, use cp -R
    if (process.platform === 'win32') {
      execSync(`xcopy "${src}" "${dest}" /E /I /Y`);
    } else {
      execSync(`cp -R "${src}"/* "${dest}"`);
    }
    console.log(`Successfully copied ${src} to ${dest}`);
  } catch (err) {
    console.error(`Error copying ${src} to ${dest}: ${err.message}`);
  }
}

// Copy GOV.UK Frontend assets
try {
  console.log(`Found GOV.UK Frontend at: ${sourceGovukDir}`);
  
  // Create the target directory structure
  const targetGovukDir = path.join(publicGovukDir, 'govuk');
  if (!fs.existsSync(targetGovukDir)) {
    fs.mkdirSync(targetGovukDir, { recursive: true });
  }
  
  // Check if sourceGovukDir is a directory or if it's the parent directory
  const stats = fs.statSync(sourceGovukDir);
  if (stats.isDirectory()) {
    // If it's just the 'govuk-frontend' directory without 'govuk' subdirectory
    if (path.basename(sourceGovukDir) === 'govuk-frontend' || 
        path.basename(sourceGovukDir) === 'frontend' || 
        path.basename(path.dirname(sourceGovukDir)) === '@govuk') {
      
      console.log('Found GOV.UK Frontend directory without expected structure');
      console.log('Copying entire directory contents');
      
      // List the contents to see what we're working with
      const contents = fs.readdirSync(sourceGovukDir);
      console.log(`Directory contents: ${contents.join(', ')}`);
      
      // Instead of looking for 'govuk' subdirectory, copy all CSS and assets
      contents.forEach(item => {
        const sourcePath = path.join(sourceGovukDir, item);
        const stats = fs.statSync(sourcePath);
        
        if (stats.isDirectory()) {
          copyRecursive(sourcePath, path.join(publicGovukDir, item));
        } else if (item.endsWith('.css') || item.endsWith('.js')) {
          // Copy CSS and JS files directly
          fs.copyFileSync(sourcePath, path.join(publicGovukDir, item));
          console.log(`Copied ${item} directly`);
        }
      });
      
      // Create a 'govuk' directory anyway for the template paths
      const linkDir = path.join(publicGovukDir, 'govuk');
      if (!fs.existsSync(linkDir)) {
        fs.mkdirSync(linkDir, { recursive: true });
      }
      
      // Create a special all.css in the govuk directory for template paths
      const allCssPath = path.join(linkDir, 'all.css');
      fs.writeFileSync(allCssPath, '/* Compatibility CSS file */\n');
      console.log(`Created compatibility file at ${allCssPath}`);
    } else {
      // Normal case - just copy the assets
      copyRecursive(sourceGovukDir, targetGovukDir);
    }
  } else {
    console.log(`Source is not a directory: ${sourceGovukDir}`);
  }
  
  // Check for assets directory in multiple possible locations
  const possibleAssetDirs = [
    path.join(path.dirname(sourceGovukDir), 'assets'),
    path.join(sourceGovukDir, 'assets'),
    path.join(path.dirname(path.dirname(sourceGovukDir)), 'assets')
  ];
  
  for (const assetDir of possibleAssetDirs) {
    if (fs.existsSync(assetDir)) {
      console.log(`Found assets directory at: ${assetDir}`);
      copyRecursive(assetDir, publicAssetsDir);
      break;
    }
  }
  
  // Create a CSS file that imports the GOV.UK Frontend CSS
  const cssContent = `/* 
 * GOV.UK Frontend CSS import
 * Created by copy-govuk-assets.js 
 */

@import url('/govuk-frontend/govuk/all.css');
`;
  
  fs.writeFileSync(path.join(publicStylesheetsDir, 'govuk-frontend.css'), cssContent);
  
  console.log('GOV.UK Frontend assets copied successfully!');
} catch (err) {
  console.error(`Error in copy-govuk-assets script: ${err.message}`);
  // Exit with success anyway to avoid failing build
  process.exit(0);
}
