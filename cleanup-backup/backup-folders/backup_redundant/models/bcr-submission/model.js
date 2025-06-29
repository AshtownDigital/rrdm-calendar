/**
 * BCR Submission Model
 * Handles database operations for BCR submissions using MongoDB
 */
const { v4: uuidv4 } = require('uuid');
const { SUBMISSION_SOURCES, URGENCY_LEVELS, ATTACHMENTS_OPTIONS } = require('../../config/constants');

// Import MongoDB models
const Submission = require('../Submission');
const Bcr = require('../Bcr');
const User = require('../User');
const ImpactedArea = require('../ImpactedArea');

/**
 * Generate a submission code in the format SUB-YY/YY-NNN
 * @param {number} recordNumber - The record number to use in the code
 * @returns {string} - The formatted submission code
 */
const generateSubmissionCode = (recordNumber) => {
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
  
  return `SUB-${yearFormat}-${formattedNumber}`;
};

/**
 * Create a new BCR submission
 * @param {Object} submissionData - The submission data
 * @returns {Promise<Object>} - The created submission
 */
const createSubmission = async (submissionData) => {
  try {
    // Validate submission data
    if (!submissionData.fullName) throw new Error('Full name is required');
    if (!submissionData.emailAddress) throw new Error('Email address is required');
    if (!submissionData.submissionSource || !SUBMISSION_SOURCES.includes(submissionData.submissionSource)) {
      throw new Error('Valid submission source is required');
    }
    if (submissionData.submissionSource === 'Other' && !submissionData.organisation) {
      throw new Error('Organisation is required when submission source is Other');
    }
    if (!submissionData.briefDescription) throw new Error('Brief description is required');
    if (!submissionData.justification) throw new Error('Justification is required');
    if (!submissionData.urgencyLevel || !URGENCY_LEVELS.includes(submissionData.urgencyLevel)) {
      throw new Error('Valid urgency level is required');
    }
    if (!submissionData.impactAreas || !Array.isArray(submissionData.impactAreas) || submissionData.impactAreas.length === 0) {
      throw new Error('At least one impact area is required');
    }
    if (!submissionData.attachments || !ATTACHMENTS_OPTIONS.includes(submissionData.attachments)) {
      throw new Error('Valid attachments option is required');
    }
    if (!submissionData.declaration) throw new Error('Declaration is required');

    // Count existing submissions to determine the next number
    const submissionCount = await Submission.countDocuments();
    const submissionCode = generateSubmissionCode(submissionCount + 1);
    
    // Create the submission in the database
    const now = new Date();
    const submission = new Submission({
      submissionNumber: submissionCount + 1,
      submissionCode,
      fullName: submissionData.fullName,
      emailAddress: submissionData.emailAddress,
      submissionSource: submissionData.submissionSource,
      organisation: submissionData.organisation || null,
      briefDescription: submissionData.briefDescription,
      detailedDescription: submissionData.detailedDescription || submissionData.briefDescription,
      businessJustification: submissionData.justification,
      urgencyLevel: submissionData.urgencyLevel,
      impactAreas: Array.isArray(submissionData.impactAreas) ? submissionData.impactAreas : [submissionData.impactAreas],
      affectedReferenceDataArea: submissionData.affectedReferenceDataArea || null,
      technicalDependencies: submissionData.technicalDependencies || null,
      relatedDocuments: submissionData.relatedDocuments || null,
      attachments: submissionData.attachments,
      additionalNotes: submissionData.additionalNotes || null,
      declaration: submissionData.declaration === true || submissionData.declaration === 'true',
      status: 'Submitted',
      createdAt: now,
      updatedAt: now,
      submittedById: submissionData.submittedById || null
    });
    
    await submission.save();
    
    return submission;
  } catch (error) {
    console.error('Error creating submission:', error);
    throw error;
  }
};

/**
 * Get a submission by ID
 * @param {string} id - The submission ID or submission code
 * @returns {Promise<Object>} - The submission
 */
