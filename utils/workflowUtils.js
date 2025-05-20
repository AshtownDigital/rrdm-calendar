/**
 * Workflow Utilities
 * Provides utility functions for working with BCR workflow phases and statuses
 */
const bcrConfigService = require('../services/bcrConfigService');
const logger = require('./logger');

/**
 * Phase status mapping constants
 * These match the values in the database and are used for reference
 */
const WORKFLOW_PHASES = {
  SUBMISSION: '1',
  PRIORITISATION: '2',
  TECHNICAL_REVIEW: '3',
  GOVERNANCE: '4',
  STAKEHOLDER: '5',
  DRAFTING: '6',
  APPROVAL: '7',
  IMPLEMENTATION: '8',
  TESTING: '9',
  GO_LIVE: '10',
  POST_REVIEW: '11',
  CLOSED: '12'
};

/**
 * Status prefixes for different types of statuses
 */
const STATUS_TYPES = {
  CURRENT: '',
  COMPLETED: 'completed:'
};

/**
 * Get the display name for a phase
 * @param {string} phaseId - Phase ID
 * @returns {Promise<string>} - Phase display name
 */
async function getPhaseDisplayName(phaseId) {
  try {
    const phases = await bcrConfigService.getConfigsByType('phase');
    const phase = phases.find(p => p.value === phaseId);
    return phase ? phase.name : 'Unknown Phase';
  } catch (error) {
    logger.error('Error getting phase display name:', error);
    return 'Unknown Phase';
  }
}

/**
 * Get the current status name for a phase
 * @param {string} phaseId - Phase ID
 * @returns {Promise<string>} - Current status name for the phase
 */
async function getCurrentStatusForPhase(phaseId) {
  try {
    const statuses = await bcrConfigService.getConfigsByType('status');
    // Find a status with the matching phase value that doesn't start with 'completed:'
    const status = statuses.find(s => 
      s.value === phaseId && !s.name.startsWith(STATUS_TYPES.COMPLETED)
    );
    return status ? status.name : null;
  } catch (error) {
    logger.error('Error getting current status for phase:', error);
    return null;
  }
}

/**
 * Get the completed status name for a phase
 * @param {string} phaseId - Phase ID
 * @returns {Promise<string>} - Completed status name for the phase
 */
async function getCompletedStatusForPhase(phaseId) {
  try {
    const statuses = await bcrConfigService.getConfigsByType('status');
    // Find a status with the matching phase value that starts with 'completed:'
    const status = statuses.find(s => 
      s.value === phaseId && s.name.startsWith(STATUS_TYPES.COMPLETED)
    );
    return status ? status.name : null;
  } catch (error) {
    logger.error('Error getting completed status for phase:', error);
    return null;
  }
}

/**
 * Get the phase ID for a status name
 * @param {string} statusName - Status name
 * @returns {Promise<string|null>} - Phase ID or null if not found
 */
async function getPhaseIdForStatus(statusName) {
  try {
    const statuses = await bcrConfigService.getConfigsByType('status');
    const status = statuses.find(s => s.name === statusName);
    return status ? status.value : null;
  } catch (error) {
    logger.error('Error getting phase ID for status:', error);
    return null;
  }
}

/**
 * Get the Trello list name for a phase
 * @param {string} phaseId - Phase ID
 * @returns {Promise<string|null>} - Trello list name or null if not found
 */
async function getTrelloListForPhase(phaseId) {
  try {
    const trelloMappings = await bcrConfigService.getConfigsByType('trello_list_mapping');
    const mapping = trelloMappings.find(m => m.value === phaseId);
    return mapping ? mapping.name : null;
  } catch (error) {
    logger.error('Error getting Trello list for phase:', error);
    return null;
  }
}

/**
 * Get the next phase ID in the workflow
 * @param {string} currentPhaseId - Current phase ID
 * @returns {Promise<string|null>} - Next phase ID or null if at the end
 */
