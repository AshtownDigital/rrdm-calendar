/**
 * Script to fix BCR submissions page by ensuring the database and application are aligned
 * This script:
 * 1. Updates any existing 'draft' status BCRs to 'new_submission'
 * 2. Verifies BCR retrieval works correctly
 */
const mongoose = require('mongoose');
const { Bcr } = require('../models');
require('../config/database.mongo');

async function fixBcrSubmissions() {
  console.log('Starting BCR submissions fix...');
  
  try {
    // Step 1: Update existing draft BCRs
    console.log('Updating draft BCRs to new_submission...');
    const updateResult = await Bcr.updateMany(
      { status: 'draft' },
      { 
        $set: { 
          status: 'new_submission',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} BCRs from draft to new_submission`);
    
    // Step 2: Verify that BCRs can be retrieved
    console.log('Verifying BCR retrieval...');
    const bcrs = await Bcr.find().limit(5);
    
    console.log(`Retrieved ${bcrs.length} BCRs successfully`);
    if (bcrs.length > 0) {
      console.log('Sample BCR:', bcrs[0]);
    }
    
    console.log('BCR submissions fix completed successfully');
    return true;
    
  } catch (error) {
    console.error('Error fixing BCR submissions:', error);
    return false;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the fix
fixBcrSubmissions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
