/**
 * Fix Prisma Imports Script
 * 
 * This script updates all files that create their own PrismaClient instances
 * to use the centralized Prisma client from config/prisma.js instead.
 * 
 * This is critical for proper functioning in serverless environments like Vercel.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to search for files that need updating
const DIRECTORIES_TO_SEARCH = [
  'controllers',
  'services',
  'models',
  'routes'
];

// Root directory of the project
const ROOT_DIR = path.resolve(__dirname, '..');

// Find all JavaScript files in the specified directories
function findJsFiles(directory) {
  try {
    const result = execSync(`find ${directory} -type f -name "*.js"`, { encoding: 'utf8' });
    return result.split('\n').filter(Boolean);
  } catch (error) {
    console.error(`Error finding JS files in ${directory}:`, error.message);
    return [];
  }
}

// Check if a file contains direct PrismaClient initialization
function fileContainsPrismaClientInit(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return (
      content.includes('new PrismaClient') && 
      !filePath.includes('config/prisma.js') &&
      !filePath.includes('test') &&
      !filePath.includes('mock')
    );
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return false;
  }
}

// Update a file to use the centralized Prisma client
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace PrismaClient import and initialization
    const updatedContent = content
      // Replace direct PrismaClient import
      .replace(
        /const\s*{\s*PrismaClient\s*}\s*=\s*require\s*\(\s*['"]@prisma\/client['"]\s*\)\s*;?/g,
        "// Using centralized Prisma client\nconst { prisma } = require('../config/prisma');"
      )
      // Replace relative path imports if needed
      .replace(
        /const\s*{\s*PrismaClient\s*}\s*=\s*require\s*\(\s*['"]\.\.\/@prisma\/client['"]\s*\)\s*;?/g,
        "// Using centralized Prisma client\nconst { prisma } = require('../config/prisma');"
      )
      // Remove PrismaClient initialization
      .replace(
        /const\s*prisma\s*=\s*new\s*PrismaClient\s*\(\s*\{[^}]*\}\s*\)\s*;?/g,
        "// Prisma client is imported from centralized config"
      )
      .replace(
        /const\s*prisma\s*=\s*new\s*PrismaClient\s*\(\s*\)\s*;?/g,
        "// Prisma client is imported from centralized config"
      );
    
    // Only write if changes were made
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error updating file ${filePath}:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting Prisma imports fix...');
  let totalFilesChecked = 0;
  let totalFilesUpdated = 0;
  
  for (const dir of DIRECTORIES_TO_SEARCH) {
    const dirPath = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory ${dirPath} does not exist, skipping.`);
      continue;
    }
    
    console.log(`Searching in ${dirPath}...`);
    const files = findJsFiles(dirPath);
    totalFilesChecked += files.length;
    
    for (const file of files) {
      if (fileContainsPrismaClientInit(file)) {
        console.log(`Updating ${file}...`);
        const updated = updateFile(file);
        if (updated) {
          totalFilesUpdated++;
          console.log(`✅ Updated ${file}`);
        } else {
          console.log(`⚠️ No changes needed in ${file}`);
        }
      }
    }
  }
  
  console.log(`\nPrisma imports fix completed!`);
  console.log(`Checked ${totalFilesChecked} files.`);
  console.log(`Updated ${totalFilesUpdated} files.`);
  
  if (totalFilesUpdated > 0) {
    console.log('\nNext steps:');
    console.log('1. Commit these changes');
    console.log('2. Deploy to Vercel with: vercel deploy --prod');
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
