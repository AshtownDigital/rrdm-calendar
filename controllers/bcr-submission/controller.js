/**
 * BCR Submission Controller
 * Handles submission form rendering, creation, review, and deletion
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const submissionModel = require('../../models/bcr-submission/model');
const bcrModel = require('../../models/bcr/model');
const impactedAreasModel = require('../../models/impacted-areas/model');
const counterService = require('../../services/counterService');
const { refreshCounters } = counterService;
const { SUBMISSION_SOURCES, URGENCY_LEVELS, ATTACHMENTS_OPTIONS } = require('../../config/constants');
const { formatDate } = require('../../utils/dateUtils');

/**
 * Render the new submission form
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const newForm = async (req, res) => {
  try {
    // Get all impacted areas for the form
    const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
    
    console.log('DEBUG: impactedAreas passed to template:', impactedAreas);
    res.render('bcr-submission/new', {
      title: 'New BCR Submission',
      submissionSources: SUBMISSION_SOURCES,
      urgencyLevels: URGENCY_LEVELS,
      attachmentsOptions: ATTACHMENTS_OPTIONS,
      impactAreas: impactedAreas,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error rendering submission form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submission form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Create a new BCR submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const createSubmission = async (req, res) => {
  try {
    // Extract submission data from request body
    const submissionData = {
      fullName: req.body.fullName,
      emailAddress: req.body.emailAddress,
      submissionSource: req.body.submissionSource,
      organisation: req.body.organisation,
      briefDescription: req.body.briefDescription,
      justification: req.body.justification,
      urgencyLevel: req.body.urgencyLevel,
      impactAreas: Array.isArray(req.body.impactAreas) ? req.body.impactAreas : [req.body.impactAreas].filter(Boolean),
      affectedReferenceDataArea: req.body.affectedReferenceDataArea,
      technicalDependencies: req.body.technicalDependencies,
      relatedDocuments: req.body.relatedDocuments,
      attachments: req.body.attachments,
      additionalNotes: req.body.additionalNotes,
      declaration: req.body.declaration === 'true' || req.body.declaration === true
    };

    // Create the submission
    const submission = await submissionModel.createSubmission(submissionData);
    
    // Render confirmation page
    res.render('bcr-submission/confirm', {
      title: 'Submission Received',
      message: `Your submission has been received with reference number ${submission.submissionCode}`,
      submission,
      user: req.user
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    
    // Get all impacted areas for the form
    const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
    
    // Re-render the form with error
    res.status(400).render('bcr-submission/new', {
      title: 'New BCR Submission',
      submissionSources: SUBMISSION_SOURCES,
      urgencyLevels: URGENCY_LEVELS,
      attachmentsOptions: ATTACHMENTS_OPTIONS,
      impactAreas: impactedAreas,
      formData: req.body,
      error: error.message,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * Show the review form for a submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const reviewSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get the submission with all its details using the model
    // This will also populate the impactedAreaNames
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    if (submission.deletedAt) {
      return res.status(400).render('bcr-submission/warning', {
        title: 'Cannot Review Deleted Submission',
        message: 'This submission has been deleted and cannot be reviewed',
        submission,
        user: req.user
      });
    }
    
    // Format the creation date
    const createdAtFormatted = submission.createdAt ? 
      new Date(submission.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Unknown';
    
    // Log impact areas for debugging
    console.log('Impact Areas:', submission.impactAreas);
    console.log('Impact Area Names:', submission.impactedAreaNames);
    
    // Render the review form
    res.render('bcr-submission/review', {
      title: `Review Submission: ${submission.submissionCode}`,
      submission: {
        ...submission,
        createdAtFormatted
      },
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error reviewing submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while reviewing the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Soft delete a submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const deleteSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get the submission
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    if (submission.deletedAt) {
      return res.status(400).render('bcr-submission/warning', {
        title: 'Already Deleted',
        message: 'This submission has already been deleted',
        submission,
        user: req.user
      });
    }
    
    // Soft delete the submission
    await submissionModel.softDeleteSubmission(submissionId);
    
    // Render confirmation page
    res.render('bcr-submission/confirm', {
      title: 'Submission Deleted',
      message: `Submission ${submission.submissionCode} has been deleted`,
      submission,
      user: req.user
    });
  } catch (error) {
    console.error('Error soft deleting submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while deleting the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Hard delete a submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const hardDeleteSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get the submission
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    if (!submission.deletedAt) {
      return res.status(400).render('bcr-submission/warning', {
        title: 'Cannot Hard Delete',
        message: 'This submission must be soft deleted before it can be permanently deleted',
        submission,
        user: req.user
      });
    }
    
    // Store the submission code for the confirmation message
    const submissionCode = submission.submissionCode;
    
    // Hard delete the submission
    await submissionModel.hardDeleteSubmission(submissionId);
    
    // Render confirmation page
    res.render('bcr-submission/confirm', {
      title: 'Submission Permanently Deleted',
      message: `Submission ${submissionCode} has been permanently deleted`,
      user: req.user
    });
  } catch (error) {
    console.error('Error hard deleting submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while permanently deleting the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * List all BCR submissions
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const list = async (req, res) => {
  try {
    // Import PrismaClient for database queries
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get all submissions
    const submissions = await submissionModel.getAllSubmissions();
    
    // Format dates for display and add review outcome information
    const formattedSubmissions = submissions.map(submission => ({
      ...submission,
      createdAtFormatted: formatDate(submission.createdAt),
      reviewedAtFormatted: submission.reviewedAt ? formatDate(submission.reviewedAt) : null,
      deletedAtFormatted: submission.deletedAt ? formatDate(submission.deletedAt) : null,
      statusTag: getSubmissionStatusTag(submission),
      // Include review outcome for the new column
      reviewOutcome: submission.reviewOutcome || (submission.bcrId ? 'Approved' : null)
    }));
    
    // Get counts from the counter service for consistency across the application
    console.log('Getting submission counts from counter service...');
    const counters = await counterService.getCounters(true); // Force refresh to ensure accuracy
    
    // Extract submission counts
    const totalCount = counters.submissions.total || 0;
    const pendingCount = counters.submissions.pending || 0;
    const approvedCount = counters.submissions.approved || 0;
    const rejectedCount = counters.submissions.rejected || 0;
    const moreInfoCount = counters.submissions.moreInfo || 0;
    const pausedCount = counters.submissions.paused || 0;
    const rejectedEditCount = counters.submissions.rejectedEdit || 0;
    
    console.log('Submission counts from counter service:', {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      moreInfo: moreInfoCount,
      paused: pausedCount,
      rejectedEdit: rejectedEditCount
    });
    
    // Close the Prisma client
    await prisma.$disconnect();
    
    // Render the list page with stats
    res.render('bcr-submission/list', {
      title: 'BCR Submissions',
      submissions: formattedSubmissions,
      stats: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        moreInfo: moreInfoCount,
        paused: pausedCount,
        rejectedEdit: rejectedEditCount
      },
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error listing submissions:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submissions list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Helper function to get the appropriate status tag for a submission
 * @param {Object} submission - The submission object
 * @returns {string} - The CSS class for the status tag
 */
