/**
 * Apply MVC Changes Script
 * This script applies the MVC pattern changes by replacing the old route files with the new controller-based implementations
 */
const fs = require('fs');
const path = require('path');

// Files to replace
const filesToReplace = [
  {
    oldFile: 'routes/bcr/index.js.new',
    newFile: 'routes/bcr/index.js'
  },
  {
    oldFile: 'routes/api/items.js.new',
    newFile: 'routes/api/items.js'
  },
  {
    oldFile: 'routes/ref-data/dashboard/index.js.new',
    newFile: 'routes/ref-data/dashboard/index.js'
  },
  {
    oldFile: 'routes/ref-data/items/index.js.new',
    newFile: 'routes/ref-data/items/index.js'
  },
  {
    oldFile: 'routes/ref-data/index.js.new',
    newFile: 'routes/ref-data/index.js'
  },
  {
    oldFile: 'routes/access/index.js.new',
    newFile: 'routes/access/index.js'
  },
  {
    oldFile: 'routes/funding/index.js.new',
    newFile: 'routes/funding/index.js'
  }
];

// Function to replace files
const replaceFiles = () => {
  const rootDir = path.resolve(__dirname, '..');
  
  filesToReplace.forEach(({ oldFile, newFile }) => {
    const oldPath = path.join(rootDir, oldFile);
    const newPath = path.join(rootDir, newFile);
    
    // Check if the new file exists
    if (!fs.existsSync(oldPath)) {
      console.error(`Error: ${oldPath} does not exist`);
      return;
    }
    
    // Create a backup of the old file if it exists
    if (fs.existsSync(newPath)) {
      const backupPath = `${newPath}.bak`;
      fs.copyFileSync(newPath, backupPath);
      console.log(`Created backup: ${backupPath}`);
    }
    
    // Replace the old file with the new one
    fs.copyFileSync(oldPath, newPath);
    console.log(`Replaced ${newPath} with ${oldPath}`);
    
    // Remove the .new file
    fs.unlinkSync(oldPath);
    console.log(`Removed ${oldPath}`);
  });
  
  console.log('MVC pattern changes applied successfully!');
};

// Run the script
replaceFiles();