async function getNextPhaseId(currentPhaseId) {
  try {
    const phases = await bcrConfigService.getConfigsByType('phase');
    // Sort phases by their numeric value
    const sortedPhases = [...phases].sort((a, b) => parseInt(a.value) - parseInt(b.value));
    
    const currentIndex = sortedPhases.findIndex(p => p.value === currentPhaseId);
    if (currentIndex === -1 || currentIndex === sortedPhases.length - 1) {
      return null; // Not found or already at the last phase
    }
    
    return sortedPhases[currentIndex + 1].value;
  } catch (error) {
    logger.error('Error getting next phase ID:', error);
    return null;
  }
}

/**
 * Get the previous phase ID in the workflow
 * @param {string} currentPhaseId - Current phase ID
 * @returns {Promise<string|null>} - Previous phase ID or null if at the beginning
 */
async function getPreviousPhaseId(currentPhaseId) {
  try {
    const phases = await bcrConfigService.getConfigsByType('phase');
    // Sort phases by their numeric value
    const sortedPhases = [...phases].sort((a, b) => parseInt(a.value) - parseInt(b.value));
    
    const currentIndex = sortedPhases.findIndex(p => p.value === currentPhaseId);
    if (currentIndex <= 0) {
      return null; // Not found or already at the first phase
    }
    
    return sortedPhases[currentIndex - 1].value;
  } catch (error) {
    logger.error('Error getting previous phase ID:', error);
    return null;
  }
}

/**
 * Get all phases with their associated statuses
 * @returns {Promise<Object>} - Object with phases and their statuses
 */
async function getAllPhasesWithStatuses() {
  try {
    return await bcrConfigService.getPhasesWithStatuses();
  } catch (error) {
    logger.error('Error getting all phases with statuses:', error);
    return { phases: [], phaseStatusMapping: {} };
  }
}

/**
 * Get the appropriate status tag class based on the status name
 * Uses GOV.UK Design System tag colors
 * @param {string} statusName - Status name
 * @returns {string} - CSS class for the status tag
 */
function getStatusTagClass(statusName) {
  // If it's a completed status
  if (statusName.startsWith(STATUS_TYPES.COMPLETED)) {
    return 'govuk-tag govuk-tag--green'; // Completed status (green)
  }
  
  // Map specific statuses to tag colors
  const statusTagMap = {
    'Submission': 'govuk-tag govuk-tag--blue', // New/pending (blue)
    'Submission Received': 'govuk-tag govuk-tag--purple', // Received (purple)
    'Prioritisation': 'govuk-tag govuk-tag--purple', // Received (purple)
    'Technical Review and Analysis': 'govuk-tag govuk-tag--light-blue', // In-progress (light blue)
    'Governance Playback': 'govuk-tag govuk-tag--turquoise', // Active/in-use (turquoise)
    'Stakeholder Consultation': 'govuk-tag govuk-tag--pink', // Sent (pink)
    'Final Drafting': 'govuk-tag govuk-tag--orange', // Warning (orange)
    'Final Approval': 'govuk-tag', // Default (blue)
    'Implementation': 'govuk-tag govuk-tag--turquoise', // Active/in-use (turquoise)
    'Validation & Testing': 'govuk-tag govuk-tag--yellow', // Delayed/waiting (yellow)
    'Go Live': 'govuk-tag govuk-tag--green', // Success (green)
    'Post-Implementation Review': 'govuk-tag govuk-tag--grey', // Neutral (grey)
    'Closed': 'govuk-tag govuk-tag--grey' // Inactive (grey)
  };
  
  return statusTagMap[statusName] || 'govuk-tag'; // Default to blue tag if not found
}

module.exports = {
  WORKFLOW_PHASES,
  STATUS_TYPES,
  getPhaseDisplayName,
  getCurrentStatusForPhase,
  getCompletedStatusForPhase,
  getPhaseIdForStatus,
  getTrelloListForPhase,
  getNextPhaseId,
  getPreviousPhaseId,
  getAllPhasesWithStatuses,
  getStatusTagClass
};
