/**
 * BCR Service
 * Handles all database operations for BCRs using MongoDB models
 * Implements caching for frequently accessed data
 */
const { v4: uuidv4, validate: isUuid } = require('uuid');
const { shortCache, mediumCache } = require('../utils/cache');

// Import MongoDB models
const Bcr = require('../models/Bcr');
const User = require('../models/User');
const Submission = require('../models/Submission');
const BcrWorkflowActivity = require('../models/BcrWorkflowActivity');
const WorkflowPhase = require('../models/WorkflowPhase');

/**
 * Get all BCRs with optional filtering
 * @param {Object} filters - Optional filters for BCRs
 * @returns {Promise<Array>} - Array of BCRs
 */
const getAllBcrs = async (filters = {}) => {
  // Only cache when no filters are applied
  const noFilters = Object.keys(filters).length === 0;
  
  if (noFilters) {
    const cacheKey = 'all_bcrs';
    return mediumCache.getOrSet(cacheKey, async () => {
      try {
        // Create MongoDB query
        const query = {};
        
        // Populate the BCR data with related user information
        const bcrs = await Bcr.find(query)
          .populate({
            path: 'submissionId',
            populate: {
              path: 'submittedById',
              model: 'User'
            }
          })
          .sort({ createdAt: -1 }); // Sort by createdAt in descending order
        
        // Transform the results to match the expected format
        return bcrs.map(bcr => {
          const submission = bcr.submissionId;
          const submitter = submission ? submission.submittedById : null;
          
          return {
            id: bcr._id,
            bcrCode: bcr.bcrCode,
            recordNumber: bcr.recordNumber,
            currentPhase: bcr.currentPhase,
            status: bcr.status,
            urgencyLevel: bcr.urgencyLevel,
            impactedAreas: bcr.impactedAreas,
            workflowHistory: bcr.workflowHistory,
            createdAt: bcr.createdAt,
            updatedAt: bcr.updatedAt,
            submissionId: submission ? submission._id : null,
            submission: submission ? {
              id: submission._id,
              submissionCode: submission.submissionCode,
              fullName: submission.fullName,
              emailAddress: submission.emailAddress,
              briefDescription: submission.briefDescription,
              submittedById: submitter ? submitter._id : null,
              submittedBy: submitter ? {
                id: submitter._id,
                name: submitter.name,
                email: submitter.email,
                role: submitter.role
              } : null
            } : null
          };
        });
      } catch (error) {
        console.error('Error fetching BCRs from MongoDB:', error);
        throw error;
      }
    });
  }
  
  // Apply filters if provided
  const query = {};
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.impactArea) {
    query.impactedAreas = { $in: [filters.impactArea] };
  }
  
  // Date filters
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }
  
  try {
    // Populate the BCR data with related user information
    const bcrs = await Bcr.find(query)
      .populate({
        path: 'submissionId',
        populate: {
          path: 'submittedById',
          model: 'User'
        }
      })
      .sort({ createdAt: -1 }); // Sort by createdAt in descending order
    
    // Filter by submitter if needed
    let filteredBcrs = bcrs;
    if (filters.submitter) {
      filteredBcrs = bcrs.filter(bcr => {
        const submission = bcr.submissionId;
        const submitter = submission ? submission.submittedById : null;
        return submitter && submitter.email === filters.submitter;
      });
    }
    
    // Transform the results to match the expected format
    return filteredBcrs.map(bcr => {
      const submission = bcr.submissionId;
      const submitter = submission ? submission.submittedById : null;
      
      return {
        id: bcr._id,
        bcrCode: bcr.bcrCode,
        recordNumber: bcr.recordNumber,
        currentPhase: bcr.currentPhase,
        status: bcr.status,
        urgencyLevel: bcr.urgencyLevel,
        impactedAreas: bcr.impactedAreas,
        workflowHistory: bcr.workflowHistory,
        createdAt: bcr.createdAt,
        updatedAt: bcr.updatedAt,
        submissionId: submission ? submission._id : null,
        submission: submission ? {
          id: submission._id,
          submissionCode: submission.submissionCode,
          fullName: submission.fullName,
          emailAddress: submission.emailAddress,
          briefDescription: submission.briefDescription,
          submittedById: submitter ? submitter._id : null,
          submittedBy: submitter ? {
            id: submitter._id,
            name: submitter.name,
            email: submitter.email,
            role: submitter.role
          } : null
        } : null
      };
    });
  } catch (error) {
    console.error('Error fetching BCRs from MongoDB with filters:', error);
    throw error;
  }
};

/**
 * Get a single BCR by ID or BCR code
 * @param {string} idOrCode - BCR ID or BCR code
 * @returns {Promise<Object>} - BCR object
 */
