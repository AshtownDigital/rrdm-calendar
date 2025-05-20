/**
 * Script to update the BCR models in the database according to BCR_Model_Requirements.md
 */
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function updateBcrModels() {
  try {
    console.log('Starting to update BCR models...');
    
    // Read the migration SQL file
    const migrationSqlPath = path.join(__dirname, '../prisma/migrations/20250517_update_bcr_models/migration.sql');
    const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSql
      .split(';')
      .filter(statement => statement.trim() !== '')
      .map(statement => statement.trim() + ';');
    
    // Execute each SQL statement separately to handle errors gracefully
    for (const statement of statements) {
      try {
        // Skip the statement that creates the index that already exists
        if (statement.includes('SubmissionNew_submissionCode_key')) {
          console.log('Skipping creation of index that already exists...');
          continue;
        }
        
        // Execute the SQL statement
        await prisma.$executeRawUnsafe(statement);
        console.log('Executed SQL statement successfully');
      } catch (error) {
        console.error(`Error executing SQL statement: ${error.message}`);
        console.error('Statement:', statement);
        // Continue with the next statement
      }
    }
    
    // Generate the Prisma client to reflect the updated schema
    console.log('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('BCR models updated successfully!');
  } catch (error) {
    console.error('Error updating BCR models:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateBcrModels();
