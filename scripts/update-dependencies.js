/**
 * Update Dependencies Script
 * 
 * This script updates the package.json file with new dependencies.
 * It reads the package.json.updates file and merges it with the existing package.json.
 */
const fs = require('fs');
const path = require('path');

// Paths
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const updatesPath = path.join(rootDir, 'package.json.updates');

// Read files
console.log('Reading package.json and updates file...');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const updates = JSON.parse(fs.readFileSync(updatesPath, 'utf8'));

// Merge dependencies
console.log('Merging dependencies...');
packageJson.dependencies = {
  ...packageJson.dependencies,
  ...updates.dependencies
};

// Merge devDependencies
console.log('Merging devDependencies...');
packageJson.devDependencies = {
  ...packageJson.devDependencies,
  ...updates.devDependencies
};

// Sort dependencies alphabetically
console.log('Sorting dependencies...');
packageJson.dependencies = Object.keys(packageJson.dependencies)
  .sort()
  .reduce((obj, key) => {
    obj[key] = packageJson.dependencies[key];
    return obj;
  }, {});

packageJson.devDependencies = Object.keys(packageJson.devDependencies)
  .sort()
  .reduce((obj, key) => {
    obj[key] = packageJson.devDependencies[key];
    return obj;
  }, {});

// Write updated package.json
console.log('Writing updated package.json...');
fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, null, 2) + '\n',
  'utf8'
);

console.log('Dependencies updated successfully!');
console.log('Run "npm install" to install the new dependencies.');

// Optional: Remove the updates file
// fs.unlinkSync(updatesPath);
// console.log('Removed updates file.');