const getSubmissionById = async (id) => {
  try {
    let submission = null;
    
    // Check if the ID is a MongoDB ObjectId or a submission code
    if (/^[0-9a-f]{24}$/i.test(id)) {
      // If it's an ObjectId, find by _id
      submission = await Submission.findById(id)
        .populate('submittedById', 'name email role');
    } else {
      // If it's a submission code, find by submissionCode
      submission = await Submission.findOne({ submissionCode: id })
        .populate('submittedById', 'name email role');
    }
    
    if (submission) {
      // Get impacted area names
      if (submission.impactAreas && submission.impactAreas.length > 0) {
        const impactedAreas = await ImpactedArea.find({
          value: { $in: submission.impactAreas }
        });
        
        submission.impactedAreaNames = impactedAreas.map(area => area.name);
      } else {
        submission.impactedAreaNames = [];
      }
    }
    
    return submission;
  } catch (error) {
    console.error('Error getting submission by ID:', error);
    return null;
  }
};

/**
 * Get all submissions
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - Array of submissions
 */
const getAllSubmissions = async (filters = {}) => {
  try {
    const query = {};
    
    // Apply filters if provided
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.submissionSource) {
      query.submissionSource = filters.submissionSource;
    }
    
    if (filters.urgencyLevel) {
      query.urgencyLevel = filters.urgencyLevel;
    }
    
    if (filters.impactArea) {
      query.impactAreas = { $in: [filters.impactArea] };
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
    
    // Exclude deleted submissions
    query.deletedAt = null;
    
    const submissions = await Submission.find(query)
      .populate('submittedById', 'name email role')
      .populate('bcrId')
      .sort({ createdAt: -1 });
    
    // Get impacted area names for each submission
    const impactedAreas = await ImpactedArea.find({});
    
    return submissions.map(submission => {
      const result = submission.toObject();
      
      // Add impacted area names
      if (submission.impactAreas && submission.impactAreas.length > 0) {
        result.impactedAreaNames = submission.impactAreas.map(areaValue => {
          const area = impactedAreas.find(a => a.value === areaValue);
          return area ? area.name : areaValue;
        });
      } else {
        result.impactedAreaNames = [];
      }
      
      return result;
    });
  } catch (error) {
    console.error('Error getting all submissions:', error);
    return [];
  }
};

/**
 * Soft delete a submission
 * @param {string} id - The submission ID
 * @returns {Promise<Object>} - The updated submission
 */
const softDeleteSubmission = async (id) => {
  try {
    const submission = await Submission.findById(id);
    
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    submission.deletedAt = new Date();
    await submission.save();
    
    return submission;
  } catch (error) {
    console.error('Error soft deleting submission:', error);
    throw error;
  }
};

/**
 * Hard delete a submission
 * @param {string} id - The submission ID
 * @returns {Promise<Object>} - The deleted submission
 */
const hardDeleteSubmission = async (id) => {
  try {
    const submission = await Submission.findById(id);
    
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    // Check if there's a BCR associated with this submission
    if (submission.bcrId) {
      // Delete the BCR first
      await Bcr.findByIdAndDelete(submission.bcrId);
    }
    
    // Delete the submission
    await Submission.findByIdAndDelete(id);
    
    return submission;
  } catch (error) {
    console.error('Error hard deleting submission:', error);
    throw error;
  }
};

/**
 * Mark a submission as reviewed
 * @param {string} id - The submission ID
 * @returns {Promise<Object>} - The updated submission
 */
const markAsReviewed = async (id) => {
  try {
    const submission = await Submission.findById(id);
    
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    submission.status = 'Reviewed';
    submission.reviewedAt = new Date();
    await submission.save();
    
    return submission;
  } catch (error) {
    console.error('Error marking submission as reviewed:', error);
    throw error;
  }
};

/**
 * Mark a submission as rejected
 * @param {string} id - The submission ID
 * @param {string} rejectionReason - Optional reason for rejection
 * @returns {Promise<Object>} - The updated submission
 */
const markAsRejected = async (id, rejectionReason = '') => {
  try {
    const submission = await Submission.findById(id);
    
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    submission.status = 'Rejected';
    submission.rejectionReason = rejectionReason;
    submission.rejectedAt = new Date();
    await submission.save();
    
    return submission;
  } catch (error) {
    console.error('Error marking submission as rejected:', error);
    throw error;
  }
};

/**
 * Update an existing BCR submission
 * @param {string} id - The submission ID
 * @param {Object} submissionData - The updated submission data
 * @param {string} editorName - Name of the person making the edit
 * @returns {Promise<Object>} - The updated submission
 */
