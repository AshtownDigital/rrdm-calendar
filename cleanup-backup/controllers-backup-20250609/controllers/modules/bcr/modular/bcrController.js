/**
 * BCR Controller
 * Handles BCR-specific functionality for the BCR module
 */

const mongoose = require('mongoose');
const bcrViewModel = require('../../../../viewModels/bcrViewModel');
const { createModuleLogger } = require('../../../../services/shared/loggerService');

// Create module-specific logger
const logger = createModuleLogger('bcrController');

/**
 * List all approved Business Change Requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.listApprovedBcrs = async (req, res) => {
  try {
    logger.info('Loading BCR list', { 
      userId: req.user?.id,
      filters: req.query
    });
    
    // Prepare filters from query parameters
    const filters = {
      status: req.query.status,
      phase: req.query.phase,
      search: req.query.search
    };
    
    // Use view model to prepare data
    const viewData = await bcrViewModel.prepareBcrListData(filters);
    
    res.render('modules/bcr/list', {
      title: 'Business Change Requests',
      ...viewData,
      user: req.user
    });
    
    logger.info('BCR list loaded successfully');
  } catch (error) {
    logger.error('Error loading BCR list', error, { userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the BCR list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * View a specific Business Change Request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.viewBcr = async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    logger.info('Viewing BCR details', { 
      userId: req.user?.id,
      bcrId 
    });
    
    // Use view model to prepare data
    const viewData = await bcrViewModel.prepareBcrDetailData(bcrId);
    
    // If there was an error fetching the BCR, show error page
    if (viewData.error) {
      logger.warn('BCR not found or error', { 
        userId: req.user?.id,
        bcrId,
        error: viewData.error
      });
      
      return res.status(404).render('error', {
        title: viewData.error.title,
        message: viewData.error.message,
        error: {},
        connectionIssue: viewData.connectionIssue,
        timedOut: viewData.timedOut,
        user: req.user
      });
    }
    
    res.render('modules/bcr/view', {
      title: `BCR ${viewData.bcr.bcrNumber || viewData.bcr._id}`,
      bcr: viewData.bcr,
      statusTag: viewData.bcr.statusTag,
      getStatusColor: exports.getStatusColor,
      connectionIssue: viewData.connectionIssue,
      timedOut: viewData.timedOut,
      user: req.user
    });
    
    logger.info('BCR details loaded successfully', { bcrId });
  } catch (error) {
    logger.error('Error viewing BCR details', error, { 
      userId: req.user?.id,
      bcrId: req.params.id 
    });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the BCR',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * Helper function to get a color for a status
 * @param {string} status - Status string
 * @returns {string} - CSS color class
 */
exports.getStatusColor = (status) => {
  if (!status) return 'grey';
  
  const statusLower = status.toLowerCase();
  
  // Color mapping based on status
  const colorMap = {
    'approved': 'green',
    'rejected': 'red',
    'pending': 'blue',
    'in review': 'purple',
    'implementation': 'orange',
    'completed': 'green',
    'paused': 'yellow',
    'on hold': 'yellow',
    'cancelled': 'red',
    'closed': 'grey'
  };
  
  return colorMap[statusLower] || 'blue';
};

/**
 * Export all BCR-related controllers
 */
module.exports = exports;
