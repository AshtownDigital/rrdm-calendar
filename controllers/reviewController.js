/**
 * BCR Review Controller
 * Handles the review process for BCR submissions
 */
const { Submission } = require('../models');
const dayjs = require('dayjs');
const workflowService = require('../services/modules/bcr/workflowService');

/**
 * Render the submission review form
 */
exports.renderReviewForm = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    
    // Find the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Submission not found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    // Render the review form using the new folder structure
    res.render('bcr/submissions/review', {
      title: 'Review Submission',
      submission,
      statusOptions: [
        { value: 'Approved', text: 'Approve (Convert to Business Change Request)', color: 'green' },
        { value: 'Rejected', text: 'Reject', color: 'red' },
        { value: 'Paused', text: 'Pause', color: 'yellow' },
        { value: 'Closed', text: 'Close', color: 'grey' },
        { value: 'More Info Required', text: 'Request More Information', color: 'blue' }
      ],
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    // Log error
    const errorMsg = `Error in reviewSubmissionForm controller: ${error.message}`;
    if (process.env.NODE_ENV === 'development') {
      // Only log full error in development
      console.error(errorMsg, error);
    }
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the review form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process the submission review
 */
exports.processReview = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    const { reviewStatus, comments, infoRequestedDate, infoReceivedDate, urgencyLevel } = req.body;
    const status = reviewStatus || req.body.status;
    
    // Prepare additional review data
    const reviewData = {
      comments,
      reviewerId: req.user ? req.user.id : null,
      infoRequestedDate: infoRequestedDate ? dayjs(infoRequestedDate, 'YYYY-MM-DD').toDate() : undefined,
      infoReceivedDate: infoReceivedDate ? dayjs(infoReceivedDate, 'YYYY-MM-DD').toDate() : undefined,
      urgencyLevel: urgencyLevel || undefined
    };

    // Update the submission status and additional fields
    const result = await workflowService.updateSubmissionStatus(submissionId, status, reviewData);
    
    // If approved and BCR created, redirect to the Business Change Request page
    if (status === 'Approved' && result.bcr) {
      return res.redirect(`/bcr/business-change-requests/${result.bcr._id}`);
    }
    
    // Otherwise redirect to the submission page
    res.redirect(`/bcr/submissions/${submissionId}`);
  } catch (error) {
    // Log error
    const errorMsg = `Error in processReview controller: ${error.message}`;
    if (process.env.NODE_ENV === 'development') {
      // Only log full error in development
      console.error(errorMsg, error);
    }
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while processing the review',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};
