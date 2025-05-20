/**
 * BCR Submission Model
 * Handles database operations for BCR submissions using Prisma
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();
const { SUBMISSION_SOURCES, URGENCY_LEVELS, ATTACHMENTS_OPTIONS } = require('../../config/constants');

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
    const submissionCount = await prisma.submission.count();
    const submissionCode = generateSubmissionCode(submissionCount + 1);
    
    // Create the submission in the database
    const now = new Date();
    const submission = await prisma.submission.create({
      data: {
        submissionCode,
        fullName: submissionData.fullName,
        emailAddress: submissionData.emailAddress,
        submissionSource: submissionData.submissionSource,
        organisation: submissionData.organisation || null,
        briefDescription: submissionData.briefDescription,
        justification: submissionData.justification,
        urgencyLevel: submissionData.urgencyLevel,
        impactAreas: Array.isArray(submissionData.impactAreas) ? submissionData.impactAreas : [submissionData.impactAreas],
        affectedReferenceDataArea: submissionData.affectedReferenceDataArea || null,
        technicalDependencies: submissionData.technicalDependencies || null,
        relatedDocuments: submissionData.relatedDocuments || null,
        attachments: submissionData.attachments,
        additionalNotes: submissionData.additionalNotes || null,
        declaration: submissionData.declaration === 'true' || submissionData.declaration === true,
        reviewOutcome: 'Pending Review', // Set default review outcome for all new submissions
        createdAt: now,
        updatedAt: now,
        submittedById: submissionData.submittedById || '00000000-0000-0000-0000-000000000001' // Default to admin user if not provided
      }
    });
    
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
    // Check if the ID is a UUID or a submission code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // Query the submission
    const submission = await prisma.submission.findUnique({
      where: isUuid ? { id } : { submissionCode: id },
      include: {
        bcr: true,
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!submission) {
      return null;
    }
    
    // Get impacted areas as names if they exist
    if (submission.impactAreas && submission.impactAreas.length > 0) {
      const impactedAreas = await prisma.impactedArea.findMany({
        where: {
          id: {
            in: submission.impactAreas
          }
        }
      });
      
      submission.impactedAreaNames = impactedAreas.map(area => area.name);
    } else {
      submission.impactedAreaNames = [];
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
    const whereConditions = {};
    
    // Only include non-deleted submissions by default
    if (filters.includeDeleted !== true) {
      whereConditions.deletedAt = null;
    }
    
    // Apply other filters if provided
    if (filters.submissionSource) {
      whereConditions.submissionSource = filters.submissionSource;
    }
    
    if (filters.urgencyLevel) {
      whereConditions.urgencyLevel = filters.urgencyLevel;
    }
    
    if (filters.status) {
      whereConditions.status = filters.status;
    }
    
    const submissions = await prisma.submission.findMany({
      where: whereConditions,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Process submissions to add impacted area names
    const processedSubmissions = [];
    
    for (const submission of submissions) {
      // Get impacted areas as names if they exist
      if (submission.impactAreas && submission.impactAreas.length > 0) {
        const impactedAreas = await prisma.impactedArea.findMany({
          where: {
            id: {
              in: submission.impactAreas
            }
          }
        });
        
        submission.impactedAreaNames = impactedAreas.map(area => area.name);
      } else {
        submission.impactedAreaNames = [];
      }
      
      processedSubmissions.push(submission);
    }
    
    return processedSubmissions;
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
    const submission = await prisma.submission.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });
    
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
    // Check if the submission exists first
    const submission = await prisma.submission.findUnique({
      where: { id }
    });
    
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    // Check if it's marked as deleted
    if (!submission.deletedAt) {
      throw new Error('Submission must be soft-deleted before hard deletion');
    }
    
    // Perform the hard delete
    const deletedSubmission = await prisma.submission.delete({
      where: { id }
    });
    
    return deletedSubmission;
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
    // Update the submission timestamp only
    // We don't have a reviewedAt field in the Submission model
    const submission = await prisma.Submission.update({
      where: { id },
      data: {
        updatedAt: new Date()
      }
    });
    
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
    // Update the submission with rejection information
    // Note: We're only updating fields that exist in the schema
    const submission = await prisma.Submission.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        rejectedAt: new Date(),
        additionalNotes: rejectionReason ? `Rejection reason: ${rejectionReason}` : 'Submission rejected'
      }
    });
    
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
    
    // Get the current submission to compare changes
    const currentSubmission = await prisma.submission.findUnique({
      where: { id }
    });
    
    if (!currentSubmission) {
      throw new Error('Submission not found');
    }
    
    // Create edit history entry
    const now = new Date();
    const timestamp = now.toISOString();
    const editEntry = {
      timestamp,
      formattedDate: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
      editor: editorName,
      changes: []
    };
    
    // Compare fields and track changes
    if (currentSubmission.fullName !== submissionData.fullName) {
      editEntry.changes.push({ field: 'Full Name', from: currentSubmission.fullName, to: submissionData.fullName });
    }
    if (currentSubmission.emailAddress !== submissionData.emailAddress) {
      editEntry.changes.push({ field: 'Email Address', from: currentSubmission.emailAddress, to: submissionData.emailAddress });
    }
    if (currentSubmission.submissionSource !== submissionData.submissionSource) {
      editEntry.changes.push({ field: 'Submission Source', from: currentSubmission.submissionSource, to: submissionData.submissionSource });
    }
    if (currentSubmission.organisation !== submissionData.organisation) {
      editEntry.changes.push({ field: 'Organisation', from: currentSubmission.organisation || 'None', to: submissionData.organisation || 'None' });
    }
    if (currentSubmission.briefDescription !== submissionData.briefDescription) {
      editEntry.changes.push({ field: 'Brief Description', from: currentSubmission.briefDescription, to: submissionData.briefDescription });
    }
    if (currentSubmission.justification !== submissionData.justification) {
      editEntry.changes.push({ field: 'Justification', from: currentSubmission.justification, to: submissionData.justification });
    }
    if (currentSubmission.urgencyLevel !== submissionData.urgencyLevel) {
      editEntry.changes.push({ field: 'Urgency Level', from: currentSubmission.urgencyLevel, to: submissionData.urgencyLevel });
    }
    
    // Compare impact areas (arrays)
    const currentImpactAreas = currentSubmission.impactAreas || [];
    const newImpactAreas = Array.isArray(submissionData.impactAreas) ? submissionData.impactAreas : [submissionData.impactAreas].filter(Boolean);
    
    if (JSON.stringify(currentImpactAreas.sort()) !== JSON.stringify(newImpactAreas.sort())) {
      // Get impact area names for better readability
      const impactedAreasMap = {};
      const allImpactAreaIds = [...new Set([...currentImpactAreas, ...newImpactAreas])];
      
      if (allImpactAreaIds.length > 0) {
        const impactedAreas = await prisma.impactedArea.findMany({
          where: {
            id: {
              in: allImpactAreaIds
            }
          }
        });
        
        impactedAreas.forEach(area => {
          impactedAreasMap[area.id] = area.name;
        });
      }
      
      const currentImpactAreaNames = currentImpactAreas.map(id => impactedAreasMap[id] || id);
      const newImpactAreaNames = newImpactAreas.map(id => impactedAreasMap[id] || id);
      
      editEntry.changes.push({ 
        field: 'Impact Areas', 
        from: currentImpactAreaNames.join(', ') || 'None', 
        to: newImpactAreaNames.join(', ') 
      });
    }
    
    // Compare other fields
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
    
    // Update the submission in the database
    const submission = await prisma.submission.update({
      where: { id },
      data: {
        fullName: submissionData.fullName,
        emailAddress: submissionData.emailAddress,
        submissionSource: submissionData.submissionSource,
        organisation: submissionData.organisation || null,
        briefDescription: submissionData.briefDescription,
        justification: submissionData.justification,
        urgencyLevel: submissionData.urgencyLevel,
        impactAreas: newImpactAreas,
        affectedReferenceDataArea: submissionData.affectedReferenceDataArea || null,
        technicalDependencies: submissionData.technicalDependencies || null,
        relatedDocuments: submissionData.relatedDocuments || null,
        attachments: submissionData.attachments,
        additionalNotes: notesWithHistory,
        updatedAt: now
      }
    });
    
    // Add edit history to the returned object for display purposes
    submission.editHistory = existingHistory;
    
    // Get impacted area names
    if (submission.impactAreas && submission.impactAreas.length > 0) {
      const impactedAreas = await prisma.impactedArea.findMany({
        where: {
          id: {
            in: submission.impactAreas
          }
        }
      });
      
      submission.impactedAreaNames = impactedAreas.map(area => area.name);
    } else {
      submission.impactedAreaNames = [];
    }
    
    return submission;
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
