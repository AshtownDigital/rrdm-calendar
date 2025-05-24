/**
 * BCR Counter Service
 * Handles counting and caching BCR submissions for dashboard display
 */
const mongoose = require('mongoose');
const { Submission, Bcr, Phase, Status } = require('../../../models/modules/bcr/model');

// Cache configuration
const cacheTimeout = 5 * 60 * 1000; // 5 minutes in milliseconds
let countersCache = {
  timestamp: 0,
  data: null
};

/**
 * Check if the cache is still valid
 */
const isCacheValid = () => {
  const now = Date.now();
  return (now - countersCache.timestamp) < cacheTimeout;
};

exports.isCacheValid = isCacheValid;

/**
 * Get counters, using cache if valid
 */
exports.getCounters = async () => {
  if (isCacheValid()) {
    return countersCache.data;
  }
  
  return await exports.refreshAllCounters();
};

/**
 * Force refresh of all counters
 */
exports.refreshAllCounters = async () => {
  try {
    // Check if MongoDB connection is ready
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB connection not ready when refreshing counters');
      return {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
        phases: {}
      };
    }
    
    // Count all submissions with different statuses
    // Use Promise.allSettled to handle partial failures
    const [pendingResult, approvedResult, rejectedResult, totalResult, phasesResult] = 
      await Promise.allSettled([
        exports.countPendingSubmissions(),
        exports.countApprovedSubmissions(),
        exports.countRejectedSubmissions(),
        exports.countTotalSubmissions(),
        exports.countBcrsByPhase()
      ]);
    
    const counters = {
      pending: pendingResult.status === 'fulfilled' ? pendingResult.value : 0,
      approved: approvedResult.status === 'fulfilled' ? approvedResult.value : 0,
      rejected: rejectedResult.status === 'fulfilled' ? rejectedResult.value : 0,
      total: totalResult.status === 'fulfilled' ? totalResult.value : 0,
      phases: phasesResult.status === 'fulfilled' ? phasesResult.value : {}
    };
    
    // Update cache
    countersCache = {
      timestamp: Date.now(),
      data: counters
    };
    
    return counters;
  } catch (error) {
    console.error('Error refreshing counters:', error);
    // Return default values instead of throwing
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
      phases: {}
    };
  }
};

/**
 * Count total submissions (excluding deleted)
 */
exports.countTotalSubmissions = async () => {
  try {
    // Check if MongoDB connection is ready
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB connection not ready when counting total submissions');
      return 0;
    }
    
    const count = await Submission.countDocuments({ 
      deleted: { $ne: true } 
    }).maxTimeMS(5000); // Set a 5-second timeout for this query
    
    return count;
  } catch (error) {
    console.error('Error counting total submissions:', error);
    return 0; // Return 0 instead of throwing error
  }
};

/**
 * Count pending submissions
 * Definition: Submissions without BCR IDs and not in 'Rejected' status
 */
exports.countPendingSubmissions = async () => {
  try {
    // Check if MongoDB connection is ready
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB connection not ready when counting pending submissions');
      return 0;
    }
    
    // Use aggregation pipeline for efficient counting
    const result = await Submission.aggregate([
      {
        $match: {
          bcrId: { $exists: false },
          status: { $ne: 'Rejected' },
          deleted: { $ne: true }
        }
      },
      {
        $count: 'pending'
      }
    ]).maxTimeMS(5000); // Set a 5-second timeout for this query
    
    return result.length > 0 ? result[0].pending : 0;
  } catch (error) {
    console.error('Error counting pending submissions:', error);
    return 0; // Return 0 instead of throwing error
  }
};

/**
 * Count approved submissions
 * Definition: Submissions with BCR IDs
 */
exports.countApprovedSubmissions = async () => {
  try {
    // Check if MongoDB connection is ready
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB connection not ready when counting approved submissions');
      return 0;
    }
    
    // Use aggregation pipeline for efficient counting
    const result = await Submission.aggregate([
      {
        $match: {
          bcrId: { $exists: true, $ne: null },
          deleted: { $ne: true }
        }
      },
      {
        $count: 'approved'
      }
    ]).maxTimeMS(5000); // Set a 5-second timeout for this query
    
    return result.length > 0 ? result[0].approved : 0;
  } catch (error) {
    console.error('Error counting approved submissions:', error);
    return 0; // Return 0 instead of throwing error
  }
};

/**
 * Count rejected submissions
 */
exports.countRejectedSubmissions = async () => {
  try {
    // Check if MongoDB connection is ready
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB connection not ready when counting rejected submissions');
      return 0;
    }
    
    // Use aggregation pipeline for efficient counting
    const result = await Submission.aggregate([
      {
        $match: {
          status: 'Rejected',
          deleted: { $ne: true }
        }
      },
      {
        $count: 'rejected'
      }
    ]).maxTimeMS(5000); // Set a 5-second timeout for this query
    
    return result.length > 0 ? result[0].rejected : 0;
  } catch (error) {
    console.error('Error counting rejected submissions:', error);
    return 0; // Return 0 instead of throwing error
  }
};

/**
 * Count BCRs by phase
 */
exports.countBcrsByPhase = async () => {
  try {
    // Get all phases
    const phases = await Phase.find({ deleted: { $ne: true } })
      .sort({ displayOrder: 1 })
      .populate('inProgressStatusId')
      .populate('completedStatusId')
      .exec();
    
    // Initialize phase counts
    const phaseCounts = {};
    
    // For each phase, count BCRs in that phase
    for (const phase of phases) {
      // Use phase.value (not phase.id) for consistency
      const count = await Bcr.countDocuments({
        currentPhaseId: mongoose.Types.ObjectId.isValid(phase._id) ? phase._id : null,
        deleted: { $ne: true }
      });
      
      phaseCounts[phase.value || phase.name] = count;
    }
    
    return phaseCounts;
  } catch (error) {
    console.error('Error counting BCRs by phase:', error);
    // Return empty object instead of throwing to prevent dashboard errors
    return {};
  }
};

/**
 * Invalidate the counters cache
 * Call this when submissions or BCRs are created, updated, or deleted
 */
exports.invalidateCache = () => {
  countersCache.timestamp = 0;
};