function getSubmissionStatusTag(submission) {
  if (submission.deletedAt) {
    return 'govuk-tag govuk-tag--red';
  }
  
  if (submission.reviewedAt) {
    return 'govuk-tag govuk-tag--green';
  }
  
  return 'govuk-tag govuk-tag--blue';
}

/**
 * Render the review page for a submission
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const review = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submission = await submissionModel.getSubmissionById(submissionId);
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    // Extract edit history from additional notes if available
    let editHistory = [];
    const editHistoryMarker = '[EDIT_HISTORY]';
    
    if (submission.additionalNotes && submission.additionalNotes.includes(editHistoryMarker)) {
      const historyStart = submission.additionalNotes.indexOf(editHistoryMarker);
      if (historyStart !== -1) {
        try {
          const historyJson = submission.additionalNotes.substring(historyStart + editHistoryMarker.length);
          editHistory = JSON.parse(historyJson);
          
          // Clean up the additionalNotes for display (remove the edit history part)
          submission.displayNotes = submission.additionalNotes.substring(0, historyStart).trim();
        } catch (e) {
          console.error('Error parsing edit history:', e);
          editHistory = [];
          submission.displayNotes = submission.additionalNotes;
        }
      } else {
        submission.displayNotes = submission.additionalNotes;
      }
    } else {
      submission.displayNotes = submission.additionalNotes;
    }
    
    // Get approval/rejection history
    let approvalHistory = [];
    
    // Check if the submission has a BCR created from it
    let bcr = null;
    try {
      // First try to find a BCR with this submission ID
      bcr = await prisma.Bcr.findFirst({
        where: { submissionId: submissionId }
      });
      
      if (bcr) {
        // Add approval entry
        approvalHistory.push({
          action: 'Approved',
          date: bcr.createdAt,
          formattedDate: new Date(bcr.createdAt).toLocaleString(),
          user: 'System',
          details: `BCR ${bcr.bcrCode} created`,
          phase: bcr.currentPhase,
          status: bcr.status
        });
        
        // Update submission with BCR information
        submission.currentPhase = bcr.currentPhase;
        submission.status = bcr.status;
      } else if (submission.bcrId) {
        // If submission has a BCR ID but we couldn't find it by submissionId
        bcr = await prisma.Bcr.findUnique({
          where: { id: submission.bcrId }
        });
        
        if (bcr) {
          approvalHistory.push({
            action: 'Approved',
            date: bcr.createdAt,
            formattedDate: new Date(bcr.createdAt).toLocaleString(),
            user: 'System',
            details: `BCR ${bcr.bcrCode} created`,
            phase: bcr.currentPhase,
            status: bcr.status
          });
          
          // Update submission with BCR information
          submission.currentPhase = bcr.currentPhase;
          submission.status = bcr.status;
        }
      }
    } catch (error) {
      console.error('Error fetching BCR for submission:', error);
    }
    
    // Only add rejection history if there's no BCR and the submission was updated after creation
    if (!bcr && submission.updatedAt && submission.updatedAt > submission.createdAt) {
      // Check if this is a rejected submission
      const isRejected = !submission.bcrId && submission.updatedAt;
      
      if (isRejected) {
        approvalHistory.push({
          action: 'Rejected',
          date: submission.updatedAt,
          formattedDate: new Date(submission.updatedAt).toLocaleString(),
          user: 'System',
          details: 'Submission rejected'
        });
      }
    }
    
    // Sort history by date, most recent first
    approvalHistory.sort((a, b) => b.date - a.date);
    
    res.render('bcr-submission/review', {
      title: 'Review Submission',
      submission,
      editHistory,
      approvalHistory,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error rendering review form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the review page',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Approve a submission and create a BCR
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const approve = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get the submission with its BCR if it exists
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    if (submission.deletedAt) {
      return res.status(400).render('bcr-submission/warning', {
        title: 'Cannot Approve Deleted Submission',
        message: 'This submission has been deleted and cannot be approved',
        submission,
        user: req.user
      });
    }
    
    // Check if a BCR already exists for this submission
    let existingBcr = await prisma.Bcr.findFirst({
      where: { submissionId: submissionId }
    });
    
    if (existingBcr) {
      // If BCR exists but submission isn't marked as approved, update it
      if (submission.reviewOutcome !== 'Approved') {
        await prisma.Submission.update({
          where: { id: submissionId },
          data: {
            reviewedAt: new Date(),
            reviewOutcome: 'Approved',
            bcrId: existingBcr.id,
            updatedAt: new Date()
          }
        });
        console.log(`Submission ${submissionId} marked as approved with existing BCR ${existingBcr.bcrCode}`);
      }
      
      return res.render('bcr-submission/approved', {
        title: 'Submission Approved',
        message: `This submission has been approved and BCR ${existingBcr.bcrCode} has been created.`,
        submission,
        bcr: existingBcr,
        user: req.user
      });
    }
    
    // Get Phase 1 (Complete and Submit BCR form)
    const nextPhase = await prisma.BcrConfigs.findFirst({
      where: {
        type: 'phase',
        value: '1'
      }
    });
    
    // Create a BCR from the submission - this function now checks for existing BCRs
    const bcr = await bcrModel.createBcrFromSubmission(submissionId);
    
    // Set the BCR to Phase 1 with New Submission status
    if (nextPhase) {
      await prisma.Bcr.update({
        where: { id: bcr.id },
        data: {
          currentPhase: nextPhase.value,
          status: 'New Submission'
        }
      });
      console.log(`BCR moved to phase: ${nextPhase.value} with status: New Submission`);
    }
    
    // Mark submission as reviewed with outcome
    await prisma.Submission.update({
      where: { id: submissionId },
      data: {
        reviewedAt: new Date(),
        reviewOutcome: 'Approved',
        bcrId: bcr.id,
        updatedAt: new Date()
      }
    });
    
    // Update global counters
    await counterService.updateCountersOnApproval(submissionId, bcr.id);
    console.log('Updated global counters after approval');
    
    // Render confirmation page
    res.render('bcr-submission/confirm', {
      title: 'BCR Created',
      message: `BCR ${bcr.bcrCode} has been created from submission ${submission.submissionCode} and moved to "${nextPhase?.name || 'Phase 1: Complete and Submit BCR form'}" with status "New Submission"`,
      submission,
      bcr,
      bcrId: bcr.id,
      action: 'approve',
      user: req.user
    });
  } catch (error) {
    console.error('Error approving submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while approving the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Reject a submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const reject = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get the submission
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    if (submission.deletedAt) {
      return res.status(400).render('bcr-submission/warning', {
        title: 'Cannot Reject Deleted Submission',
        message: 'This submission has been deleted and cannot be rejected',
        submission,
        user: req.user
      });
    }
    
    // Mark submission as rejected with outcome
    await prisma.Submission.update({
      where: { id: submissionId },
      data: {
        reviewedAt: new Date(),
        reviewOutcome: 'Rejected',
        updatedAt: new Date()
      }
    });
    
    // Update global counters
    await counterService.updateCountersOnRejection(submissionId);
    console.log('Updated global counters after rejection');
    
    // Render confirmation page
    res.render('bcr-submission/confirm', {
      title: 'Submission Rejected',
      message: `Submission ${submission.submissionCode} has been rejected`,
      submission,
      action: 'reject',
      user: req.user
    });
  } catch (error) {
    console.error('Error rejecting submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while rejecting the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Request more information for a submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const requestMoreInfo = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get the submission
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    if (submission.deletedAt) {
      return res.status(400).render('bcr-submission/warning', {
        title: 'Cannot Process Deleted Submission',
        message: 'This submission has been deleted and cannot be processed',
        submission,
        user: req.user
      });
    }
    
    // Mark submission with outcome
    await prisma.Submission.update({
      where: { id: submissionId },
      data: {
        reviewedAt: new Date(),
        reviewOutcome: 'More Info',
        updatedAt: new Date()
      }
    });
    
    // Render confirmation page
    res.render('bcr-submission/confirm', {
      title: 'More Information Requested',
      message: `More information has been requested for submission ${submission.submissionCode}`,
      submission,
      action: 'request-more-info',
      user: req.user
    });
  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while processing the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Reject and edit a submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const rejectAndEdit = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get the submission
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    if (submission.deletedAt) {
      return res.status(400).render('bcr-submission/warning', {
        title: 'Cannot Process Deleted Submission',
        message: 'This submission has been deleted and cannot be processed',
        submission,
        user: req.user
      });
    }
    
    // Mark submission with outcome
    await prisma.Submission.update({
      where: { id: submissionId },
      data: {
        reviewedAt: new Date(),
        reviewOutcome: 'Rejected & Edit',
        updatedAt: new Date()
      }
    });
    
    // Redirect to edit page
    res.redirect(`/bcr-submission/${submissionId}/edit`);
  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while processing the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Show confirmation page after submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const confirm = async (req, res) => {
  try {
    const submissionId = req.query.id;
    
    if (!submissionId) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'Submission ID is required',
        error: {},
        user: req.user
      });
    }
    
    // Get the submission
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    // Render confirmation page
    res.render('bcr-submission/confirm', {
      title: 'Submission Received',
      message: `Your submission has been received with reference number ${submission.submissionCode}`,
      submission,
      action: 'submit',
      user: req.user
    });
  } catch (error) {
    console.error('Error showing confirmation page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the confirmation page',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render the edit form for a submission
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const edit = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    // Get all impacted areas for the form
    const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
    
    res.render('bcr-submission/edit', {
      title: 'Edit Submission',
      submission,
      impactAreas: impactedAreas,
      submissionSources: SUBMISSION_SOURCES,
      urgencyLevels: URGENCY_LEVELS,
      attachmentsOptions: ATTACHMENTS_OPTIONS,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error rendering edit form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Update a BCR submission
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const update = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Extract submission data from request body
    const submissionData = {
      fullName: req.body.fullName,
      emailAddress: req.body.emailAddress,
      submissionSource: req.body.submissionSource,
      organisation: req.body.organisation,
      briefDescription: req.body.briefDescription,
      justification: req.body.justification,
      urgencyLevel: req.body.urgencyLevel,
      impactAreas: Array.isArray(req.body.impactAreas) ? req.body.impactAreas : [req.body.impactAreas].filter(Boolean),
      affectedReferenceDataArea: req.body.affectedReferenceDataArea,
      technicalDependencies: req.body.technicalDependencies,
      relatedDocuments: req.body.relatedDocuments,
      attachments: req.body.attachments,
      additionalNotes: req.body.additionalNotes
    };
    
    // Get editor name from the user object or use a default
    const editorName = req.user ? req.user.name : 'System User';
    
    // Update the submission
    const submission = await submissionModel.updateSubmission(submissionId, submissionData, editorName);
    
    // Check if there were any changes made
    if (submission.editHistory && submission.editHistory.length > 0) {
      // Redirect to the confirmation page
      return res.redirect(`/bcr-submission/${submissionId}/edit-confirm`);
    } else {
      // No changes were made, redirect back to review page
      return res.redirect(`/bcr-submission/${submissionId}/review`);
    }
  } catch (error) {
    console.error('Error updating submission:', error);
    
    // Get the submission
    const submission = await submissionModel.getSubmissionById(req.params.id);
    
    // Get all impacted areas for the form
    const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
    
    // Re-render the form with error
    res.status(400).render('bcr-submission/edit', {
      title: 'Edit Submission',
      submission,
      impactAreas,
      submissionSources: SUBMISSION_SOURCES,
      urgencyLevels: URGENCY_LEVELS,
      attachmentsOptions: ATTACHMENTS_OPTIONS,
      formData: req.body,
      error: error.message,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * Show edit confirmation page
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const editConfirm = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    // Extract edit history from additional notes
    let editHistory = [];
    const editHistoryMarker = '[EDIT_HISTORY]';
    
    if (submission.additionalNotes && submission.additionalNotes.includes(editHistoryMarker)) {
      const historyStart = submission.additionalNotes.indexOf(editHistoryMarker);
      if (historyStart !== -1) {
        try {
          const historyJson = submission.additionalNotes.substring(historyStart + editHistoryMarker.length);
          editHistory = JSON.parse(historyJson);
        } catch (e) {
          console.error('Error parsing edit history:', e);
          editHistory = [];
        }
      }
    }
    
    res.render('bcr-submission/edit-confirm', {
      title: 'Edit Confirmation',
      submission,
      editHistory: editHistory.length > 0 ? editHistory[0] : null,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error showing edit confirmation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while showing the edit confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Reinstate a rejected submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const reinstate = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get the submission
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    if (submission.deletedAt) {
      return res.status(400).render('bcr-submission/warning', {
        title: 'Cannot Reinstate Deleted Submission',
        message: 'This submission has been deleted and cannot be reinstated',
        submission,
        user: req.user
      });
    }
    
    // Check if the submission is rejected
    // Note: We can't check for rejected status directly since there's no status field
    // For now, we're assuming all submissions are eligible for reinstatement
    // This logic needs to be updated once we determine how rejected submissions are tracked
    
    // Reinstate the submission
    // Since there's no status field, we just update the timestamp
    await prisma.Submission.update({
      where: { id: submissionId },
      data: {
        updatedAt: new Date()
      }
    });
    
    // Add reinstatement to the approval history
    const editHistoryMarker = '[EDIT_HISTORY]';
    let additionalNotes = submission.additionalNotes || '';
    let editHistory = [];
    
    if (additionalNotes.includes(editHistoryMarker)) {
      const historyStart = additionalNotes.indexOf(editHistoryMarker);
      try {
        const historyJson = additionalNotes.substring(historyStart + editHistoryMarker.length);
        editHistory = JSON.parse(historyJson);
      } catch (e) {
        console.error('Error parsing edit history:', e);
        editHistory = [];
      }
    }
    
    // Add reinstatement entry
    const reinstatementEntry = {
      action: 'Reinstated',
      date: new Date(),
      user: req.user ? req.user.name : 'System',
      details: 'Submission reinstated for review'
    };
    
    editHistory.unshift(reinstatementEntry);
    
    // Update the additional notes with the new edit history
    const newAdditionalNotes = additionalNotes.includes(editHistoryMarker)
      ? additionalNotes.substring(0, additionalNotes.indexOf(editHistoryMarker)) + editHistoryMarker + JSON.stringify(editHistory)
      : additionalNotes + '\n\n' + editHistoryMarker + JSON.stringify(editHistory);
    
    await prisma.Submission.update({
      where: { id: submissionId },
      data: {
        additionalNotes: newAdditionalNotes
      }
    });
    
    // Redirect to the review page
    res.redirect(`/bcr-submission/${submissionId}/review`);
  } catch (error) {
    console.error('Error reinstating submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while reinstating the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Handle review action form submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const reviewAction = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { reviewOutcome, comments } = req.body;
    
    // Get the submission
    const submission = await submissionModel.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    if (submission.deletedAt) {
      return res.status(400).render('bcr-submission/warning', {
        title: 'Cannot Review Deleted Submission',
        message: 'This submission has been deleted and cannot be reviewed',
        submission,
        user: req.user
      });
    }
    
    // Process based on review outcome
    switch (reviewOutcome) {
      case 'approve':
        // Update submission with Approved status first
        await prisma.Submission.update({
          where: { id: submissionId },
          data: {
            reviewedAt: new Date(),
            reviewOutcome: 'Approved',
            updatedAt: new Date()
          }
        });
        // Redirect to the approve endpoint
        return res.redirect(`/bcr-submission/${submissionId}/approve`);
        
      case 'reject':
        // Update submission as rejected
        await prisma.Submission.update({
          where: { id: submissionId },
          data: {
            reviewedAt: new Date(),
            reviewOutcome: 'Rejected',
            reviewComments: comments || null,
            updatedAt: new Date()
          }
        });
        
        // Refresh counters to update the dashboard
        await refreshCounters();
        
        return res.render('bcr-submission/review-complete', {
          title: 'Submission Rejected',
          message: 'The submission has been rejected',
          submission,
          reviewOutcome: 'Rejected',
          user: req.user
        });
        
      case 'request-more-info':
        // Update submission to request more info
        await prisma.Submission.update({
          where: { id: submissionId },
          data: {
            reviewedAt: new Date(),
            reviewOutcome: 'More Info',
            reviewComments: comments || null,
            updatedAt: new Date()
          }
        });
        
        // Refresh counters to update the dashboard
        await refreshCounters();
        
        return res.render('bcr-submission/review-complete', {
          title: 'More Information Requested',
          message: 'The submission requires more information',
          submission,
          reviewOutcome: 'More Info',
          user: req.user
        });
        
      case 'pause':
        // Update submission as paused
        await prisma.Submission.update({
          where: { id: submissionId },
          data: {
            reviewedAt: new Date(),
            reviewOutcome: 'Paused',
            reviewComments: comments || null,
            updatedAt: new Date()
          }
        });
        
        // Refresh counters to update the dashboard
        await refreshCounters();
        
        return res.render('bcr-submission/review-complete', {
          title: 'Review Paused',
          message: 'The review of this submission has been paused',
          submission,
          reviewOutcome: 'Paused',
          user: req.user
        });
        
      default:
        return res.status(400).render('error', {
          title: 'Invalid Review Outcome',
          message: 'The review outcome provided is not valid',
          error: {},
          user: req.user
        });
    }
  } catch (error) {
    console.error('Error processing review action:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while processing the review action',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Show the review history for a submission
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const submissionReviews = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get the submission with all its details
    const submission = await prisma.Submission.findUnique({
      where: { id: submissionId }
    });
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: req.user
      });
    }
    
    // Format dates for display
    const createdAtFormatted = submission.createdAt ? 
      new Date(submission.createdAt).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }) : 'Unknown';
    
    // Get review history if available
    // Note: This is a placeholder. In a real implementation, you would fetch review history from the database
    // For now, we'll create a mock review history based on the current review data
    let reviews = [];
    
    if (submission.reviewedAt) {
      // Create a mock review entry based on the current review data
      reviews.push({
        reviewerName: req.user ? req.user.name : 'System',
        outcome: submission.reviewOutcome,
        comments: submission.reviewComments,
        createdAt: submission.reviewedAt,
        bcrId: submission.bcrId
      });
    }
    
    // Render the reviews page
    return res.render('bcr-submission/reviews', {
      title: 'Submission Reviews',
      submission: {
        ...submission,
        createdAtFormatted
      },
      reviews,
      user: req.user
    });
  } catch (error) {
    console.error('Error viewing submission reviews:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while viewing submission reviews',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

module.exports = {
  newForm,
  createSubmission,
  list,
  reviewSubmission,
  reviewAction,
  submissionReviews,
  approve,
  reject,
  requestMoreInfo,
  rejectAndEdit,
  confirm,
  edit,
  update,
  deleteSubmission,
  hardDeleteSubmission,
  editConfirm,
  reinstate
};
