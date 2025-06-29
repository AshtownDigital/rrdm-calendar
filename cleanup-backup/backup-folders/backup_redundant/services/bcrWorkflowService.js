/**
 * BCR Workflow Service
 * Handles BCR workflow transitions and status updates based on the BPMN process
 */
const mongoose = require('mongoose');
const { BcrWorkflowActivity } = require('../models');
require('../config/database.mongo');
const { v4: uuidv4 } = require('uuid');
const bcrService = require('./bcrService');
const bcrConfigService = require('./bcrConfigService');
const { logger } = require('../utils/logger');

/**
 * Get the current workflow state for a BCR
 * @param {string} bcrId - BCR ID
 * @returns {Promise<Object>} - Current workflow state
 */
const getCurrentWorkflowState = async (bcrId) => {
  try {
    const bcr = await bcrService.getBcrById(bcrId);
    if (!bcr) {
      throw new Error(`BCR with ID ${bcrId} not found`);
    }

    // Get all phases and statuses
    const phases = await bcrConfigService.getConfigsByType('phase');
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    // Get phase-status mappings
    const inProgressStatusMappings = await bcrConfigService.getConfigsByType('phase_inProgressStatus');
    const completedStatusMappings = await bcrConfigService.getConfigsByType('phase_completedStatus');
    
    // Get current phase and status
    const currentPhase = phases.find(p => {
      try {
        const phaseData = JSON.parse(p.value);
        return phaseData.id.toString() === bcr.currentPhaseId;
      } catch (e) {
        return p.value === bcr.currentPhaseId;
      }
    });
    
    // Find the current status
    const currentStatus = statuses.find(s => s.name === bcr.status);
    
    return {
      bcr,
      currentPhase,
      currentStatus,
      phases,
      statuses,
      inProgressStatusMappings,
      completedStatusMappings
    };
  } catch (error) {
    logger.error('Error getting current workflow state:', error);
    throw error;
  }
};

/**
 * Get available transitions for the current workflow state
 * @param {string} bcrId - BCR ID
 * @returns {Promise<Array>} - Available transitions
 */
const getAvailableTransitions = async (bcrId) => {
  try {
    const { bcr, currentPhase, phases } = await getCurrentWorkflowState(bcrId);
    
    // Get phase transitions
    const phaseTransitions = await bcrConfigService.getConfigsByType('phase_transition');
    
    // Parse the current phase ID
    let currentPhaseId;
    try {
      currentPhaseId = JSON.parse(currentPhase.value).id.toString();
    } catch (e) {
      currentPhaseId = currentPhase.value;
    }
    
    // Filter transitions that start from the current phase
    const availableTransitions = phaseTransitions.filter(transition => {
      try {
        const transitionData = JSON.parse(transition.value);
        return transitionData.fromPhaseId.toString() === currentPhaseId;
      } catch (e) {
        return false;
      }
    });
    
    // Map transitions to include destination phase details
    return availableTransitions.map(transition => {
      const transitionData = JSON.parse(transition.value);
      const toPhase = phases.find(p => {
        try {
          const phaseData = JSON.parse(p.value);
          return phaseData.id.toString() === transitionData.toPhaseId.toString();
        } catch (e) {
          return p.value === transitionData.toPhaseId.toString();
        }
      });
      
      return {
        transition,
        transitionData,
        toPhase
      };
    });
  } catch (error) {
    logger.error('Error getting available transitions:', error);
    throw error;
  }
};

/**
 * Check if a BCR is valid (has all required information)
 * @param {Object} bcr - BCR object
 * @returns {boolean} - Whether the BCR is valid
 */
const isBcrValid = (bcr) => {
  // Check for required fields based on the BPMN process
  return (
    bcr.description && 
    bcr.description.trim() !== '' &&
    bcr.priority &&
    bcr.requestedBy
  );
};

/**
 * Check if approval is required for a BCR
 * @param {Object} bcr - BCR object
 * @returns {boolean} - Whether approval is required
 */
const isApprovalRequired = (bcr) => {
  // Default to requiring approval for high and critical priority
  return ['high', 'critical'].includes(bcr.priority);
};

/**
 * Check if testing was successful for a BCR
 * @param {Object} bcr - BCR object
 * @param {Object} testingData - Testing data
 * @returns {boolean} - Whether testing was successful
 */
const isTestingSuccessful = (bcr, testingData) => {
  return testingData && testingData.success === true;
};

/**
 * Transition a BCR to the next phase based on the BPMN process
 * @param {string} bcrId - BCR ID
 * @param {Object} transitionData - Transition data
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Updated BCR
 */
