/**
 * BCR Status Controller
 * Handles BCR status updates and phase transitions
 */
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');

/**
 * Helper function to reset all phases below the current phase
 * @param {Object} submission - BCR submission object
 * @param {string} currentPhaseId - Current phase ID
 * @param {Array} phases - Array of phase objects
 */
const resetLowerPhases = async (submission, currentPhaseId, phases) => {
  // If there's no workflow history, nothing to reset
  if (!submission.workflowHistory) {
    return;
  }
  
  // Get all phase IDs higher than the current phase
  const higherPhaseIds = phases
    .filter(phase => phase.id > currentPhaseId)
    .map(phase => phase.id);
  
  // Mark all workflow history items for higher phases as 'not completed'
  submission.workflowHistory.forEach(item => {
    // Try to find which phase this history item belongs to
    const statusName = item.action.includes('Status Updated') ? 
      item.notes.replace('Changed status to ', '') : null;
    
    if (statusName) {
      // Find the phase ID for this status
      const phaseId = getPhaseIdForStatus(statusName, phases);
      
      // If this history item is for a higher phase, mark it as not completed
      if (phaseId && higherPhaseIds.includes(phaseId)) {
        item.completed = false;
      }
    }
  });
  
  // Add a note about resetting subsequent phases
  submission.history.push({
    date: new Date().toISOString(),
    action: 'Phases Reset',
    user: 'System',
    notes: `All phases after Phase ${currentPhaseId} have been reset to Not Completed`
  });
};

/**
 * Helper function to get phase ID for a status
 * @param {string} statusName - Status name
 * @returns {string|null} - Phase ID or null if not found
 */
const getPhaseIdForStatus = async (statusName) => {
  try {
    // Find the status in the database using the service
    const statuses = await bcrConfigService.getConfigsByType('status');
    const status = statuses.find(s => s.name === statusName);
    
    if (status) {
      return parseInt(status.value, 10);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting phase ID for status:', error);
    return null;
  }
};

/**
 * Update BCR status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateStatus = async (req, res) => {
  try {
    const bcrId = req.params.id;
    const { status, phase, comment, assignee } = req.body;
    
    // Find the BCR using the service
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).json({ success: false, message: 'BCR not found' });
    }
    
    // Prepare update data
    const updateData = {};
    
    // Update status if provided
    if (status) {
      updateData.status = status;
    }
    
    // Update phase if provided
    if (phase) {
      // Get all phases to determine if we need to reset lower phases
      const phases = await bcrConfigService.getConfigsByType('phase');
      
      // Reset lower phases if needed
      if (bcr.phase && bcr.phase !== phase) {
        resetLowerPhases(bcr, phase, phases);
      }
      
      updateData.phase = phase;
    }
    
    // Add comment to notes if provided
    const currentNotes = bcr.notes || '';
    updateData.notes = `${currentNotes}\n\n${new Date().toISOString()} - ${req.user.name}: ${comment}`;
    
    // Update the assignee if provided
    if (assignee) {
      updateData.assignedTo = assignee;
    }
    
    // Update the BCR using the service
    await bcrService.updateBcr(bcrId, updateData);
    
    // Redirect to confirmation page
    res.redirect(`/bcr/update-confirmation/${bcrId}`);
  } catch (error) {
    console.error('Error updating BCR status:', error);
    res.status(500).json({ success: false, message: 'Failed to update BCR status' });
  }
};

module.exports = {
  updateStatus,
  resetLowerPhases,
  getPhaseIdForStatus
};
