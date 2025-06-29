/**
 * BCR Workflow Controller
 * Handles workflow-related functionality for the BCR module
 */

const mongoose = require('mongoose');
const bcrModel = require('../../../../models/modules/bcr/model');
const workflowService = require('../../../../services/modules/bcr/workflowService');
const statusTagService = require('../../../../services/shared/statusTagService');
const { createModuleLogger } = require('../../../../services/shared/loggerService');

// Create module-specific logger
const logger = createModuleLogger('workflowController');

/**
 * Render BCR workflow view
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.showWorkflow = async (req, res) => {
  try {
    logger.info('Loading workflow view', { userId: req.user?.id });
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    
    // Get phases and statuses
    let phases = [];
    let statuses = [];
    
    if (isDbConnected) {
      try {
        [phases, statuses] = await Promise.all([
          workflowService.getAllPhases(),
          workflowService.getAllStatuses()
        ]);
      } catch (error) {
        logger.error('Error fetching workflow data', error, { userId: req.user?.id });
        // Continue with empty arrays
      }
    }
    
    // Group phases by group name
    const phaseGroups = {};
    phases.forEach(phase => {
      const groupName = phase.group || 'Ungrouped';
      if (!phaseGroups[groupName]) {
        phaseGroups[groupName] = [];
      }
      phaseGroups[groupName].push(phase);
    });
    
    logger.info('Workflow view loaded successfully');
    res.render('modules/bcr/workflow/index', {
      title: 'BCR Workflow',
      phases,
      statuses,
      phaseGroups,
      getPhaseByDisplayOrder: exports.getPhaseByDisplayOrder,
      getStatusById: exports.getStatusById,
      getGroupDescription: exports.getGroupDescription,
      connectionIssue: !isDbConnected,
      user: req.user
    });
  } catch (error) {
    logger.error('Error in show workflow controller', error, { userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the workflow view',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * View workflow progress for a specific BCR
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.viewWorkflowProgress = async (req, res) => {
  try {
    logger.info('Loading workflow progress view', { userId: req.user?.id, bcrId: req.params.id });
    const bcrId = req.params.id;
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let bcr = null;
    let workflowVisual = null;
    let timedOut = false;
    
    if (isDbConnected) {
      try {
        // Set a timeout for the database operations
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            timedOut = true;
            reject(new Error('Database operation timed out'));
          }, 5000);
        });
        
        // Execute database operations with timeout
        try {
          [bcr, workflowVisual] = await Promise.all([
            Promise.race([bcrModel.getBcrById(bcrId), timeoutPromise]),
            Promise.race([workflowService.getWorkflowVisual(bcrId), timeoutPromise])
          ]);
        } finally {
          // Clear the timeout to prevent memory leaks
          if (timeoutId) clearTimeout(timeoutId);
        }
      } catch (error) {
        logger.error('Error or timeout fetching BCR workflow data', error, { userId: req.user?.id, bcrId: req.params.id });
        // Don't rethrow, continue with null values
      }
    }
    
    if (!bcr) {
      // If we couldn't find the BCR due to connection issues or timeout,
      // show a more helpful error page with connection status
      return res.status(404).render('error', {
        title: 'BCR Not Available',
        message: timedOut ? 
          'The request to fetch the BCR timed out. Please try again later.' : 
          (!isDbConnected ? 
            'Database connection issue detected. Please try again when the database is available.' : 
            'The requested BCR was not found'),
        error: {},
        connectionIssue: !isDbConnected,
        timedOut: timedOut,
        user: req.user
      });
    }
    
    logger.info('Workflow progress view loaded successfully', { bcrId: req.params.id });
    res.render('modules/bcr/bcrs/workflow-progress', {
      title: `Workflow Progress - ${bcr.bcrNumber}`,
      bcr,
      workflowVisual,
      statusTag: statusTagService.getBcrStatusTag(bcr),
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      user: req.user
    });
  } catch (error) {
    logger.error('Error in view workflow progress controller', error, { userId: req.user?.id, bcrId: req.params.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the workflow progress',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * Update BCR workflow status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateWorkflowStatus = async (req, res) => {
  try {
    logger.info('Updating workflow status', { userId: req.user?.id, bcrId: req.params.id, phaseId: req.body.phaseId, statusId: req.body.statusId });
    const bcrId = req.params.id;
    const { phaseId, statusId, comments } = req.body;
    
    // Update the BCR phase and status
    await workflowService.updateBcrPhaseStatus(bcrId, phaseId, statusId);
    
    // Add to workflow history if comments are provided
    if (comments) {
      const bcr = await bcrModel.getBcrById(bcrId);
      if (bcr) {
        // Add history entry
        bcr.workflowHistory = bcr.workflowHistory || [];
        bcr.workflowHistory.push({
          phaseId,
          statusId,
          comments,
          userId: req.user ? req.user.id : null,
          timestamp: new Date()
        });
        await bcr.save();
      }
    }
    
    // Redirect to the workflow progress view
    logger.info('Workflow status updated successfully', { bcrId });
    res.redirect(`/bcr/workflow-progress/${bcrId}`);
  } catch (error) {
    logger.error('Error in update workflow status controller', error, { userId: req.user?.id, bcrId: req.params.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while updating the workflow status',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * Helper function to get a phase by display order
 * @param {Array} phases - Array of phases
 * @param {number} displayOrder - Display order to find
 * @returns {Object|null} - Phase object or null if not found
 */
exports.getPhaseByDisplayOrder = (phases, displayOrder) => {
  return phases.find(phase => phase.displayOrder === displayOrder) || null;
};

/**
 * Helper function to get a status by ID
 * @param {Array} statuses - Array of statuses
 * @param {string} statusId - Status ID to find
 * @returns {Object|null} - Status object or null if not found
 */
exports.getStatusById = (statuses, statusId) => {
  if (!statusId) return null;
  return statuses.find(status => status._id.toString() === statusId.toString()) || null;
};

/**
 * Helper function to get a group description
 * @param {string} groupName - Group name
 * @returns {string} - Group description
 */
exports.getGroupDescription = (groupName) => {
  const descriptions = {
    'Pre-Approval': 'Initial assessment and approval process',
    'Implementation': 'Development and implementation of the change',
    'Post-Implementation': 'Review and closure of the change',
    'Governance': 'Oversight and management of the change'
  };
  
  return descriptions[groupName] || 'Process group';
};

/**
 * Export all workflow-related controllers
 */
module.exports = exports;
