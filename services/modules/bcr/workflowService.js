/**
 * BCR Workflow Service
 * Handles workflow phases, statuses, and transitions for the BCR process
 * Implements the BPMN process diagram workflow
 */
const { Phase, Status, Bcr, Submission } = require('../../../models/modules/bcr/model');
const mongoose = require('mongoose');

/**
 * Get all workflow phases with their associated statuses
 */
exports.getAllPhases = async () => {
  try {
    const phases = await Phase.find({ deleted: { $ne: true } })
      .populate('inProgressStatusId')
      .populate('completedStatusId')
      .populate('trelloStatusId')
      .sort({ displayOrder: 1 })
      .exec();
    
    // Enhance phases with count of BCRs in each phase
    for (let i = 0; i < phases.length; i++) {
      phases[i] = phases[i].toObject();
      phases[i].count = await Bcr.countDocuments({
        currentPhaseId: phases[i]._id,
        deleted: { $ne: true }
      });
    }
    
    return phases;
  } catch (error) {
    console.error('Error in getAllPhases:', error);
    throw error;
  }
};

/**
 * Get all workflow statuses
 */
exports.getAllStatuses = async () => {
  try {
    const statuses = await Status.find({ deleted: { $ne: true } })
      .sort({ displayOrder: 1 })
      .exec();
    
    // Enhance statuses with count of BCRs in each status
    for (let i = 0; i < statuses.length; i++) {
      statuses[i] = statuses[i].toObject();
      statuses[i].count = await Bcr.countDocuments({
        currentStatusId: statuses[i]._id,
        deleted: { $ne: true }
      });
    }
    
    return statuses;
  } catch (error) {
    console.error('Error in getAllStatuses:', error);
    throw error;
  }
};

/**
 * Get a specific phase by ID
 */
exports.getPhaseById = async (phaseId) => {
  try {
    return await Phase.findById(phaseId)
      .populate('inProgressStatusId')
      .populate('completedStatusId')
      .populate('trelloStatusId')
      .exec();
  } catch (error) {
    console.error('Error in getPhaseById:', error);
    throw error;
  }
};

/**
 * Get a specific status by ID
 */
exports.getStatusById = async (statusId) => {
  try {
    return await Status.findById(statusId).exec();
  } catch (error) {
    console.error('Error in getStatusById:', error);
    throw error;
  }
};

/**
 * Get the first phase in the workflow
 */
exports.getInitialPhase = async () => {
  try {
    return await Phase.findOne({ deleted: { $ne: true } })
      .sort({ displayOrder: 1 })
      .populate('inProgressStatusId')
      .exec();
  } catch (error) {
    console.error('Error in getInitialPhase:', error);
    throw error;
  }
};

/**
 * Update a submission's status and create a BCR if approved
 * @param {string} submissionId - The ID of the submission to update
 * @param {string} status - The new status for the submission
 * @param {Object} options - Additional options
 * @param {string} options.comments - Review comments
 * @param {string} options.reviewerId - ID of the reviewer
 * @returns {Object} - The updated submission and BCR if created
 */