const getBcrById = async (idOrCode) => {
  if (!idOrCode) throw new Error('BCR ID or code is required');
  
  // Cache key based on the ID or code
  const cacheKey = `bcr_${idOrCode}`;
  
  return shortCache.getOrSet(cacheKey, async () => {
    try {
      // Create query based on whether this is an ID or a BCR code
      const query = isUuid(idOrCode) ? 
        { _id: idOrCode } : 
        { bcrCode: idOrCode };
      
      // Find the BCR and populate related data
      const bcr = await Bcr.findOne(query)
        .populate({
          path: 'submissionId',
          populate: {
            path: 'submittedById',
            model: 'User'
          }
        });
      
      if (!bcr) return null;
      
      // Transform to expected format
      const submission = bcr.submissionId;
      const submitter = submission ? submission.submittedById : null;
      
      return {
        id: bcr._id,
        bcrCode: bcr.bcrCode,
        recordNumber: bcr.recordNumber,
        currentPhase: bcr.currentPhase,
        status: bcr.status,
        urgencyLevel: bcr.urgencyLevel,
        impactedAreas: bcr.impactedAreas,
        workflowHistory: bcr.workflowHistory,
        createdAt: bcr.createdAt,
        updatedAt: bcr.updatedAt,
        submissionId: submission ? submission._id : null,
        submission: submission ? {
          id: submission._id,
          submissionCode: submission.submissionCode,
          fullName: submission.fullName,
          emailAddress: submission.emailAddress,
          briefDescription: submission.briefDescription,
          submittedById: submitter ? submitter._id : null,
          submittedBy: submitter ? {
            id: submitter._id,
            name: submitter.name,
            email: submitter.email,
            role: submitter.role
          } : null
        } : null
      };
    } catch (error) {
      console.error(`Error fetching BCR with ID/code ${idOrCode}:`, error);
      throw error;
    }
  });
};

/**
 * Create a new BCR from a submission
 * @param {string} submissionId - ID of the submission
 * @param {Object} data - BCR data
 * @returns {Promise<Object>} - Created BCR
 */
