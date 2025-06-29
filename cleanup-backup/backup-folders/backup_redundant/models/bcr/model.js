/**
 * BCR Model
 * Handles database operations for BCRs using MongoDB
 */
const { v4: uuidv4 } = require('uuid');
const { WORKFLOW_PHASES, PHASE_STATUSES, URGENCY_LEVELS } = require('../../config/constants');

// Import MongoDB models
const Bcr = require('../Bcr');
const Submission = require('../Submission');
const User = require('../User');

/**
 * Generate a BCR code in the format BCR-YY/YY-NNN
 * @param {number} recordNumber - The record number to use in the code
 * @returns {string} - The formatted BCR code
 */
const generateBcrCode = (recordNumber) => {
  // Get current academic year (UK academic year runs from September to August)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Determine academic year
  let academicYearStart = currentYear;
  if (currentMonth < 9) { // If before September, we're in the previous academic year
    academicYearStart = currentYear - 1;
  }
  
  const academicYearEnd = academicYearStart + 1;
  
  // Format as YY/YY
  const yearFormat = `${String(academicYearStart).slice(-2)}/${String(academicYearEnd).slice(-2)}`;
  
  // Format record number with leading zeros
  const formattedNumber = String(recordNumber).padStart(3, '0');
  
  return `BCR-${yearFormat}-${formattedNumber}`;
};

/**
 * Create a new BCR from a submission
 * @param {string} submissionId - The ID of the submission to create a BCR from
 * @returns {Promise<Object>} - The created BCR
 */
const createBcrFromSubmission = async (submissionId) => {
  try {
    // Get the submission from the database
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    if (submission.deletedAt) {
      throw new Error('Cannot create BCR from deleted submission');
    }
    
    // Check if a BCR already exists for this submission
    const existingBcr = await Bcr.findOne({ submissionId });
    
    if (existingBcr) {
      console.log(`BCR already exists for submission ${submissionId}: ${existingBcr.bcrCode}`);
      return existingBcr;
    }
    
    // Get next record number
    const lastBcr = await Bcr.findOne({}, {}, { sort: { 'recordNumber': -1 } });
    
    const recordNumber = lastBcr ? lastBcr.recordNumber + 1 : 1;
    const bcrCode = generateBcrCode(recordNumber);
    
    // Create the BCR
    const bcr = new Bcr({
      recordNumber,
      bcrCode,
      submissionId: submission._id,
      currentPhase: WORKFLOW_PHASES[0], // Start at first phase
      status: PHASE_STATUSES[1], // In Progress
      urgencyLevel: submission.urgencyLevel,
      impactedAreas: submission.impactAreas || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      workflowHistory: [{
        phase: WORKFLOW_PHASES[0],
        status: PHASE_STATUSES[1],
        comment: 'BCR created from submission',
        updatedBy: 'System',
        timestamp: new Date()
      }]
    });
    
    await bcr.save();
    
    // Update the submission with the BCR ID
    submission.bcrId = bcr._id;
    await submission.save();
    
    return bcr;
  } catch (error) {
    console.error('Error creating BCR from submission:', error);
    throw error;
  }
};

/**
 * Get a BCR by ID
 * @param {string} id - The BCR ID or BCR code
 * @returns {Promise<Object>} - The BCR
 */
const getBcrById = async (id) => {
  try {
    // Try to find the BCR in the database
    let bcr = null;
    
    console.log(`Looking for BCR with ID: ${id}`);
    
    // Check if the ID is a UUID or a BCR code
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || 
        /^[0-9a-f]{24}$/i.test(id)) {
      console.log('ID appears to be a UUID or MongoDB ObjectId');
      
      // If it's a UUID or ObjectId, find by _id
      bcr = await Bcr.findById(id)
        .populate({
          path: 'submissionId',
          populate: {
            path: 'submittedById',
            model: 'User'
          }
        });
    } else {
      console.log('ID appears to be a BCR code');
      
      // If it's a BCR code, find by bcrCode
      bcr = await Bcr.findOne({ bcrCode: id })
        .populate({
          path: 'submissionId',
          populate: {
            path: 'submittedById',
            model: 'User'
          }
        });
    }
    
    if (bcr) {
      console.log(`Found BCR: ${bcr.bcrCode}`);
      
      // Add tag colors based on status
      if (bcr.status === 'Completed') {
        bcr.statusTagColor = 'govuk-tag govuk-tag--green';
      } else if (bcr.status === 'Rejected') {
        bcr.statusTagColor = 'govuk-tag govuk-tag--red';
      } else if (bcr.status === 'On Hold') {
        bcr.statusTagColor = 'govuk-tag govuk-tag--yellow';
      } else {
        bcr.statusTagColor = 'govuk-tag govuk-tag--blue';
      }
    }
    
    return bcr;
  } catch (error) {
    console.error('Error in getBcrById:', error);
    return null;
  }
};

