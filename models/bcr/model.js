/**
 * BCR Model
 * Handles database operations for BCRs using Prisma
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();
const { WORKFLOW_PHASES, PHASE_STATUSES, URGENCY_LEVELS } = require('../../config/constants');

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
    const submission = await prisma.Submission.findUnique({
      where: { id: submissionId },
      include: { bcr: true }
    });
    
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    if (submission.deletedAt) {
      throw new Error('Cannot create BCR from deleted submission');
    }
    
    // Check if a BCR already exists for this submission
    const existingBcr = await prisma.Bcr.findFirst({
      where: { submissionId: submissionId }
    });
    
    if (existingBcr) {
      console.log(`BCR already exists for submission ${submissionId}: ${existingBcr.bcrCode}`);
      return existingBcr;
    }
    
    // Get next record number
    const lastBcr = await prisma.Bcr.findFirst({
      orderBy: {
        recordNumber: 'desc'
      }
    });
    
    const recordNumber = lastBcr ? lastBcr.recordNumber + 1 : 1;
    const bcrCode = generateBcrCode(recordNumber);
    
    // Create the BCR
    const bcr = await prisma.Bcr.create({
      data: {
        id: uuidv4(),
        recordNumber,
        bcrCode,
        submission: {
          connect: { id: submission.id }
        },
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
      }
    });
    
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
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      console.log('ID appears to be a UUID');
      
      // If it's a UUID, find in the Bcr model
      bcr = await prisma.Bcr.findUnique({
        where: { id },
        include: { submission: true }
      });
      
      console.log(`BCR in model: ${bcr ? 'Found' : 'Not found'}`);
    } else {
      console.log('ID appears to be a BCR code or number');
      
      // Try to find by BCR code
      bcr = await prisma.Bcr.findFirst({
        where: { bcrCode: id },
        include: { submission: true }
      });
      
      console.log(`BCR by code: ${bcr ? 'Found' : 'Not found'}`);
      
      // If still not found, try by record number
      if (!bcr) {
        const recordNumber = parseInt(id, 10);
        if (!isNaN(recordNumber)) {
          console.log(`Trying record number: ${recordNumber}`);
          
          bcr = await prisma.Bcr.findFirst({
            where: { recordNumber },
            include: { submission: true }
          });
          
          console.log(`BCR by record number: ${bcr ? 'Found' : 'Not found'}`);
        }
      }
    }
    
    if (bcr) {
      // Get impacted areas as names if they exist
      if (bcr.impactedAreas && bcr.impactedAreas.length > 0) {
        const impactedAreas = await prisma.ImpactedAreas.findMany({
          where: {
            id: {
              in: bcr.impactedAreas
            }
          }
        });
        
        bcr.impactedAreaNames = impactedAreas.map(area => area.name);
      } else {
        bcr.impactedAreaNames = [];
      }
      
      // Set status tag color based on status
      if (bcr.status === 'Completed') {
        bcr.statusTagColor = 'govuk-tag govuk-tag--green';
      } else if (bcr.status === 'Blocked' || bcr.status === 'Rejected') {
        bcr.statusTagColor = 'govuk-tag govuk-tag--red';
      } else if (bcr.status === 'On Hold') {
        bcr.statusTagColor = 'govuk-tag govuk-tag--yellow';
      } else {
        bcr.statusTagColor = 'govuk-tag govuk-tag--blue';
      }
      
      // Get submission details if available
      if (bcr.submissionId) {
        const submissionModel = require('../bcr-submission/model');
        const submission = await submissionModel.getSubmissionById(bcr.submissionId);
        if (submission) {
          bcr.submission = submission;
        }
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
  const whereConditions = {};
  
  // Apply filters if provided
  if (filters.currentPhase) {
    whereConditions.currentPhase = filters.currentPhase;
  }
  
  if (filters.status) {
    whereConditions.status = filters.status;
  }
  
  if (filters.urgencyLevel) {
    whereConditions.urgencyLevel = filters.urgencyLevel;
  }
  
  const bcrs = await prisma.Bcrs.findMany({
    where: whereConditions,
    orderBy: {
      createdAt: 'desc'
    }
  });
  
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
  const bcr = await prisma.Bcrs.findUnique({
    where: { id }
  });
  
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
  const updatedBcr = await prisma.Bcrs.update({
    where: { id },
    data: {
      currentPhase: phase,
      status,
      workflowHistory: [...(bcr.workflowHistory || []), historyEntry]
    }
  });
  
  return updatedBcr;
};

/**
 * Auto-advance a BCR to the next phase
 * @param {string} id - The BCR ID
 * @returns {Promise<Object>} - The updated BCR
 */
const autoAdvancePhase = async (id) => {
  // Get the current BCR
  const bcr = await prisma.Bcrs.findUnique({
    where: { id }
  });
  
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
    const updatedBcr = await prisma.Bcrs.update({
      where: { id },
      data: {
        currentPhase: nextPhase,
        status: PHASE_STATUSES[1], // In Progress
        workflowHistory: [...(bcr.workflowHistory || []), historyEntry]
      }
    });
    
    return updatedBcr;
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
