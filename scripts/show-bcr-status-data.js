/**
 * Script to show the BCR status enum model and data
 * This displays:
 * 1. The database column type for status
 * 2. The current BCRs with their status values
 * 3. The enum values if it's an enum type
 */
const mongoose = require('mongoose');
const { Bcr } = require('../models/Bcr');
require('../config/database.mongo');

async function showBcrStatusData() {
  console.log('Checking BCR status column and data...');
  
  try {
    // Step 1: Show schema information for status field
    console.log('\n1. SCHEMA INFORMATION:');
    const statusPath = Bcr.schema.path('status');
    console.log(JSON.stringify({
      field: 'status',
      type: statusPath.instance,
      required: statusPath.isRequired,
      enum: statusPath.enumValues,
      default: statusPath.defaultValue
    }, null, 2));
    
    // Step 2: Show enum values
    console.log('\n2. ENUM VALUES:');
    console.log(JSON.stringify(Bcr.schema.path('status').enumValues, null, 2));
    
    // Step 3: Show the current BCRs with their status values
    console.log('\n3. CURRENT BCR STATUS DATA:');
    const bcrs = await Bcr.find()
      .select('bcrNumber title status createdAt')
      .sort('-createdAt');
    
    console.log(JSON.stringify(bcrs, null, 2));
    
    // Step 4: Show distinct status values in use
    console.log('\n4. DISTINCT STATUS VALUES IN USE:');
    const distinctStatuses = await Bcr.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          status: '$_id',
          count: { $toString: '$count' },
          _id: 0
        }
      }
    ]);
    
    console.log(JSON.stringify(distinctStatuses, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error retrieving BCR status data:', error);
    return false;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the function
showBcrStatusData()
  .then(() => {
    console.log('\nQuery completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
