/**
 * BCR Submission Controller
 * Handles submission form rendering, creation, review, and deletion
 */
const submissionModel = require('../../models/bcr-submission/model');
const bcrModel = require('../../models/bcr/model');
const impactedAreasModel = require('../../models/impacted-areas/model');
const counterService = require('../../services/counterService');
const { refreshCounters } = counterService;
const { SUBMISSION_SOURCES, URGENCY_LEVELS, ATTACHMENTS_OPTIONS } = require('../../config/constants');
const { formatDate } = require('../../utils/dateUtils');

// Import MongoDB models
const Submission = require('../../models/Submission');
const Bcr = require('../../models/Bcr');
const ImpactedArea = require('../../models/ImpactedArea');
const BcrConfig = require('../../models/BcrConfig');

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
    const submission = await submissionModel.getSubmissionById(submissionId);
    
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
    
    // Render the review form
    res.render('bcr-submission/review', {
      title: 'Review Submission',
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
    
    // Soft delete the submission
    await submissionModel.softDeleteSubmission(submissionId);
    
    // Refresh counters to update the dashboard
    await refreshCounters();
    
    // Redirect to the submissions list
    res.redirect('/bcr-submission/list?deleted=true');
  } catch (error) {
    console.error('Error deleting submission:', error);
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
    
    // Hard delete the submission
    await submissionModel.hardDeleteSubmission(submissionId);
    
    // Refresh counters to update the dashboard
    await refreshCounters();
    
    // Redirect to the submissions list
    res.redirect('/bcr-submission/list?deleted=true');
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
    // Get all submissions
    const submissions = await submissionModel.getAllSubmissions();
    
    // Format submissions for display
    const formattedSubmissions = submissions.map(submission => {
      return {
        ...submission,
        createdAtFormatted: submission.createdAt ? 
          new Date(submission.createdAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Unknown',
        statusTag: getSubmissionStatusTag(submission)
      };
    });
    
    // Render the list page
    res.render('bcr-submission/list', {
      title: 'BCR Submissions',
      submissions: formattedSubmissions,
      deleted: req.query.deleted === 'true',
      user: req.user
    });
  } catch (error) {
    console.error('Error listing submissions:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while listing submissions',
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
const getSubmissionStatusTag = (submission) => {
  if (submission.deleted) {
    return 'govuk-tag govuk-tag--grey';
  }
  
  if (submission.bcrId) {
    return 'govuk-tag govuk-tag--green';
  }
  
  if (submission.reviewOutcome === 'Rejected') {
    return 'govuk-tag govuk-tag--red';
  }
  
  if (submission.reviewOutcome === 'More Info') {
    return 'govuk-tag govuk-tag--yellow';
  }
  
  return 'govuk-tag govuk-tag--blue';
};

/**
 * Render the review page for a submission
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const review = async (req, res) => {
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
    
    // Format dates for display
    const createdAtFormatted = submission.createdAt ? 
      new Date(submission.createdAt).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }) : 'Unknown';
    
    // Render the review page
    res.render('bcr-submission/review', {
      title: 'Review Submission',
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
 * Approve a submission and create a BCR
 * @param {import('express').Request} req 
 * @param {import('express').Response} res
 */
const approve = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { comments } = req.body;
    
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
    
    // Check if the submission has already been approved
    if (submission.bcrId) {
      return res.status(400).render('error', {
        title: 'Already Approved',
        message: 'This submission has already been approved and a BCR has been created',
        error: {},
        user: req.user
      });
    }
    
    // Update submission as approved
    await submissionModel.updateSubmission(submissionId, {
      reviewedAt: new Date(),
      reviewOutcome: 'Approved',
      reviewComments: comments || null
    });
    
    // Create a BCR from the submission
    const bcr = await bcrModel.createBcrFromSubmission(submissionId);
    
    // Update the submission with the BCR ID
    await submissionModel.updateSubmission(submissionId, {
      bcrId: bcr._id
    });
    
    // Refresh counters to update the dashboard
    await refreshCounters();
    
    // Render the approval confirmation page
    res.render('bcr-submission/review-complete', {
      title: 'Submission Approved',
      message: `Submission approved and BCR ${bcr.bcrCode} created`,
      submission,
      bcr,
      reviewOutcome: 'Approved',
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
    const { comments } = req.body;
    
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
    
    // Update submission as rejected
    await submissionModel.updateSubmission(submissionId, {
      reviewedAt: new Date(),
      reviewOutcome: 'Rejected',
      reviewComments: comments || null
    });
    
    // Refresh counters to update the dashboard
    await refreshCounters();
    
    // Render the rejection confirmation page
    res.render('bcr-submission/review-complete', {
      title: 'Submission Rejected',
      message: 'The submission has been rejected',
      submission,
      reviewOutcome: 'Rejected',
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
    const { comments } = req.body;
    
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
    
    // Update submission to request more info
    await submissionModel.updateSubmission(submissionId, {
      reviewedAt: new Date(),
      reviewOutcome: 'More Info',
      reviewComments: comments || null
    });
    
    // Refresh counters to update the dashboard
    await refreshCounters();
    
    // Render the more info confirmation page
    res.render('bcr-submission/review-complete', {
      title: 'More Information Requested',
      message: 'The submission requires more information',
      submission,
      reviewOutcome: 'More Info',
      user: req.user
    });
  } catch (error) {
    console.error('Error requesting more info for submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while requesting more information',
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
    
    // Update submission as rejected
    await submissionModel.updateSubmission(submissionId, {
      reviewedAt: new Date(),
      reviewOutcome: 'Rejected',
      reviewComments: 'Rejected for editing'
    });
    
    // Refresh counters to update the dashboard
    await refreshCounters();
    
    // Redirect to the edit page
    res.redirect(`/bcr-submission/edit/${submissionId}`);
  } catch (error) {
    console.error('Error rejecting and editing submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while rejecting and editing the submission',
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
    
    // Render the confirmation page
    res.render('bcr-submission/confirm', {
      title: 'Submission Received',
      message: `Your submission has been received with reference number ${submission.submissionCode}`,
      submission,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing confirmation page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while showing the confirmation page',
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
    
    // Get all impacted areas for the form
    const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
    
    // Render the edit form
    res.render('bcr-submission/edit', {
      title: 'Edit Submission',
      submissionSources: SUBMISSION_SOURCES,
      urgencyLevels: URGENCY_LEVELS,
      attachmentsOptions: ATTACHMENTS_OPTIONS,
      impactAreas: impactedAreas,
      submission,
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
      additionalNotes: req.body.additionalNotes,
      declaration: req.body.declaration === 'true' || req.body.declaration === true,
      updatedAt: new Date()
    };
    
    // Update the submission
    await submissionModel.updateSubmission(submissionId, submissionData);
    
    // Redirect to the edit confirmation page
    res.redirect(`/bcr-submission/edit-confirm/${submissionId}`);
  } catch (error) {
    console.error('Error updating submission:', error);
    
    // Get all impacted areas for the form
    const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
    
    // Re-render the edit form with error
    res.status(400).render('bcr-submission/edit', {
      title: 'Edit Submission',
      submissionSources: SUBMISSION_SOURCES,
      urgencyLevels: URGENCY_LEVELS,
      attachmentsOptions: ATTACHMENTS_OPTIONS,
      impactAreas: impactedAreas,
      submission: {
        id: req.params.id,
        ...req.body
      },
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
    
    // Render the edit confirmation page
    res.render('bcr-submission/edit-confirm', {
      title: 'Submission Updated',
      message: `Your submission ${submission.submissionCode} has been updated`,
      submission,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing edit confirmation page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while showing the edit confirmation page',
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
    
    // Check if the submission is rejected
    if (submission.reviewOutcome !== 'Rejected') {
      return res.status(400).render('error', {
        title: 'Invalid Action',
        message: 'Only rejected submissions can be reinstated',
        error: {},
        user: req.user
      });
    }
    
    // Update submission to reinstate it
    await submissionModel.updateSubmission(submissionId, {
      reviewedAt: null,
      reviewOutcome: null,
      reviewComments: null,
      updatedAt: new Date()
    });
    
    // Refresh counters to update the dashboard
    await refreshCounters();
    
    // Redirect to the submissions list
    res.redirect('/bcr-submission/list?reinstated=true');
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
    const { action, comments } = req.body;
    
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
    
    // Handle different review actions
    switch (action) {
      case 'approve':
        return approve(req, res);
        
      case 'reject':
        return reject(req, res);
        
      case 'more-info':
        return requestMoreInfo(req, res);
        
      case 'reject-edit':
        return rejectAndEdit(req, res);
        
      case 'pause':
        // Update submission as paused
        await submissionModel.updateSubmission(submissionId, {
          reviewedAt: new Date(),
          reviewOutcome: 'Paused',
          reviewComments: comments || null
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
    const submission = await submissionModel.getSubmissionById(submissionId);
    
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
  reinstate,
  review
};
