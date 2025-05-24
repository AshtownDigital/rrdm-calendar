/**
 * Consolidated BCR Module Model
 * Handles all BCR-related database operations
 */
const mongoose = require('mongoose');

// Define schemas directly in this file since the previous files have been removed
const submissionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  urgencyLevel: { type: String },
  impactAreas: [{ type: String }],
  submittedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bcrId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bcr' },
  status: { type: String, default: 'Pending' },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const bcrSchema = new mongoose.Schema({
  bcrNumber: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
  currentPhaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Phase' },
  currentStatusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const bcrConfigSchema = new mongoose.Schema({
  type: { type: String, required: true },
  value: { type: String, required: true },
  displayName: { type: String },
  displayOrder: { type: Number, default: 0 },
  deleted: { type: Boolean, default: false }
});

const phaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
  displayOrder: { type: Number, default: 0 },
  inProgressStatusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
  completedStatusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
  trelloStatusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
  deleted: { type: Boolean, default: false }
});

const statusSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
  displayOrder: { type: Number, default: 0 },
  type: { type: String },
  deleted: { type: Boolean, default: false }
});

// Check if models already exist before creating them to avoid "Cannot overwrite model" errors
const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
const Bcr = mongoose.models.Bcr || mongoose.model('Bcr', bcrSchema);
const BcrConfig = mongoose.models.BcrConfig || mongoose.model('BcrConfig', bcrConfigSchema);
const Phase = mongoose.models.Phase || mongoose.model('Phase', phaseSchema);
const Status = mongoose.models.Status || mongoose.model('Status', statusSchema);

// Export models
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
    const query = { deleted: { $ne: true } };
    
    // Apply filters if provided
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.urgencyLevel) {
      query.urgencyLevel = filters.urgencyLevel;
    }
    
    if (filters.impactArea) {
      query.impactAreas = filters.impactArea;
    }
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Execute the query with population
    return await Submission.find(query)
      .populate('submittedById', 'name email role')
      .populate('bcrId')
      .sort({ createdAt: -1 })
      .exec();
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
    return await Submission.findById(id)
      .populate('submittedById', 'name email role')
      .populate('bcrId')
      .exec();
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
 * Get all urgency levels from BcrConfig
 */
exports.getAllUrgencyLevels = async () => {
  try {
    // Check if the collection exists and has documents
    const collectionExists = mongoose.connection.readyState === 1;
    
    if (!collectionExists) {
      console.warn('MongoDB connection not ready when querying urgency levels');
      return []; // Return empty array instead of failing
    }
    
    // Set a timeout for the query
    const urgencyLevels = await BcrConfig.find({
      type: 'urgencyLevel',
      deleted: { $ne: true }
    })
      .sort({ displayOrder: 1 })
      .maxTimeMS(5000) // Set a 5-second timeout for this query
      .exec();
    
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
