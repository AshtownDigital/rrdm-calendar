/**
 * Standardize Template Names Script
 * 
 * This script standardizes template naming conventions and removes duplicate templates.
 * It ensures consistent naming across all modules and updates controller references.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define template renaming rules
const templateRenames = [
  // Format: [oldPath, newPath]
  // BCR module
  ['views/modules/bcr/submission-detail.njk', 'views/modules/bcr/submission-details.njk'],
  
  // Keep manage.njk as the standard template for user management
  // We'll check if users.njk exists and remove it
];

// Define templates to delete (duplicates)
const templatesToDelete = [
  'views/modules/access/users.njk'
];

// Define controllers that need to be updated
const controllerUpdates = [
  // Format: [controllerPath, oldTemplateRef, newTemplateRef]
  ['controllers/bcr/submissionsController.js', 'modules/bcr/submission-detail', 'modules/bcr/submission-details']
];

// Base directory
const baseDir = path.resolve(__dirname, '..');

// Function to rename templates
function renameTemplates() {
  console.log('Standardizing template names...');
  
  templateRenames.forEach(([oldPath, newPath]) => {
    const oldFullPath = path.join(baseDir, oldPath);
    const newFullPath = path.join(baseDir, newPath);
    
    // Check if old file exists
    if (fs.existsSync(oldFullPath)) {
      // Check if new file already exists
      if (fs.existsSync(newFullPath)) {
        console.log(`Cannot rename ${oldPath} to ${newPath} - target already exists`);
      } else {
        try {
          fs.renameSync(oldFullPath, newFullPath);
          console.log(`Renamed ${oldPath} to ${newPath}`);
        } catch (err) {
          console.error(`Error renaming ${oldPath} to ${newPath}:`, err);
        }
      }
    } else {
      console.log(`Source file ${oldPath} does not exist`);
    }
  });
}

// Function to delete duplicate templates
function deleteTemplates() {
  console.log('Removing duplicate templates...');
  
  templatesToDelete.forEach((templatePath) => {
    const fullPath = path.join(baseDir, templatePath);
    
    // Check if file exists
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`Deleted ${templatePath}`);
      } catch (err) {
        console.error(`Error deleting ${templatePath}:`, err);
      }
    } else {
      console.log(`Template ${templatePath} does not exist`);
    }
  });
}

// Function to update controller references
function updateControllerReferences() {
  console.log('Updating controller references...');
  
  controllerUpdates.forEach(([controllerPath, oldRef, newRef]) => {
    const fullPath = path.join(baseDir, controllerPath);
    
    // Check if controller exists
    if (fs.existsSync(fullPath)) {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Replace all occurrences of the old template reference
        const updatedContent = content.replace(new RegExp(`'${oldRef}'`, 'g'), `'${newRef}'`);
        
        // Write back to file if changes were made
        if (content !== updatedContent) {
          fs.writeFileSync(fullPath, updatedContent);
          console.log(`Updated template references in ${controllerPath}`);
        } else {
          console.log(`No changes needed in ${controllerPath}`);
        }
      } catch (err) {
        console.error(`Error updating ${controllerPath}:`, err);
      }
    } else {
      console.log(`Controller ${controllerPath} does not exist`);
    }
  });
}

// Main execution
try {
  console.log('Starting template standardization...');
  
  // Run the functions
  renameTemplates();
  deleteTemplates();
  updateControllerReferences();
  
  console.log('Template standardization completed successfully!');
} catch (error) {
  console.error('Error during template standardization:', error);
  process.exit(1);
}
