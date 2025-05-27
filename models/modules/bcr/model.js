/**
 * Consolidated BCR Module Model
 * Handles all BCR-related database operations
 */
const mongoose = require('mongoose');

// Import the actual Submission and BCR models
const Submission = require('../../../models/Submission');
const Bcr = require('../../../models/Bcr');
const BcrConfig = require('../../../models/BcrConfig');
const User = require('../../../models/User');
const Phase = require('../../../models/Phase');
const Status = require('../../../models/Status');

// Helper function to get a status tag for display based on submission status
const getSubmissionStatusTag = (submission) => {
  const status = submission.status || 'Pending';
  
  switch (status) {
    case 'Approved':
      return { text: 'Approved', class: 'govuk-tag govuk-tag--green' };
    case 'Rejected':
      return { text: 'Rejected', class: 'govuk-tag govuk-tag--red' };
    case 'Paused':
      return { text: 'Paused', class: 'govuk-tag govuk-tag--yellow' };
    case 'Closed':
      return { text: 'Closed', class: 'govuk-tag govuk-tag--grey' };
    case 'More Info Required':
      return { text: 'More Info Required', class: 'govuk-tag govuk-tag--blue' };
    case 'Pending':
    default:
      return { text: 'Pending', class: 'govuk-tag govuk-tag--purple' };
  }
};

// Export the helper function
exports.getSubmissionStatusTag = getSubmissionStatusTag;

// Export models for use in controllers
exports.Submission = Submission;
exports.Bcr = Bcr;
exports.BcrConfig = BcrConfig;
exports.Phase = Phase;
exports.Status = Status;

/**
 * Get a BCR by ID
 */
exports.getBcrById = async (id) => {
  try {
    return await Bcr.findById(id)
      .populate('submissionId')
      .populate('currentPhaseId')
      .populate('currentStatusId')
      .exec();
  } catch (error) {
    console.error('Error in getBcrById:', error);
    throw error;
  }
};

/**
 * Get all BCRs with optional filtering
 */
