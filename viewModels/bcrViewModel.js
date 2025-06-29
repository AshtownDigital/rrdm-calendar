/**
 * BCR View Model
 * Prepares data for BCR views
 */

const mongoose = require('mongoose');
const bcrModel = require('../models/modules/bcr/model');
const statusTagService = require('../services/shared/statusTagService');
const { executeOperations } = require('../middleware/dbConnectionCheck');

/**
 * Prepare data for BCR list view
 * @param {Object} filters - Filters for BCRs
 * @returns {Object} - Prepared BCR list data
 */
exports.prepareBcrListData = async (filters = {}) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  
  // Define database operations
  const operations = [
    // Only attempt to fetch data if database is connected
    isDbConnected ? bcrModel.getAllBcrs(filters) : Promise.resolve([]),
    isDbConnected ? bcrModel.getAllPhases() : Promise.resolve([]),
    isDbConnected ? bcrModel.getAllStatuses() : Promise.resolve([])
  ];
  
  // Execute all operations with Promise.allSettled
  const [bcrs, phases, statuses] = await executeOperations(operations);
  
  // Format BCRs with status tags
  const formattedBcrs = (bcrs || []).map(bcr => {
    // Get status tag using the centralized service
    const statusTag = statusTagService.getBcrStatusTag(bcr);
    
    // Format the BCR for display
    return {
      id: bcr._id,
      bcrNumber: bcr.bcrNumber || 'N/A',
      title: bcr.title || 'Untitled',
      submittedBy: bcr.submissionId?.fullName || 'Unknown',
      submittedDate: bcr.createdAt ? new Date(bcr.createdAt).toLocaleDateString() : 'Unknown',
      currentPhase: bcr.currentPhaseId?.name || 'Unknown',
      currentStatus: bcr.currentStatusId?.name || 'Unknown',
      statusTag,
      // Add any other fields needed for the view
    };
  });
  
  // Return prepared data
  return {
    bcrs: formattedBcrs,
    phases: phases || [],
    statuses: statuses || [],
    filters,
    connectionIssue: !isDbConnected
  };
};

/**
 * Prepare data for BCR detail view
 * @param {string} bcrId - BCR ID
 * @returns {Object} - Prepared BCR detail data
 */
exports.prepareBcrDetailData = async (bcrId) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  let bcr = null;
  let timedOut = false;
  
  if (isDbConnected) {
    try {
      // Set a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          timedOut = true;
          reject(new Error('Database operation timed out'));
        }, 5000);
      });
      
      // Execute database operation with timeout
      bcr = await Promise.race([
        bcrModel.getBcrById(bcrId),
        timeoutPromise
      ]);
    } catch (error) {
      console.error('Error or timeout fetching BCR:', error);
      // Continue with bcr = null
    }
  }
  
  // If BCR not found, return error data
  if (!bcr) {
    return {
      bcr: null,
      connectionIssue: !isDbConnected,
      timedOut,
      error: {
        title: 'BCR Not Available',
        message: timedOut ? 
          'The request to fetch the BCR timed out. Please try again later.' : 
          (!isDbConnected ? 
            'Database connection issue detected. Please try again when the database is available.' : 
            'The requested BCR was not found')
      }
    };
  }
  
  // Format BCR for display
  const formattedBcr = {
    ...bcr.toObject(),
    statusTag: statusTagService.getBcrStatusTag(bcr)
  };
  
  // Return prepared data
  return {
    bcr: formattedBcr,
    connectionIssue: !isDbConnected,
    timedOut,
    error: null
  };
};
