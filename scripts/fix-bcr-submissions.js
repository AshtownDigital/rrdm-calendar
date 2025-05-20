/**
 * Script to fix BCR submissions page by ensuring the database and application are aligned
 * This script:
 * 1. Updates the status column to TEXT type (if needed)
 * 2. Sets the default value to 'new_submission'
 * 3. Updates any existing 'draft' status BCRs to 'new_submission'
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBcrSubmissions() {
  console.log('Starting BCR submissions fix...');
  
  try {
    // Step 1: Ensure the status column is TEXT type
    console.log('Checking status column type...');
    const columnTypeResult = await prisma.$queryRaw`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Bcrs' AND column_name = 'status'
    `;
    
    const columnType = columnTypeResult[0]?.data_type?.toLowerCase();
    console.log(`Current status column type: ${columnType}`);
    
    if (columnType !== 'text') {
      console.log('Converting status column to TEXT type...');
      await prisma.$executeRaw`ALTER TABLE "Bcrs" ALTER COLUMN "status" TYPE TEXT`;
      console.log('Status column converted to TEXT type');
    } else {
      console.log('Status column is already TEXT type, no conversion needed');
    }
    
    // Step 2: Set the default value to 'new_submission'
    console.log('Setting default value to new_submission...');
    await prisma.$executeRaw`ALTER TABLE "Bcrs" ALTER COLUMN "status" SET DEFAULT 'new_submission'`;
    console.log('Default value set to new_submission');
    
    // Step 3: Update any existing 'draft' status BCRs to 'new_submission'
    console.log('Updating draft BCRs to new_submission...');
    const updateResult = await prisma.$executeRaw`
      UPDATE "Bcrs" 
      SET "status" = 'new_submission', "updatedAt" = NOW() 
      WHERE "status" = 'draft'
    `;
    console.log(`Updated ${updateResult} BCRs from draft to new_submission`);
    
    // Step 4: Verify that BCRs can be retrieved
    console.log('Verifying BCR retrieval...');
    const bcrs = await prisma.$queryRaw`
      SELECT id, "bcrNumber", title, status FROM "Bcrs" LIMIT 5
    `;
    
    console.log(`Retrieved ${bcrs.length} BCRs successfully`);
    if (bcrs.length > 0) {
      console.log('Sample BCR data:');
      bcrs.forEach(bcr => {
        console.log(`- ID: ${bcr.id}, Number: ${bcr.bcrNumber}, Status: ${bcr.status}`);
      });
    }
    
    console.log('BCR submissions fix completed successfully!');
    return true;
  } catch (error) {
    console.error('Error fixing BCR submissions:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix function
fixBcrSubmissions()
  .then((success) => {
    if (success) {
      console.log('All fixes applied successfully.');
    } else {
      console.error('Failed to apply all fixes.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
