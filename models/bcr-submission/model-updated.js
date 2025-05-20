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
    const submission = await prisma.submission.update({
      where: { id },
      data: {
        reviewedAt: new Date(),
        status: 'APPROVED'
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
 * @returns {Promise<Object>} - The updated submission
 */
const markAsRejected = async (id) => {
  try {
    const submission = await prisma.submission.update({
      where: { id },
      data: {
        reviewedAt: new Date(),
        status: 'REJECTED'
      }
    });
    
    return submission;
  } catch (error) {
    console.error('Error marking submission as rejected:', error);
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
  generateSubmissionCode
};