const transitionBcr = async (bcrId, transitionData, options = {}) => {
  try {
    const { bcr, phases, statuses, inProgressStatusMappings } = await getCurrentWorkflowState(bcrId);
    
    // Get the destination phase
    const toPhase = phases.find(p => {
      try {
        const phaseData = JSON.parse(p.value);
        return phaseData.id.toString() === transitionData.toPhaseId.toString();
      } catch (e) {
        return p.value === transitionData.toPhaseId.toString();
      }
    });
    
    if (!toPhase) {
      throw new Error(`Destination phase ${transitionData.toPhaseId} not found`);
    }
    
    // Get the in-progress status for the destination phase
    const inProgressStatusMapping = inProgressStatusMappings.find(mapping => {
      return mapping.name === `phase${transitionData.toPhaseId}_inProgressStatus`;
    });
    
    if (!inProgressStatusMapping) {
      throw new Error(`In-progress status for phase ${transitionData.toPhaseId} not found`);
    }
    
    // Update the BCR
    const updateData = {
      currentPhaseId: transitionData.toPhaseId.toString(),
      status: inProgressStatusMapping.value,
      updatedAt: new Date()
    };
    
    // Add comment if provided
    if (options.comment) {
      const currentNotes = bcr.notes || '';
      updateData.notes = `${currentNotes}\n\n${new Date().toISOString()} - ${options.user || 'System'}: ${options.comment}`;
    }
    
    // Update assignee if provided
    if (options.assignee) {
      updateData.assignedTo = options.assignee;
    }
    
    // Update the BCR
    const updatedBcr = await bcrService.updateBcr(bcrId, updateData);
    
    // Create a workflow activity record
    await createWorkflowActivity({
      bcrId,
      fromPhaseId: transitionData.fromPhaseId.toString(),
      toPhaseId: transitionData.toPhaseId.toString(),
      fromStatus: bcr.status,
      toStatus: inProgressStatusMapping.value,
      userId: options.userId || null,
      comment: options.comment || `Transitioned from ${transitionData.fromPhaseId} to ${transitionData.toPhaseId}`
    });
    
    return updatedBcr;
  } catch (error) {
    logger.error('Error transitioning BCR:', error);
    throw error;
  }
};

/**
 * Create a workflow activity record
 * @param {Object} activityData - Activity data
 * @returns {Promise<Object>} - Created activity
 */
