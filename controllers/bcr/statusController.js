/**
 * BCR Status Controller
 * Handles BCR status updates and phase transitions based on BPMN process
 */
const bcrService = require('../../services/bcrService');
const workflowPhaseService = require('../../services/workflowPhaseService');
const bcrWorkflowService = require('../../services/bcrWorkflowService');
const bcrConfigService = require('../../services/bcrConfigService');
const { logger } = require('../../utils/logger');

/**
 * Renders an error response
 * @param {Object} res - Express response object
 * @param {Object} options - Error options
 * @param {number} options.status - HTTP status code
 * @param {string} options.title - Error title
 * @param {string} options.message - Error message
 * @param {Object} options.error - Error object
 * @param {Object} options.user - User object
 */
function renderError(res, { status = 500, title = 'Error', message = 'An error occurred', error = {}, user = null }) {
  return res.status(status).render('error', {
    title,
    message,
    error: process.env.NODE_ENV === 'development' ? error : {},
    user
  });
}

/**
 * Helper function to reset all phases below the current phase
 * @param {Object} submission - BCR submission object
 * @param {string} currentPhaseId - Current phase ID
 * @param {Array} phases - Array of phase objects
 */
async function resetLowerPhases(submission, currentPhaseId, phases) {
  if (!submission.workflowHistory) return;
  const higherPhaseIds = phases
    .filter(phase => phase.id > currentPhaseId)
    .map(phase => phase.id);
    
  // Use for...of instead of forEach to properly handle await
  for (const item of submission.workflowHistory) {
    const statusName = item.action.includes('Status Updated') ? item.notes.replace('Changed status to ', '') : null;
    if (statusName) {
      const phaseId = await getPhaseIdForStatus(statusName, phases);
      if (phaseId && higherPhaseIds.includes(phaseId)) {
        item.completed = false;
      }
    }
  };
  submission.history.push({
    date: new Date().toISOString(),
    action: 'Phases Reset',
    user: 'System',
    notes: `All phases after Phase ${currentPhaseId} have been reset to Not Completed`
  });
}

/**
 * Helper function to get phase ID for a status
 * @param {string} statusName - Status name
 * @param {Array} phases - Array of phase objects
 * @returns {string|null} - Phase ID or null if not found
 */
async function getPhaseIdForStatus(statusName, phases) {
  try {
    const statuses = await workflowPhaseService.getAllStatuses();
    const status = statuses.find(s => s.name === statusName);
    return status ? status.phaseId : null;
  } catch (error) {
    console.error('Error getting phase ID for status:', error);
    return null;
  }
}

/**
 * Update BCR status
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
async function updateStatus(req, res) {
  try {
    const bcrId = req.params.id;
    const { status, phase, comment, assignee, action, decision } = req.body;
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: 'BCR not found',
        user: req.user
      });
    }
    
    // Options for workflow actions
    const options = {
      comment: comment,
      userId: req.user.id,
      user: req.user.name,
      assignee: assignee
    };
    
    // Handle different workflow actions based on the BPMN process
    if (action) {
      switch (action) {
        case 'transition':
          // Get available transitions
          const availableTransitions = await bcrWorkflowService.getAvailableTransitions(bcrId);
          
          // Find the selected transition
          const selectedTransition = availableTransitions.find(t => 
            t.transitionData.toPhaseId.toString() === phase
          );
          
          if (!selectedTransition) {
            throw new Error(`Invalid transition to phase ${phase}`);
          }
          
          // Perform the transition
          await bcrWorkflowService.transitionBcr(bcrId, selectedTransition.transitionData, options);
          break;
          
        case 'complete_phase':
          // Complete the current phase
          await bcrWorkflowService.completeCurrentPhase(bcrId, options);
          break;
          
        case 'decision':
          // Process a decision point
          const decisionValue = decision === 'true' || decision === true;
          await bcrWorkflowService.processDecisionPoint(bcrId, phase, decisionValue, options);
          break;
          
        default:
          // Simple status update
          const updateData = {};
          if (status) updateData.status = status;
          
          const currentNotes = bcr.notes || '';
          updateData.notes = `${currentNotes}\n\n${new Date().toISOString()} - ${req.user.name}: ${comment}`;
          
          if (assignee) updateData.assignedTo = assignee;
          
          await bcrService.updateBcr(bcrId, updateData);
      }
    } else {
      // Handle legacy status updates
      const updateData = {};
      if (status) updateData.status = status;
      
      if (phase) {
        const phases = await workflowPhaseService.getAllPhases();
        if (bcr.phase && bcr.phase !== phase) {
          await resetLowerPhases(bcr, phase, phases);
        }
        updateData.currentPhaseId = phase;
      }
      
      const currentNotes = bcr.notes || '';
      updateData.notes = `${currentNotes}\n\n${new Date().toISOString()} - ${req.user.name}: ${comment}`;
      
      if (assignee) updateData.assignedTo = assignee;
      
      await bcrService.updateBcr(bcrId, updateData);
    }
    
    res.redirect(`/bcr/update-confirmation/${bcrId}`);
  } catch (error) {
    logger.error('Error updating BCR status:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: 'Failed to update BCR status',
      error,
      user: req.user
    });
  }
}

module.exports = {
  updateStatus,
  resetLowerPhases,
  getPhaseIdForStatus
};
