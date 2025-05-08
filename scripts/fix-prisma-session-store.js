/**
 * Fix Prisma Session Store Script
 * 
 * This script directly modifies the Prisma Session Store module to work with our database schema.
 * It addresses the issue with missing createdAt column by patching the module's code.
 */
const path = require('path');
const fs = require('fs');

// Path to the Prisma Session Store module
const prismaSessionStorePath = path.resolve(
  __dirname,
  '../node_modules/@quixo3/prisma-session-store/dist/lib/prisma-session-store.js'
);

// Check if the file exists
if (!fs.existsSync(prismaSessionStorePath)) {
  console.error('Prisma Session Store module not found at:', prismaSessionStorePath);
  process.exit(1);
}

// Read the file
let content = fs.readFileSync(prismaSessionStorePath, 'utf8');

console.log('Fixing Prisma Session Store module...');

// Replace the create method to remove createdAt
const createPattern = /this\.prisma\[this\.sessionModelName\]\.create\(\{\s*data:\s*{\s*sid: sid,\s*data: data,\s*expiresAt: expiresAt\s*}\s*}\)/;
const createReplacement = `this.prisma[this.sessionModelName].create({
            data: {
                sid: sid,
                data: data,
                expiresAt: expiresAt
            }
        })`;

// Replace the upsert method to remove createdAt
const upsertPattern = /this\.prisma\[this\.sessionModelName\]\.upsert\(\{\s*where: {\s*sid: sid\s*},\s*update: {\s*data: data,\s*expiresAt: expiresAt\s*},\s*create: {\s*sid: sid,\s*data: data,\s*expiresAt: expiresAt\s*}\s*}\)/;
const upsertReplacement = `this.prisma[this.sessionModelName].upsert({
            where: {
                sid: sid
            },
            update: {
                data: data,
                expiresAt: expiresAt
            },
            create: {
                sid: sid,
                data: data,
                expiresAt: expiresAt
            }
        })`;

// Apply the replacements
let modifiedContent = content;
if (content.includes('createdAt:')) {
  console.log('Removing createdAt from create and upsert methods...');
  modifiedContent = content.replace(/createdAt: new Date\(\),\s*/g, '');
  console.log('createdAt references removed');
} else {
  console.log('No createdAt references found, module may already be fixed');
}

// Write the modified content back to the file
if (modifiedContent !== content) {
  fs.writeFileSync(prismaSessionStorePath, modifiedContent);
  console.log('Prisma Session Store module updated successfully');
} else {
  console.log('No changes were made to the Prisma Session Store module');
}

// Create a backup of the server.js file
const serverPath = path.resolve(__dirname, '../server.js');
const serverBackupPath = path.resolve(__dirname, '../server.js.bak');

if (fs.existsSync(serverPath)) {
  console.log('\nCreating backup of server.js...');
  fs.copyFileSync(serverPath, serverBackupPath);
  console.log('Backup created at:', serverBackupPath);
  
  // Read the server.js file
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Update the session store configuration
  console.log('Updating session store configuration in server.js...');
  
  // Find the PrismaSessionStore configuration
  const sessionStorePattern = /new PrismaSessionStore\(\s*prisma\s*,\s*{([^}]*)}\s*\)/;
  const sessionStoreMatch = serverContent.match(sessionStorePattern);
  
  if (sessionStoreMatch) {
    // Create the updated configuration
    const updatedSessionStore = `new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,  // 2 minutes
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
      schema: {
        tableName: "Session"
      }
    })`;
    
    // Replace the session store configuration
    const updatedServerContent = serverContent.replace(sessionStorePattern, updatedSessionStore);
    
    // Write the updated content back to server.js
    fs.writeFileSync(serverPath, updatedServerContent);
    console.log('Session store configuration updated in server.js');
  } else {
    console.log('Could not find PrismaSessionStore configuration in server.js');
  }
} else {
  console.error('server.js not found at:', serverPath);
}

console.log('\n✅ Fix completed successfully!');
console.log('Please restart the application for the changes to take effect.');