const createWorkflowActivity = async (activityData) => {
  try {
    return await BcrWorkflowActivity.create({
      bcrId: activityData.bcrId,
      action: activityData.fromPhaseId + ' -> ' + activityData.toPhaseId,
      fromPhase: activityData.fromPhaseId,
      toPhase: activityData.toPhaseId,
      fromStatus: activityData.fromStatus,
      toStatus: activityData.toStatus,
      performedBy: activityData.userId,
      comments: activityData.comment,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error creating workflow activity:', error);
    // Don't throw the error to prevent disrupting the main workflow
    return null;
  }
};

/**
 * Complete the current phase of a BCR
 * @param {string} bcrId - BCR ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Updated BCR
 */
const completeCurrentPhase = async (bcrId, options = {}) => {
  try {
    const { bcr, currentPhase, completedStatusMappings } = await getCurrentWorkflowState(bcrId);
    
    // Parse the current phase ID
    let currentPhaseId;
    try {
      currentPhaseId = JSON.parse(currentPhase.value).id.toString();
    } catch (e) {
      currentPhaseId = currentPhase.value;
    }
    
    // Get the completed status for the current phase
    const completedStatusMapping = completedStatusMappings.find(mapping => {
      return mapping.name === `phase${currentPhaseId}_completedStatus`;
    });
    
    if (!completedStatusMapping) {
      throw new Error(`Completed status for phase ${currentPhaseId} not found`);
    }
    
    // Update the BCR
    const updateData = {
      status: completedStatusMapping.value,
      updatedAt: new Date()
    };
    
    // Add comment if provided
    if (options.comment) {
      const currentNotes = bcr.notes || '';
      updateData.notes = `${currentNotes}\n\n${new Date().toISOString()} - ${options.user || 'System'}: ${options.comment}`;
    }
    
    // Update the BCR
    const updatedBcr = await bcrService.updateBcr(bcrId, updateData);
    
    // Create a workflow activity record
    await createWorkflowActivity({
      bcrId,
      fromPhaseId: currentPhaseId,
      toPhaseId: currentPhaseId,
      fromStatus: bcr.status,
      toStatus: completedStatusMapping.value,
      userId: options.userId || null,
      comment: options.comment || `Completed phase ${currentPhaseId}`
    });
    
    return updatedBcr;
  } catch (error) {
    logger.error('Error completing current phase:', error);
    throw error;
  }
};

/**
 * Process a decision point in the workflow
 * @param {string} bcrId - BCR ID
 * @param {string} decisionPoint - Decision point name
 * @param {boolean} decision - Decision value
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Updated BCR
 */
const processDecisionPoint = async (bcrId, decisionPoint, decision, options = {}) => {
  try {
    const { bcr, currentPhase } = await getCurrentWorkflowState(bcrId);
    const availableTransitions = await getAvailableTransitions(bcrId);
    
    // Parse the current phase ID
    let currentPhaseId;
    try {
      currentPhaseId = JSON.parse(currentPhase.value).id.toString();
    } catch (e) {
      currentPhaseId = currentPhase.value;
    }
    
    // Handle different decision points
    switch (decisionPoint) {
      case 'is_bcr_valid':
        if (decision) {
          // If valid, transition to Detailed Analysis
          const transition = availableTransitions.find(t => 
            t.transitionData.condition === 'valid_bcr'
          );
          
          if (!transition) {
            throw new Error('No valid transition found for valid BCR');
          }
          
          return transitionBcr(bcrId, transition.transitionData, options);
        } else {
          // If not valid, update status to request additional information
          const updateData = {
            status: 'Additional Information Requested',
            updatedAt: new Date()
          };
          
          // Add comment if provided
          if (options.comment) {
            const currentNotes = bcr.notes || '';
            updateData.notes = `${currentNotes}\n\n${new Date().toISOString()} - ${options.user || 'System'}: ${options.comment}`;
          }
          
          return bcrService.updateBcr(bcrId, updateData);
        }
        
      case 'approval_required':
        if (decision) {
          // If approval required, transition to Approval Process
          const transition = availableTransitions.find(t => 
            t.transitionData.condition === 'approval_required'
          );
          
          if (!transition) {
            throw new Error('No transition found for approval required');
          }
          
          return transitionBcr(bcrId, transition.transitionData, options);
        } else {
          // If no approval required, transition to Implementation
          const transition = availableTransitions.find(t => 
            t.transitionData.condition === 'no_approval_required'
          );
          
          if (!transition) {
            throw new Error('No transition found for no approval required');
          }
          
          return transitionBcr(bcrId, transition.transitionData, options);
        }
        
      case 'approved':
        if (decision) {
          // If approved, transition to Implementation
          const transition = availableTransitions.find(t => 
            t.transitionData.condition === 'approved'
          );
          
          if (!transition) {
            throw new Error('No transition found for approved');
          }
          
          return transitionBcr(bcrId, transition.transitionData, options);
        } else {
          // If rejected, update status to Rejected
          const updateData = {
            status: 'Rejected',
            updatedAt: new Date()
          };
          
          // Add comment if provided
          if (options.comment) {
            const currentNotes = bcr.notes || '';
            updateData.notes = `${currentNotes}\n\n${new Date().toISOString()} - ${options.user || 'System'}: ${options.comment}`;
          }
          
          return bcrService.updateBcr(bcrId, updateData);
        }
        
      case 'testing_successful':
        if (decision) {
          // If testing successful, transition to Go Live
          const transition = availableTransitions.find(t => 
            t.transitionData.condition === 'testing_passed'
          );
          
          if (!transition) {
            throw new Error('No transition found for testing passed');
          }
          
          return transitionBcr(bcrId, transition.transitionData, options);
        } else {
          // If testing failed, transition back to Implementation
          const transition = availableTransitions.find(t => 
            t.transitionData.condition === 'testing_failed'
          );
          
          if (!transition) {
            throw new Error('No transition found for testing failed');
          }
          
          return transitionBcr(bcrId, transition.transitionData, options);
        }
        
      default:
        throw new Error(`Unknown decision point: ${decisionPoint}`);
    }
  } catch (error) {
    logger.error('Error processing decision point:', error);
    throw error;
  }
};

/**
 * Get workflow history for a BCR
 * @param {string} bcrId - BCR ID
 * @returns {Promise<Array>} - Workflow history
 */
const getWorkflowHistory = async (bcrId) => {
  try {
    return await BcrWorkflowActivity.find({ bcrId }).sort({ timestamp: -1 });
  } catch (error) {
    logger.error('Error getting workflow history:', error);
    return [];
  }
};

module.exports = {
  getCurrentWorkflowState,
  getAvailableTransitions,
  transitionBcr,
  completeCurrentPhase,
  processDecisionPoint,
  getWorkflowHistory,
  isBcrValid,
  isApprovalRequired,
  isTestingSuccessful
};