exports.updateSubmissionStatus = async (submissionId, status, options = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find the submission
    const submission = await Submission.findById(submissionId).session(session);
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    // Update submission status and review info
    submission.status = status;
    submission.reviewComments = options.comments || '';
    submission.reviewedAt = new Date();
    
    // If approved, convert the submission to a Business Change Request
    let bcr = null;
    if (status === 'Approved') {
      // Get the initial phase and status
      const initialPhase = await exports.getInitialPhase();
      if (!initialPhase) {
        throw new Error('Initial workflow phase not found');
      }
      
      // Generate a BCR number
      const year = new Date().getFullYear();
      const recordNumber = String(submission.recordNumber).padStart(4, '0');
      const bcrNumber = `BCR-${year}-${recordNumber}`;
      
      // Update submission with BCR number
      submission.bcrNumber = bcrNumber;
      
      // Create the Business Change Request
      bcr = new Bcr({
        submissionId: submission._id,
        bcrNumber: bcrNumber,
        title: submission.briefDescription,
        description: submission.justification,
        urgencyLevel: submission.urgencyLevel,
        impactedAreas: submission.impactAreas || [],
        currentPhaseId: initialPhase._id,
        currentStatusId: initialPhase.inProgressStatusId._id,
        status: 'New Submission',
        createdById: options.reviewerId || submission.submittedById,
        updatedById: options.reviewerId || submission.submittedById
      });
      
      // Add an audit log entry for the transition
      bcr.workflowHistory = [{
        date: new Date(),
        action: 'Submission Approved and Converted to BCR',
        userId: options.reviewerId || submission.submittedById,
        details: 'Submission was approved and converted to a Business Change Request',
        phaseId: initialPhase._id,
        statusId: initialPhase.inProgressStatusId._id
      }];
      
      await bcr.save({ session });
      
      // Link the BCR to the submission
      submission.bcrId = bcr._id;
      
      console.log(`Submission ${submission._id} approved and converted to BCR ${bcrNumber}`);
    }
    
    await submission.save({ session });
    await session.commitTransaction();
    
    return { submission, bcr };
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in updateSubmissionStatus:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get the next phase in the workflow
 */
exports.getNextPhase = async (currentPhaseId) => {
  try {
    const currentPhase = await Phase.findById(currentPhaseId);
    
    if (!currentPhase) {
      throw new Error('Current phase not found');
    }
    
    // Find the next phase by display order
    const nextPhase = await Phase.findOne({
      displayOrder: { $gt: currentPhase.displayOrder },
      deleted: { $ne: true }
    })
      .sort({ displayOrder: 1 })
      .populate('inProgressStatusId')
      .exec();
    
    return nextPhase;
  } catch (error) {
    console.error('Error in getNextPhase:', error);
    throw error;
  }
};

/**
 * Get the previous phase in the workflow
 */
exports.getPreviousPhase = async (currentPhaseId) => {
  try {
    const currentPhase = await Phase.findById(currentPhaseId);
    
    if (!currentPhase) {
      throw new Error('Current phase not found');
    }
    
    // Find the previous phase by display order
    const previousPhase = await Phase.findOne({
      displayOrder: { $lt: currentPhase.displayOrder },
      deleted: { $ne: true }
    })
      .sort({ displayOrder: -1 })
      .populate('inProgressStatusId')
      .exec();
    
    return previousPhase;
  } catch (error) {
    console.error('Error in getPreviousPhase:', error);
    throw error;
  }
};

/**
 * Update a BCR's phase and status
 */
exports.updateBcrPhaseStatus = async (bcrId, phaseId, statusId) => {
  try {
    const bcr = await Bcr.findById(bcrId);
    
    if (!bcr) {
      throw new Error('BCR not found');
    }
    
    // Update BCR with new phase and status
    bcr.currentPhaseId = phaseId;
    bcr.currentStatusId = statusId;
    bcr.updatedAt = new Date();
    
    // Add phase transition to history
    if (!bcr.phaseHistory) {
      bcr.phaseHistory = [];
    }
    
    bcr.phaseHistory.push({
      phaseId,
      statusId,
      timestamp: new Date()
    });
    
    await bcr.save();
    return bcr;
  } catch (error) {
    console.error('Error in updateBcrPhaseStatus:', error);
    throw error;
  }
};

/**
 * Get available transitions for a BCR based on current phase and status
 * This implements the BPMN process diagram exactly
 */
exports.getAvailableTransitions = async (bcrId) => {
  try {
    const bcr = await Bcr.findById(bcrId)
      .populate('currentPhaseId')
      .populate('currentStatusId')
      .exec();
    
    if (!bcr) {
      throw new Error('BCR not found');
    }
    
    const currentPhase = bcr.currentPhaseId;
    const currentStatus = bcr.currentStatusId;
    
    if (!currentPhase || !currentStatus) {
      return [];
    }
    
    // Initialize transitions array
    const transitions = [];
    
    // Get all phases and statuses
    const allPhases = await this.getAllPhases();
    const allStatuses = await this.getAllStatuses();
    
    // Define transitions based on the BPMN diagram and current phase/status
    
    // Initial Assessment phase transitions
    if (currentPhase.value === 'initial-assessment') {
      // If in progress, can move to completed status within same phase
      if (currentStatus._id.equals(currentPhase.inProgressStatusId._id)) {
        transitions.push({
          label: 'Complete Initial Assessment',
          phaseId: currentPhase._id,
          statusId: currentPhase.completedStatusId._id,
          decisionPoint: 'Is BCR Valid?'
        });
      }
      // If completed, can move to either Detailed Analysis or reject
      else if (currentStatus._id.equals(currentPhase.completedStatusId._id)) {
        // Find Detailed Analysis phase
        const detailedAnalysisPhase = allPhases.find(p => p.value === 'detailed-analysis');
        if (detailedAnalysisPhase) {
          transitions.push({
            label: 'Move to Detailed Analysis',
            phaseId: detailedAnalysisPhase._id,
            statusId: detailedAnalysisPhase.inProgressStatusId._id,
            decisionPoint: 'Yes - Proceed to Analysis'
          });
        }
        
        // Find Rejected status
        const rejectedStatus = allStatuses.find(s => s.value === 'rejected');
        if (rejectedStatus) {
          transitions.push({
            label: 'Reject BCR',
            phaseId: currentPhase._id,
            statusId: rejectedStatus._id,
            decisionPoint: 'No - Reject BCR'
          });
        }
      }
    }
    
    // Detailed Analysis phase transitions
    else if (currentPhase.value === 'detailed-analysis') {
      // If in progress, can move to completed status within same phase
      if (currentStatus._id.equals(currentPhase.inProgressStatusId._id)) {
        transitions.push({
          label: 'Complete Detailed Analysis',
          phaseId: currentPhase._id,
          statusId: currentPhase.completedStatusId._id
        });
      }
      // If completed, can move to Stakeholder Consultation
      else if (currentStatus._id.equals(currentPhase.completedStatusId._id)) {
        // Find Stakeholder Consultation phase
        const consultationPhase = allPhases.find(p => p.value === 'stakeholder-consultation');
        if (consultationPhase) {
          transitions.push({
            label: 'Move to Stakeholder Consultation',
            phaseId: consultationPhase._id,
            statusId: consultationPhase.inProgressStatusId._id
          });
        }
      }
    }
    
    // Stakeholder Consultation phase transitions
    else if (currentPhase.value === 'stakeholder-consultation') {
      // If in progress, can move to completed status within same phase
      if (currentStatus._id.equals(currentPhase.inProgressStatusId._id)) {
        transitions.push({
          label: 'Complete Stakeholder Consultation',
          phaseId: currentPhase._id,
          statusId: currentPhase.completedStatusId._id,
          description: 'Mark stakeholder consultation as completed'
        });
      }
      // If completed, can move to Impact Assessment
      else if (currentStatus._id.equals(currentPhase.completedStatusId._id)) {
        // Find Impact Assessment phase
        const impactPhase = allPhases.find(p => p.value === 'impact-assessment');
        if (impactPhase) {
          transitions.push({
            label: 'Move to Impact Assessment',
            phaseId: impactPhase._id,
            statusId: impactPhase.inProgressStatusId._id,
            description: 'Begin impact assessment phase'
          });
        }
      }
    }
    
    // Impact Assessment phase transitions
    else if (currentPhase.value === 'impact-assessment') {
      // If in progress, can move to completed status within same phase
      if (currentStatus._id.equals(currentPhase.inProgressStatusId._id)) {
        transitions.push({
          label: 'Complete Impact Assessment',
          phaseId: currentPhase._id,
          statusId: currentPhase.completedStatusId._id,
          description: 'Mark impact assessment as completed'
        });
      }
      // If completed, can move to Decision
      else if (currentStatus._id.equals(currentPhase.completedStatusId._id)) {
        // Find Decision phase
        const decisionPhase = allPhases.find(p => p.value === 'decision');
        if (decisionPhase) {
          transitions.push({
            label: 'Move to Decision Phase',
            phaseId: decisionPhase._id,
            statusId: decisionPhase.inProgressStatusId._id,
            description: 'Begin decision phase'
          });
        }
      }
    }
    
    // Decision phase transitions
    else if (currentPhase.value === 'decision') {
      // If in progress, can move to either approved or rejected
      if (currentStatus._id.equals(currentPhase.inProgressStatusId._id)) {
        // Approved - move to completed
        transitions.push({
          label: 'Approve BCR',
          phaseId: currentPhase._id,
          statusId: currentPhase.completedStatusId._id,
          description: 'Approve this BCR'
        });
        
        // Rejected - find rejected status
        const rejectedStatus = allStatuses.find(s => s.value === 'rejected');
        if (rejectedStatus) {
          transitions.push({
            label: 'Reject BCR',
            phaseId: currentPhase._id,
            statusId: rejectedStatus._id,
            description: 'Reject this BCR'
          });
        }
      }
      // If completed (approved), can move to Implementation
      else if (currentStatus._id.equals(currentPhase.completedStatusId._id)) {
        // Find Implementation phase
        const implementationPhase = allPhases.find(p => p.value === 'implementation');
        if (implementationPhase) {
          transitions.push({
            label: 'Move to Implementation',
            phaseId: implementationPhase._id,
            statusId: implementationPhase.inProgressStatusId._id,
            description: 'Begin implementation phase'
          });
        }
      }
    }
    
    // Implementation phase transitions
    else if (currentPhase.value === 'implementation') {
      // If in progress, can move to completed
      if (currentStatus._id.equals(currentPhase.inProgressStatusId._id)) {
        transitions.push({
          label: 'Complete Implementation',
          phaseId: currentPhase._id,
          statusId: currentPhase.completedStatusId._id,
          description: 'Mark implementation as completed'
        });
      }
      // If completed, can move to Testing
      else if (currentStatus._id.equals(currentPhase.completedStatusId._id)) {
        // Find Testing phase
        const testingPhase = allPhases.find(p => p.value === 'testing');
        if (testingPhase) {
          transitions.push({
            label: 'Move to Testing',
            phaseId: testingPhase._id,
            statusId: testingPhase.inProgressStatusId._id,
            description: 'Begin testing phase'
          });
        }
      }
    }
    
    // Testing phase transitions
    else if (currentPhase.value === 'testing') {
      // If in progress, can move to completed
      if (currentStatus._id.equals(currentPhase.inProgressStatusId._id)) {
        transitions.push({
          label: 'Complete Testing',
          phaseId: currentPhase._id,
          statusId: currentPhase.completedStatusId._id,
          description: 'Mark testing as completed'
        });
      }
      // If completed, can move to Deployment
      else if (currentStatus._id.equals(currentPhase.completedStatusId._id)) {
        // Find Deployment phase
        const deploymentPhase = allPhases.find(p => p.value === 'deployment');
        if (deploymentPhase) {
          transitions.push({
            label: 'Move to Deployment',
            phaseId: deploymentPhase._id,
            statusId: deploymentPhase.inProgressStatusId._id,
            description: 'Begin deployment phase'
          });
        }
      }
    }
    
    // Deployment phase transitions
    else if (currentPhase.value === 'deployment') {
      // If in progress, can move to completed
      if (currentStatus._id.equals(currentPhase.inProgressStatusId._id)) {
        transitions.push({
          label: 'Complete Deployment',
          phaseId: currentPhase._id,
          statusId: currentPhase.completedStatusId._id,
          description: 'Mark deployment as completed'
        });
      }
      // If completed, can move to Closed
      else if (currentStatus._id.equals(currentPhase.completedStatusId._id)) {
        // Find Closed status
        const closedStatus = allStatuses.find(s => s.value === 'closed');
        if (closedStatus) {
          transitions.push({
            label: 'Close BCR',
            phaseId: currentPhase._id,
            statusId: closedStatus._id,
            description: 'Close this BCR (final state)'
          });
        }
      }
    }
    
    // Add a default transition for any phase to allow moving to the next logical phase
    // This is a fallback in case the specific phase isn't handled above
    if (transitions.length === 0 && currentStatus._id.equals(currentPhase.inProgressStatusId._id)) {
      transitions.push({
        label: `Complete ${currentPhase.name}`,
        phaseId: currentPhase._id,
        statusId: currentPhase.completedStatusId._id,
        description: `Mark ${currentPhase.name} as completed`
      });
    }
    
    // Add description and phaseName/statusName to each transition for better UI display
    return transitions.map(transition => {
      // Find phase and status objects
      const phase = allPhases.find(p => p._id.equals(transition.phaseId));
      const status = allStatuses.find(s => s._id.equals(transition.statusId));
      
      return {
        ...transition,
        phaseName: phase ? phase.name : 'Unknown Phase',
        statusName: status ? status.name : 'Unknown Status',
        description: transition.description || `Move to ${status ? status.name : 'next status'} in ${phase ? phase.name : 'current phase'}`
      };
    });
  } catch (error) {
    console.error('Error in getAvailableTransitions:', error);
    throw error;
  }
};

/**
 * Get color-coded tag for a status
 * Using standardized GOV.UK Design System colors
 */
exports.getStatusTag = (status) => {
  if (!status) {
    return { text: 'Unknown', class: 'govuk-tag govuk-tag--grey' };
  }
  
  const statusValue = status.value ? status.value.toLowerCase() : '';
  
  // Using standardized GOV.UK Design System colors
  switch (statusValue) {
    // Completed/success statuses (green)
    case 'completed':
    case 'approved':
    case 'done':
      return { text: status.name, class: 'govuk-tag govuk-tag--green' };
    
    // In progress statuses (blue)
    case 'in-progress':
    case 'pending':
    case 'review':
      return { text: status.name, class: 'govuk-tag govuk-tag--blue' };
    
    // Active statuses (turquoise)
    case 'active':
    case 'implementation':
      return { text: status.name, class: 'govuk-tag govuk-tag--turquoise' };
    
    // Rejected/error statuses (red)
    case 'rejected':
    case 'failed':
      return { text: status.name, class: 'govuk-tag govuk-tag--red' };
    
    // Warning/delayed statuses (yellow)
    case 'delayed':
    case 'waiting':
      return { text: status.name, class: 'govuk-tag govuk-tag--yellow' };
      
    // Default (blue)
    default:
      return { text: status.name, class: 'govuk-tag' };
  }
};