/**
 * Get all BCRs
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - Array of BCRs
 */
const getAllBcrs = async (filters = {}) => {
  const query = {};
  
  // Apply filters if provided
  if (filters.currentPhase) {
    query.currentPhase = filters.currentPhase;
  }
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.urgencyLevel) {
    query.urgencyLevel = filters.urgencyLevel;
  }
  
  const bcrs = await Bcr.find(query)
    .populate({
      path: 'submissionId',
      populate: {
        path: 'submittedById',
        model: 'User'
      }
    })
    .sort({ createdAt: -1 });
  
  return bcrs;
};

/**
 * Update a BCR's phase and status
 * @param {string} id - The BCR ID
 * @param {string} phase - The new phase
 * @param {string} status - The new status
 * @param {string} comment - Comment about the update
 * @param {string} updatedBy - User who made the update
 * @returns {Promise<Object>} - The updated BCR
 */
const updateBcrPhase = async (id, phase, status, comment, updatedBy) => {
  // Validate phase and status
  if (!WORKFLOW_PHASES.includes(phase)) {
    throw new Error(`Invalid phase: ${phase}`);
  }
  
  if (!PHASE_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  
  // Get the current BCR
  const bcr = await Bcr.findById(id);
  
  if (!bcr) {
    throw new Error('BCR not found');
  }
  
  // Create a history entry
  const historyEntry = {
    phase,
    status,
    comment: comment || 'Phase updated',
    updatedBy: updatedBy || 'System',
    timestamp: new Date()
  };
  
  // Update the BCR
  bcr.currentPhase = phase;
  bcr.status = status;
  bcr.workflowHistory = [...(bcr.workflowHistory || []), historyEntry];
  bcr.updatedAt = new Date();
  
  await bcr.save();
  
  return bcr;
};

/**
 * Auto-advance a BCR to the next phase
 * @param {string} id - The BCR ID
 * @returns {Promise<Object>} - The updated BCR
 */
const autoAdvancePhase = async (id) => {
  // Get the current BCR
  const bcr = await Bcr.findById(id);
  
  if (!bcr) {
    throw new Error('BCR not found');
  }
  
  // If the current phase is completed or skipped, move to the next phase
  if (bcr.status === PHASE_STATUSES[2] || bcr.status === PHASE_STATUSES[3]) {
    const currentPhaseIndex = WORKFLOW_PHASES.indexOf(bcr.currentPhase);
    
    // If we're at the last phase, do nothing
    if (currentPhaseIndex === WORKFLOW_PHASES.length - 1) {
      return bcr;
    }
    
    // Move to the next phase
    const nextPhase = WORKFLOW_PHASES[currentPhaseIndex + 1];
    
    // Create a history entry
    const historyEntry = {
      phase: nextPhase,
      status: PHASE_STATUSES[1], // In Progress
      comment: 'Automatically advanced to next phase',
      updatedBy: 'System',
      timestamp: new Date()
    };
    
    // Update the BCR
    bcr.currentPhase = nextPhase;
    bcr.status = PHASE_STATUSES[1]; // In Progress
    bcr.workflowHistory = [...(bcr.workflowHistory || []), historyEntry];
    bcr.updatedAt = new Date();
    
    await bcr.save();
    
    return bcr;
  }
  
  // If the current phase is not completed or skipped, do nothing
  return bcr;
};

module.exports = {
  createBcrFromSubmission,
  getBcrById,
  getAllBcrs,
  updateBcrPhase,
  autoAdvancePhase,
  generateBcrCode
};
