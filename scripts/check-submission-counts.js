/**
 * Script to check submission counts by status
 * This helps diagnose why dashboard counts don't match the submissions page
 */
// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const { Submission } = require('../models/modules/bcr/model');
const counterService = require('../services/modules/bcr/counterService');

async function checkSubmissionCounts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get counts from counter service (used by dashboard)
    console.log('\n=== COUNTER SERVICE COUNTS (DASHBOARD) ===');
    const counters = await counterService.refreshAllCounters();
    console.log('Total submissions:', counters.total);
    console.log('Pending submissions:', counters.pending);
    console.log('Approved submissions:', counters.approved);
    console.log('Rejected submissions:', counters.rejected);
    
    // Get counts directly from database
    console.log('\n=== DIRECT DATABASE COUNTS ===');
    
    // Total count
    const totalCount = await Submission.countDocuments({ 
      deleted: { $ne: true } 
    });
    console.log('Total submissions:', totalCount);
    
    // Pending count (no BCR ID and not rejected)
    const pendingCount = await Submission.countDocuments({ 
      bcrId: { $exists: false }, 
      status: { $ne: 'Rejected' }, 
      deleted: { $ne: true } 
    });
    console.log('Pending submissions:', pendingCount);
    
    // Approved count (has BCR ID)
    const approvedCount = await Submission.countDocuments({ 
      bcrId: { $exists: true, $ne: null }, 
      deleted: { $ne: true } 
    });
    console.log('Approved submissions:', approvedCount);
    
    // Rejected count
    const rejectedCount = await Submission.countDocuments({ 
      status: 'Rejected', 
      deleted: { $ne: true } 
    });
    console.log('Rejected submissions:', rejectedCount);
    
    // Get counts by status
    console.log('\n=== SUBMISSIONS BY STATUS ===');
    const statusCounts = await Submission.aggregate([
      { 
        $match: { 
          deleted: { $ne: true } 
        } 
      },
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 } 
        } 
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    statusCounts.forEach(status => {
      console.log(`${status._id || 'null'}: ${status.count}`);
    });
    
    // Get a sample of submissions to check their status values
    console.log('\n=== SAMPLE SUBMISSIONS ===');
    const sampleSubmissions = await Submission.find({ deleted: { $ne: true } })
      .select('submissionCode status bcrId')
      .limit(5);
      
    sampleSubmissions.forEach(sub => {
      console.log(`${sub.submissionCode}: status=${sub.status || 'null'}, hasBcrId=${!!sub.bcrId}`);
    });
    
    // Check for null or undefined status values
    const nullStatusCount = await Submission.countDocuments({
      status: null,
      deleted: { $ne: true }
    });
    
    const undefinedStatusCount = await Submission.countDocuments({
      status: { $exists: false },
      deleted: { $ne: true }
    });
    
    console.log('\n=== PROBLEMATIC STATUS VALUES ===');
    console.log('Submissions with null status:', nullStatusCount);
    console.log('Submissions with undefined status:', undefinedStatusCount);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the function
checkSubmissionCounts();