const updateSubmission = async (id, submissionData, editorName = 'System') => {
  try {
    // Find the current submission
    const currentSubmission = await Submission.findById(id);
    
    if (!currentSubmission) {
      throw new Error('Submission not found');
    }
    
    // Validate submission data
    if (!submissionData.fullName) throw new Error('Full name is required');
    if (!submissionData.emailAddress) throw new Error('Email address is required');
    if (!submissionData.submissionSource || !SUBMISSION_SOURCES.includes(submissionData.submissionSource)) {
      throw new Error('Valid submission source is required');
    }
    if (submissionData.submissionSource === 'Other' && !submissionData.organisation) {
      throw new Error('Organisation is required when submission source is Other');
    }
    if (!submissionData.briefDescription) throw new Error('Brief description is required');
    if (!submissionData.justification) throw new Error('Justification is required');
    if (!submissionData.urgencyLevel || !URGENCY_LEVELS.includes(submissionData.urgencyLevel)) {
      throw new Error('Valid urgency level is required');
    }
    if (!submissionData.impactAreas || !Array.isArray(submissionData.impactAreas) || submissionData.impactAreas.length === 0) {
      throw new Error('At least one impact area is required');
    }
    if (!submissionData.attachments || !ATTACHMENTS_OPTIONS.includes(submissionData.attachments)) {
      throw new Error('Valid attachments option is required');
    }
    
    // Process impact areas
    const newImpactAreas = Array.isArray(submissionData.impactAreas) 
      ? submissionData.impactAreas 
      : [submissionData.impactAreas];
    
    // Create an edit history entry
    const now = new Date();
    const editEntry = {
      editor: editorName,
      timestamp: now.toISOString(),
      changes: []
    };
    
    // Track changes
    if (currentSubmission.fullName !== submissionData.fullName) {
      editEntry.changes.push({ 
        field: 'Full Name', 
        from: currentSubmission.fullName, 
        to: submissionData.fullName 
      });
    }
    if (currentSubmission.emailAddress !== submissionData.emailAddress) {
      editEntry.changes.push({ 
        field: 'Email Address', 
        from: currentSubmission.emailAddress, 
        to: submissionData.emailAddress 
      });
    }
    if (currentSubmission.submissionSource !== submissionData.submissionSource) {
      editEntry.changes.push({ 
        field: 'Submission Source', 
        from: currentSubmission.submissionSource, 
        to: submissionData.submissionSource 
      });
    }
    if (currentSubmission.organisation !== submissionData.organisation) {
      editEntry.changes.push({ 
        field: 'Organisation', 
        from: currentSubmission.organisation || 'None', 
        to: submissionData.organisation || 'None' 
      });
    }
    if (currentSubmission.briefDescription !== submissionData.briefDescription) {
      editEntry.changes.push({ 
        field: 'Brief Description', 
        from: currentSubmission.briefDescription, 
        to: submissionData.briefDescription 
      });
    }
    if (currentSubmission.businessJustification !== submissionData.justification) {
      editEntry.changes.push({ 
        field: 'Justification', 
        from: currentSubmission.businessJustification, 
        to: submissionData.justification 
      });
    }
    if (currentSubmission.urgencyLevel !== submissionData.urgencyLevel) {
      editEntry.changes.push({ 
        field: 'Urgency Level', 
        from: currentSubmission.urgencyLevel, 
        to: submissionData.urgencyLevel 
      });
    }
    
    // Compare impact areas
    const currentImpactAreas = currentSubmission.impactAreas || [];
    if (JSON.stringify(currentImpactAreas.sort()) !== JSON.stringify(newImpactAreas.sort())) {
      editEntry.changes.push({ 
        field: 'Impact Areas', 
        from: currentImpactAreas.join(', '), 
        to: newImpactAreas.join(', ') 
      });
    }
    
    if (currentSubmission.affectedReferenceDataArea !== submissionData.affectedReferenceDataArea) {
      editEntry.changes.push({ 
        field: 'Affected Reference Data Area', 
        from: currentSubmission.affectedReferenceDataArea || 'None', 
        to: submissionData.affectedReferenceDataArea || 'None' 
      });
    }
    if (currentSubmission.technicalDependencies !== submissionData.technicalDependencies) {
      editEntry.changes.push({ 
        field: 'Technical Dependencies', 
        from: currentSubmission.technicalDependencies || 'None', 
        to: submissionData.technicalDependencies || 'None' 
      });
    }
    if (currentSubmission.relatedDocuments !== submissionData.relatedDocuments) {
      editEntry.changes.push({ 
        field: 'Related Documents', 
        from: currentSubmission.relatedDocuments || 'None', 
        to: submissionData.relatedDocuments || 'None' 
      });
    }
    if (currentSubmission.attachments !== submissionData.attachments) {
      editEntry.changes.push({ 
        field: 'Attachments', 
        from: currentSubmission.attachments, 
        to: submissionData.attachments 
      });
    }
    if (currentSubmission.additionalNotes !== submissionData.additionalNotes) {
      editEntry.changes.push({ 
        field: 'Additional Notes', 
        from: currentSubmission.additionalNotes || 'None', 
        to: submissionData.additionalNotes || 'None' 
      });
    }
    
    // If no changes were made, return the current submission
    if (editEntry.changes.length === 0) {
      return currentSubmission;
    }
    
    // Store edit history in a special field in the additionalNotes
    // Format: [EDIT_HISTORY_START]JSON_DATA[EDIT_HISTORY_END]
    const editHistoryMarker = '[EDIT_HISTORY]';
    let existingHistory = [];
    let userNotes = submissionData.additionalNotes || '';
    
    // Check if there's already an edit history in the notes
    if (currentSubmission.additionalNotes && currentSubmission.additionalNotes.includes(editHistoryMarker)) {
      const historyStart = currentSubmission.additionalNotes.indexOf(editHistoryMarker);
      if (historyStart !== -1) {
        try {
          const historyJson = currentSubmission.additionalNotes.substring(historyStart + editHistoryMarker.length);
          existingHistory = JSON.parse(historyJson);
          
          // Extract user's actual notes (everything before the marker)
          if (submissionData.additionalNotes && submissionData.additionalNotes.includes(editHistoryMarker)) {
            userNotes = submissionData.additionalNotes.substring(0, submissionData.additionalNotes.indexOf(editHistoryMarker));
          }
        } catch (e) {
          console.error('Error parsing edit history:', e);
          existingHistory = [];
        }
      }
    }
    
    // Add new entry to history
    existingHistory.unshift(editEntry); // Add to beginning of array
    
    // Combine user notes with edit history
    const notesWithHistory = `${userNotes.trim()}\n\n${editHistoryMarker}${JSON.stringify(existingHistory)}`;
    
    // Update the submission
    currentSubmission.fullName = submissionData.fullName;
    currentSubmission.emailAddress = submissionData.emailAddress;
    currentSubmission.submissionSource = submissionData.submissionSource;
    currentSubmission.organisation = submissionData.organisation || null;
    currentSubmission.briefDescription = submissionData.briefDescription;
    currentSubmission.detailedDescription = submissionData.detailedDescription || submissionData.briefDescription;
    currentSubmission.businessJustification = submissionData.justification;
    currentSubmission.urgencyLevel = submissionData.urgencyLevel;
    currentSubmission.impactAreas = newImpactAreas;
    currentSubmission.affectedReferenceDataArea = submissionData.affectedReferenceDataArea || null;
    currentSubmission.technicalDependencies = submissionData.technicalDependencies || null;
    currentSubmission.relatedDocuments = submissionData.relatedDocuments || null;
    currentSubmission.attachments = submissionData.attachments;
    currentSubmission.additionalNotes = notesWithHistory;
    currentSubmission.updatedAt = now;
    
    await currentSubmission.save();
    
    // Add edit history to the returned object for display purposes
    const result = currentSubmission.toObject();
    result.editHistory = existingHistory;
    
    // Get impacted area names
    if (result.impactAreas && result.impactAreas.length > 0) {
      const impactedAreas = await ImpactedArea.find({
        value: { $in: result.impactAreas }
      });
      
      result.impactedAreaNames = impactedAreas.map(area => area.name);
    } else {
      result.impactedAreaNames = [];
    }
    
    return result;
  } catch (error) {
    console.error('Error updating submission:', error);
    throw error;
  }
};

module.exports = {
  createSubmission,
  getSubmissionById,
  getAllSubmissions,
  softDeleteSubmission,
  hardDeleteSubmission,
  markAsReviewed,
  markAsRejected,
  updateSubmission,
  generateSubmissionCode
};
