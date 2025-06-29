/**
 * Dashboard View Model
 * Prepares data for the BCR dashboard view
 */

const mongoose = require('mongoose');
const bcrModel = require('../models/modules/bcr/model');
const counterService = require('../services/modules/bcr/counterService');
const statusTagService = require('../services/shared/statusTagService');
const { executeOperations } = require('../middleware/dbConnectionCheck');

/**
 * Prepare dashboard data
 * @param {Object} options - Options for data preparation
 * @param {number} options.recentBcrsLimit - Number of recent BCRs to fetch
 * @returns {Object} - Prepared dashboard data
 */
exports.prepareDashboardData = async (options = {}) => {
  const limit = options.recentBcrsLimit || 5;
  const isDbConnected = mongoose.connection.readyState === 1;
  
  // Define database operations
  const operations = [
    // Only attempt to fetch data if database is connected
    isDbConnected ? bcrModel.getAllImpactAreas() : Promise.resolve([]),
    isDbConnected ? bcrModel.getAllUrgencyLevels() : Promise.resolve([]),
    isDbConnected ? counterService.getCounters() : Promise.resolve({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      phases: {}
    }),
    // Wrap this in a try/catch with timeout to prevent hanging
    (async () => {
      if (!isDbConnected) {
        return []; // Skip database query if not connected
      }
      
      try {
        // Set a timeout for this operation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout fetching recent BCRs')), 5000);
        });
        
        // Race the query against the timeout
        return await Promise.race([
          bcrModel.getAllBcrs({ limit }),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('Error fetching recent BCRs:', error);
        return []; // Return empty array on error
      }
    })()
  ];
  
  // Execute all operations with Promise.allSettled
  const [impactAreas, urgencyLevels, counters, recentBcrs] = 
    await executeOperations(operations);
  
  // Format stats for the dashboard
  const stats = {
    total: counters?.total || 0,
    pending: counters?.pending || 0,
    approved: counters?.approved || 0,
    rejected: counters?.rejected || 0,
    implemented: (counters?.phases && counters.phases['Implementation']) || 0
  };
  
  // Format recent BCRs with status tags
  const formattedRecentBcrs = (recentBcrs || []).map(bcr => {
    // Get status tag using the centralized service
    const statusTag = statusTagService.getBcrStatusTag(bcr);
    
    // Get phase name if available
    let phaseName = '';
    if (bcr.currentPhaseId && bcr.currentPhaseId.name) {
      phaseName = bcr.currentPhaseId.name;
    }
    
    // Format the BCR for display
    return {
      id: bcr._id,
      bcrNumber: bcr.bcrNumber || 'N/A',
      title: bcr.title || 'Untitled',
      submittedBy: bcr.submissionId?.fullName || 'Unknown',
      submittedDate: bcr.createdAt ? new Date(bcr.createdAt).toLocaleDateString() : 'Unknown',
      phaseName,
      statusTag
    };
  });
  
  // Return prepared data
  return {
    impactAreas: impactAreas || [],
    urgencyLevels: urgencyLevels || [],
    stats,
    recentBcrs: formattedRecentBcrs,
    connectionIssue: !isDbConnected
  };
};
