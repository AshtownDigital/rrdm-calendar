/**
 * Script to update BCR statuses in the database
 * This script:
 * 1. Converts any 'new' status to 'new_submission'
 * 2. Ensures all BCRs use valid statuses according to business rules
 */
const mongoose = require('mongoose');
const { Bcr } = require('../models');
require('../config/database.mongo');

async function updateBcrStatuses() {
  console.log('Starting BCR status update...');
  
  try {
    // Step 1: Convert 'new' status to 'new_submission'
    console.log('Converting any "new" status to "new_submission"...');
    const newToNewSubmission = await Bcr.updateMany(
      { status: 'new' },
      { 
        $set: { 
          status: 'new_submission',
          updatedAt: new Date()
        }
      }
    );
    console.log(`Updated ${newToNewSubmission} BCRs from 'new' to 'new_submission'`);
    
    // Step 2: Also update BcrWorkflows table
    console.log('Updating BcrWorkflows table...');
    const draftToNewSubmission = await Bcr.updateMany(
      { status: 'draft' },
      { 
        $set: { 
          status: 'new_submission',
          updatedAt: new Date()
        }
      }
    );
    console.log(`Updated ${draftToNewSubmission} workflow records from 'draft' to 'new_submission'`);
    
    // Step 3: Update previousStatus in BcrWorkflows
    console.log('Updating previousStatus in BcrWorkflows...');
    const previousStatusUpdated = await Bcr.updateMany(
      { previousStatus: 'new' },
      { 
        $set: { 
          previousStatus: 'new_submission',
          updatedAt: new Date()
        }
      }
    );
    console.log(`Updated ${previousStatusUpdated} workflow records with previousStatus from 'new' to 'new_submission'`);
    
    // Step 4: Verify the updates
    console.log('\nVerifying BCR statuses after update:');
    const bcrs = await Bcr.find({}, 'id status');
    
    console.log('BCR status counts:');
    const statusCounts = {};
    bcrs.forEach(bcr => {
      if (!statusCounts[bcr.status]) {
        statusCounts[bcr.status] = 0;
      }
      statusCounts[bcr.status]++;
    });
    console.log(JSON.stringify(statusCounts, null, 2));
    console.log(JSON.stringify(bcrs, null, 2));
    
    console.log('\nVerifying BcrWorkflows statuses after update:');
    const workflows = await prisma.$queryRaw`
      SELECT status, COUNT(*)::text as count
      FROM "BcrWorkflows"
      GROUP BY status
      ORDER BY count DESC
    `;
    
    console.log('BcrWorkflows status counts:');
    console.log(JSON.stringify(workflows, null, 2));
    
    console.log('\nBCR status update completed successfully!');
    return true;
  } catch (error) {
    console.error('Error updating BCR statuses:', error);
    return false;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the update function
updateBcrStatuses()
  .then((success) => {
    if (success) {
      console.log('All status updates applied successfully.');
    } else {
      console.error('Failed to apply all status updates.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
