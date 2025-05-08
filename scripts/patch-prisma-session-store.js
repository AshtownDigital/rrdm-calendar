/**
 * Patch Prisma Session Store Module
 * 
 * This script directly modifies the Prisma Session Store module code to remove
 * references to the createdAt column, which is causing errors in our application.
 */
const fs = require('fs');
const path = require('path');

// Path to the Prisma Session Store module
const modulePath = path.resolve(
  __dirname,
  '../node_modules/@quixo3/prisma-session-store/dist/lib/prisma-session-store.js'
);

console.log(`Patching Prisma Session Store module at: ${modulePath}`);

// Check if the file exists
if (!fs.existsSync(modulePath)) {
  console.error('Error: Prisma Session Store module not found');
  process.exit(1);
}

// Read the file
let content = fs.readFileSync(modulePath, 'utf8');

// Create a backup
const backupPath = `${modulePath}.bak`;
fs.writeFileSync(backupPath, content);
console.log(`Backup created at: ${backupPath}`);

// Find and replace the problematic code
// The issue is in the create method that tries to use createdAt
let modified = false;

// Pattern 1: Remove createdAt from the create method
if (content.includes('createdAt: new Date(),')) {
  console.log('Removing createdAt from create method...');
  content = content.replace(/createdAt: new Date\(\),\s*/g, '');
  modified = true;
}

// Pattern 2: Fix the schema definition
if (content.includes('this.schema = schema || { tableName: "Session" };')) {
  console.log('Updating schema definition...');
  const schemaPattern = /this\.schema = schema \|\| \{ tableName: "Session" \};/;
  const schemaReplacement = `this.schema = schema || { 
      tableName: "Session",
      columnNames: {
        id: "id",
        sid: "sid",
        data: "data",
        expiresAt: "expiresAt"
      }
    };`;
  
  content = content.replace(schemaPattern, schemaReplacement);
  modified = true;
}

// Write the modified content back to the file
if (modified) {
  fs.writeFileSync(modulePath, content);
  console.log('Prisma Session Store module patched successfully');
} else {
  console.log('No changes needed, module is already patched');
}

console.log('Patch complete. Please restart the application for changes to take effect.');