exports.getAllBcrs = async (filters = {}) => {
  try {
    const query = { deleted: { $ne: true } };
    
    // Apply filters if provided
    if (filters.status) {
      query.currentStatusId = filters.status;
    }
    
    if (filters.phase) {
      query.currentPhaseId = filters.phase;
    }
    
    if (filters.search) {
      query.$or = [
        { bcrNumber: { $regex: filters.search, $options: 'i' } },
        { title: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    return await Bcr.find(query)
      .populate('submissionId')
      .populate('currentPhaseId')
      .populate('currentStatusId')
      .sort({ createdAt: -1 })
      .exec();
  } catch (error) {
    console.error('Error in getAllBcrs:', error);
    throw error;
  }
};

/**
 * Get all submissions with optional filtering
 */
exports.getAllSubmissions = async (filters = {}) => {
  try {
    // Create base query to exclude deleted submissions
    const query = { deletedAt: { $eq: null } };
    
    // If hasBcrNumber is true, only include submissions with a BCR number
    if (filters.hasBcrNumber === true || filters.hasBcrNumber === 'true') {
      query.bcrNumber = { $exists: true, $ne: null };
      console.log('Filtering for submissions with BCR numbers');
    }
    
    // If excludeApproved is true, exclude submissions that have been approved and have BCR numbers
    // This is used to separate submissions from BCRs
    if (filters.excludeApproved === true || filters.excludeApproved === 'true') {
      query.$or = [
        { status: { $ne: 'Approved' } },
        { bcrNumber: { $exists: false } },
        { bcrNumber: null }
      ];
      console.log('Excluding approved submissions with BCR numbers');
    }
    
    // Apply filters if provided
    if (filters.status) {
      // Handle case-insensitive status matching
      query.status = new RegExp('^' + filters.status + '$', 'i');
      console.log(`Filtering for status: ${filters.status}`);
    }
    
    if (filters.urgencyLevel) {
      query.urgencyLevel = filters.urgencyLevel;
    }
    
    if (filters.impactArea) {
      query.impactAreas = filters.impactArea;
    }
    
    if (filters.search) {
      query.$or = [
        { submissionCode: { $regex: filters.search, $options: 'i' } },
        { fullName: { $regex: filters.search, $options: 'i' } },
        { briefDescription: { $regex: filters.search, $options: 'i' } },
        { justification: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Set default limit or use provided limit
    const limit = filters.limit ? parseInt(filters.limit, 10) : 100;
    
    console.log('Querying submissions with:', query);
    
    const submissionsQuery = Submission.find(query)
      .populate('submittedById', 'name email role')
      .populate({
        path: 'bcrId',
        populate: [
          { path: 'currentPhaseId' },
          { path: 'currentStatusId' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    // Set a timeout for the query to prevent long-running operations
    submissionsQuery.maxTimeMS(5000); // 5 second timeout
    
    return await submissionsQuery.exec();
  } catch (error) {
    console.error('Error in getAllSubmissions:', error);
    throw error;
  }
};

/**
 * Get a submission by ID
 */
exports.getSubmissionById = async (id) => {
  try {
    // Create the query with population
    const query = Submission.findById(id)
      .populate('submittedById', 'name email role')
      .populate('bcrId');
    
    // Set a timeout for the query to prevent long-running operations
    query.maxTimeMS(5000); // 5 second timeout
    
    return await query.exec();
  } catch (error) {
    console.error('Error in getSubmissionById:', error);
    throw error;
  }
};

/**
 * Create a new submission
 */
exports.createSubmission = async (submissionData) => {
  try {
    const submission = new Submission(submissionData);
    await submission.save();
    return submission;
  } catch (error) {
    console.error('Error in createSubmission:', error);
    throw error;
  }
};

/**
 * Get all impact areas from BcrConfig
 */
exports.getAllImpactAreas = async () => {
  try {
    // Check if the collection exists and has documents
    const collectionExists = mongoose.connection.readyState === 1;
    
    if (!collectionExists) {
      console.warn('MongoDB connection not ready when querying impact areas');
      return []; // Return empty array instead of failing
    }
    
    // Set a timeout for the query
    const impactAreas = await BcrConfig.find({
      type: 'impactArea',
      deleted: { $ne: true }
    })
      .sort({ displayOrder: 1 })
      .maxTimeMS(5000) // Set a 5-second timeout for this query
      .exec();
    
    return impactAreas || [];
  } catch (error) {
    console.error('Error in getAllImpactAreas:', error);
    // Return empty array instead of throwing error
    console.warn('Returning empty impact areas array due to error');
    return [];
  }
};

/**
 * Get all urgency levels from the UrgencyLevel model
 */
exports.getAllUrgencyLevels = async () => {
  try {
    // Check if the connection is ready
    const collectionExists = mongoose.connection.readyState === 1;
    
    if (!collectionExists) {
      console.warn('MongoDB connection not ready when querying urgency levels');
      return []; // Return empty array instead of failing
    }
    
    // Import the UrgencyLevel model
    const UrgencyLevel = require('../../UrgencyLevel');
    
    // Query urgency levels from the dedicated model
    const urgencyLevels = await UrgencyLevel.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .maxTimeMS(5000) // Set a 5-second timeout for this query
      .exec();
    
    console.log('Found urgency levels from UrgencyLevel model:', urgencyLevels);
    return urgencyLevels || [];
  } catch (error) {
    console.error('Error in getAllUrgencyLevels:', error);
    // Return empty array instead of throwing error
    console.warn('Returning empty urgency levels array due to error');
    return [];
  }
};

/**
 * Get all workflow phases
 */
exports.getAllPhases = async () => {
  try {
    const phases = await Phase.find({ deleted: { $ne: true } })
      .populate('inProgressStatusId')
      .populate('completedStatusId')
      .populate('trelloStatusId')
      .sort({ displayOrder: 1 })
      .exec();
    
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
    
    return statuses;
  } catch (error) {
    console.error('Error in getAllStatuses:', error);
    throw error;
  }
};

/**
 * Update BCR phase and status
 */
exports.updateBcrPhaseStatus = async (bcrId, phaseId, statusId) => {
  try {
    const bcr = await Bcr.findById(bcrId);
    
    if (!bcr) {
      throw new Error('BCR not found');
    }
    
    bcr.currentPhaseId = phaseId;
    bcr.currentStatusId = statusId;
    bcr.updatedAt = new Date();
    
    await bcr.save();
    return bcr;
  } catch (error) {
    console.error('Error in updateBcrPhaseStatus:', error);
    throw error;
  }
};

/**
 * Helper function to get standardized GOV.UK Design System tag color for a status
 */
/**
 * Get config item by ID (used for impact areas and urgency levels)
 */
exports.getConfigById = async (id) => {
  try {
    return await BcrConfig.findById(id).exec();
  } catch (error) {
    console.error('Error in getConfigById:', error);
    throw error;
  }
};

/**
 * Create a new impact area
 */
exports.createImpactArea = async (impactAreaData) => {
  try {
    const impactArea = new BcrConfig({
      ...impactAreaData,
      type: 'impactArea' // Ensure correct type
    });
    await impactArea.save();
    return impactArea;
  } catch (error) {
    console.error('Error in createImpactArea:', error);
    throw error;
  }
};

/**
 * Update a config item (impact area or urgency level)
 */
exports.updateConfig = async (id, configData) => {
  try {
    const config = await BcrConfig.findByIdAndUpdate(
      id,
      configData,
      { new: true }
    ).exec();
    
    return config;
  } catch (error) {
    console.error('Error in updateConfig:', error);
    throw error;
  }
};

/**
 * Delete a config item (impact area or urgency level)
 */
exports.deleteConfig = async (id) => {
  try {
    // Soft delete
    const config = await BcrConfig.findByIdAndUpdate(
      id,
      { deleted: true },
      { new: true }
    ).exec();
    
    return config;
  } catch (error) {
    console.error('Error in deleteConfig:', error);
    throw error;
  }
};

exports.getStatusTag = (status) => {
  if (!status) {
    return { text: 'Unknown', class: 'govuk-tag govuk-tag--grey' };
  }
  
  // Using standardized GOV.UK Design System tag colors
  const statusName = status.name ? status.name.toLowerCase() : '';
  
  // Status type mapping to tag colors following GOV.UK Design System
  switch (statusName) {
    // Completed statuses (green)
    case 'completed':
    case 'approved':
    case 'closed':
    case 'done':
      return { text: status.name, class: 'govuk-tag govuk-tag--green' };
    
    // In progress statuses (blue shades)
    case 'in progress':
    case 'pending':
    case 'review':
    case 'analysis':
      return { text: status.name, class: 'govuk-tag govuk-tag--blue' };
    
    // Active/in-use statuses (turquoise)
    case 'active':
    case 'in use':
    case 'implementation':
      return { text: status.name, class: 'govuk-tag govuk-tag--turquoise' };
    
    // Rejected/error statuses (red)
    case 'rejected':
    case 'error':
    case 'failed':
      return { text: status.name, class: 'govuk-tag govuk-tag--red' };
    
    // Warning/delayed statuses (yellow)
    case 'delayed':
    case 'waiting':
    case 'on hold':
      return { text: status.name, class: 'govuk-tag govuk-tag--yellow' };
      
    // Inactive/neutral statuses (grey)
    case 'inactive':
    case 'draft':
    case 'n/a':
      return { text: status.name, class: 'govuk-tag govuk-tag--grey' };
      
    // Default tag (blue)
    default:
      return { text: status.name, class: 'govuk-tag' };
  }
};
