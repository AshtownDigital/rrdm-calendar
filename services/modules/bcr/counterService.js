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
    // Count all submissions with different statuses
    const counters = {
      pending: await exports.countPendingSubmissions(),
      approved: await exports.countApprovedSubmissions(),
      rejected: await exports.countRejectedSubmissions(),
      total: await exports.countTotalSubmissions(),
      phases: await exports.countBcrsByPhase()
    };
    
    // Update cache
    countersCache = {
      timestamp: Date.now(),
      data: counters
    };
    
    return counters;
  } catch (error) {
    console.error('Error refreshing counters:', error);
    throw error;
  }
};

/**
 * Count total submissions (excluding deleted)
 */
exports.countTotalSubmissions = async () => {
  try {
    return await Submission.countDocuments({ 
      deleted: { $ne: true } 
    });
  } catch (error) {
    console.error('Error counting total submissions:', error);
    throw error;
  }
};

/**
 * Count pending submissions
 * Definition: Submissions without BCR IDs and not in 'Rejected' status
 */
exports.countPendingSubmissions = async () => {
  try {
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
    ]);
    
    return result.length > 0 ? result[0].pending : 0;
  } catch (error) {
    console.error('Error counting pending submissions:', error);
    throw error;
  }
};

/**
 * Count approved submissions
 * Definition: Submissions with BCR IDs
 */
exports.countApprovedSubmissions = async () => {
  try {
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
    ]);
    
    return result.length > 0 ? result[0].approved : 0;
  } catch (error) {
    console.error('Error counting approved submissions:', error);
    throw error;
  }
};

/**
 * Count rejected submissions
 */
exports.countRejectedSubmissions = async () => {
  try {
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
    ]);
    
    return result.length > 0 ? result[0].rejected : 0;
  } catch (error) {
    console.error('Error counting rejected submissions:', error);
    throw error;
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