const createBcr = async (submissionId, data = {}) => {
  try {
    // Find the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }
    
    // Generate a unique BCR code
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const yearCode = `${String(currentYear).slice(2)}/${String(nextYear).slice(2)}`;
    
    // Get the next record number
    const lastBcr = await Bcr.findOne({}, {}, { sort: { 'recordNumber': -1 } });
    const recordNumber = lastBcr ? lastBcr.recordNumber + 1 : 1;
    
    // Format the BCR code with leading zeros for the record number
    const bcrCode = `BCR-${yearCode}-${String(recordNumber).padStart(3, '0')}`;
    
    // Create the new BCR
    const newBcr = new Bcr({
      recordNumber,
      bcrCode,
      submissionId: submission._id,
      currentPhase: data.currentPhase || 'Initial Assessment',
      status: data.status || 'New',
      urgencyLevel: submission.urgencyLevel,
      impactedAreas: submission.impactAreas,
      workflowHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Save the BCR
    await newBcr.save();
    
    // Update the submission with the BCR ID
    submission.bcrId = newBcr._id;
    await submission.save();
    
    // Clear the cache
    shortCache.del(`bcr_${newBcr._id}`);
    shortCache.del(`bcr_${bcrCode}`);
    mediumCache.del('all_bcrs');
    
    return {
      id: newBcr._id,
      bcrCode: newBcr.bcrCode,
      recordNumber: newBcr.recordNumber,
      currentPhase: newBcr.currentPhase,
      status: newBcr.status,
      urgencyLevel: newBcr.urgencyLevel,
      impactedAreas: newBcr.impactedAreas,
      workflowHistory: newBcr.workflowHistory,
      createdAt: newBcr.createdAt,
      updatedAt: newBcr.updatedAt,
      submissionId: submission._id
    };
  } catch (error) {
    console.error(`Error creating BCR from submission ${submissionId}:`, error);
    throw error;
  }
};

/**
 * Update a BCR
 * @param {string} id - BCR ID
 * @param {Object} data - Updated BCR data
 * @returns {Promise<Object>} - Updated BCR
 */
const updateBcr = async (id, data) => {
  try {
    // Find the BCR
    const bcr = await Bcr.findById(id);
    if (!bcr) {
      throw new Error(`BCR with ID ${id} not found`);
    }
    
    // Update the fields
    if (data.currentPhase) bcr.currentPhase = data.currentPhase;
    if (data.status) bcr.status = data.status;
    if (data.urgencyLevel) bcr.urgencyLevel = data.urgencyLevel;
    if (data.impactedAreas) bcr.impactedAreas = data.impactedAreas;
    
    // Add to workflow history if phase or status changed
    if (data.currentPhase || data.status) {
      const historyEntry = {
        timestamp: new Date(),
        phase: data.currentPhase || bcr.currentPhase,
        status: data.status || bcr.status,
        userId: data.userId || null,
        notes: data.notes || null
      };
      
      bcr.workflowHistory = bcr.workflowHistory || [];
      bcr.workflowHistory.push(historyEntry);
    }
    
    bcr.updatedAt = new Date();
    
    // Save the BCR
    await bcr.save();
    
    // Clear the cache
    shortCache.del(`bcr_${id}`);
    shortCache.del(`bcr_${bcr.bcrCode}`);
    mediumCache.del('all_bcrs');
    
    return {
      id: bcr._id,
      bcrCode: bcr.bcrCode,
      recordNumber: bcr.recordNumber,
      currentPhase: bcr.currentPhase,
      status: bcr.status,
      urgencyLevel: bcr.urgencyLevel,
      impactedAreas: bcr.impactedAreas,
      workflowHistory: bcr.workflowHistory,
      createdAt: bcr.createdAt,
      updatedAt: bcr.updatedAt
    };
  } catch (error) {
    console.error(`Error updating BCR with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a BCR
 * @param {string} id - BCR ID
 * @returns {Promise<boolean>} - True if deleted successfully
 */
const deleteBcr = async (id) => {
  try {
    // Find the BCR
    const bcr = await Bcr.findById(id);
    if (!bcr) {
      throw new Error(`BCR with ID ${id} not found`);
    }
    
    // Find the submission and remove the BCR reference
    if (bcr.submissionId) {
      const submission = await Submission.findById(bcr.submissionId);
      if (submission) {
        submission.bcrId = null;
        await submission.save();
      }
    }
    
    // Delete the BCR
    await Bcr.deleteOne({ _id: id });
    
    // Clear the cache
    shortCache.del(`bcr_${id}`);
    shortCache.del(`bcr_${bcr.bcrCode}`);
    mediumCache.del('all_bcrs');
    
    return true;
  } catch (error) {
    console.error(`Error deleting BCR with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Add a workflow activity to a BCR
 * @param {string} bcrId - BCR ID
 * @param {Object} activityData - Workflow activity data
 * @returns {Promise<Object>} - Created workflow activity
 */
const addWorkflowActivity = async (bcrId, activityData) => {
  try {
    // Find the BCR
    const bcr = await Bcr.findById(bcrId);
    if (!bcr) {
      throw new Error(`BCR with ID ${bcrId} not found`);
    }
    
    // Create the workflow activity
    const activity = new BcrWorkflowActivity({
      bcrId: bcr._id,
      phase: activityData.phase,
      status: activityData.status,
      action: activityData.action,
      performedById: activityData.performedById,
      performedAt: new Date(),
      notes: activityData.notes
    });
    
    // Save the activity
    await activity.save();
    
    // Update the BCR if needed
    if (activityData.updateBcr) {
      bcr.currentPhase = activityData.phase;
      bcr.status = activityData.status;
      bcr.updatedAt = new Date();
      
      // Add to workflow history
      const historyEntry = {
        timestamp: new Date(),
        phase: activityData.phase,
        status: activityData.status,
        userId: activityData.performedById,
        notes: activityData.notes
      };
      
      bcr.workflowHistory = bcr.workflowHistory || [];
      bcr.workflowHistory.push(historyEntry);
      
      await bcr.save();
      
      // Clear the cache
      shortCache.del(`bcr_${bcrId}`);
      shortCache.del(`bcr_${bcr.bcrCode}`);
      mediumCache.del('all_bcrs');
    }
    
    return {
      id: activity._id,
      bcrId: activity.bcrId,
      phase: activity.phase,
      status: activity.status,
      action: activity.action,
      performedById: activity.performedById,
      performedAt: activity.performedAt,
      notes: activity.notes
    };
  } catch (error) {
    console.error(`Error adding workflow activity to BCR ${bcrId}:`, error);
    throw error;
  }
};

/**
 * Get workflow activities for a BCR
 * @param {string} bcrId - BCR ID
 * @returns {Promise<Array>} - Array of workflow activities
 */
const getWorkflowActivities = async (bcrId) => {
  try {
    // Find the BCR
    const bcr = await Bcr.findById(bcrId);
    if (!bcr) {
      throw new Error(`BCR with ID ${bcrId} not found`);
    }
    
    // Get the workflow activities
    const activities = await BcrWorkflowActivity.find({ bcrId })
      .populate('performedById', 'name email')
      .sort({ performedAt: -1 });
    
    return activities.map(activity => ({
      id: activity._id,
      bcrId: activity.bcrId,
      phase: activity.phase,
      status: activity.status,
      action: activity.action,
      performedById: activity.performedById ? activity.performedById._id : null,
      performedBy: activity.performedById ? {
        id: activity.performedById._id,
        name: activity.performedById.name,
        email: activity.performedById.email
      } : null,
      performedAt: activity.performedAt,
      notes: activity.notes
    }));
  } catch (error) {
    console.error(`Error getting workflow activities for BCR ${bcrId}:`, error);
    throw error;
  }
};

module.exports = {
  getAllBcrs,
  getBcrById,
  createBcr,
  updateBcr,
  deleteBcr,
  addWorkflowActivity,
  getWorkflowActivities
};
