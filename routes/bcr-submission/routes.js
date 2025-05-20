/**
 * BCR Submission Routes
 * Handles routes for BCR submissions
 */
const express = require('express');
const router = express.Router();
const submissionController = require('../../controllers/bcr-submission/controller');
const csrfProtection = require('../../middleware/csrf');

// List all BCR submissions
router.get('/', submissionController.list);

// Show public submission form
router.get('/new', submissionController.newForm);

// Submit a new BCR
router.post('/', csrfProtection, submissionController.createSubmission);

// Show review page for a submission
router.get('/:id/review', submissionController.reviewSubmission);

// Show submission reviews history
router.get('/:id/reviews', submissionController.submissionReviews);

// Show confirmation page after submission
router.get('/confirm', submissionController.confirm);

// Approve submission and create BCR (GET route for direct access)
router.get('/:id/approve', submissionController.approve);

// Reject submission (GET route for direct access)
router.get('/:id/reject', submissionController.reject);

// Edit submission (GET route for edit form)
router.get('/:id/edit', submissionController.edit);

// Edit confirmation page
router.get('/:id/edit-confirm', submissionController.editConfirm);

// POST routes for form submissions (with CSRF protection)
router.post('/:id/review-action', csrfProtection, submissionController.reviewAction);
router.post('/:id/approve', csrfProtection, submissionController.approve);
router.post('/:id/reject', csrfProtection, submissionController.reject);
router.post('/:id/request-more-info', csrfProtection, submissionController.requestMoreInfo);
router.post('/:id/reject-and-edit', csrfProtection, submissionController.rejectAndEdit);
router.post('/:id/update', csrfProtection, submissionController.update);
router.post('/:id/reinstate', csrfProtection, submissionController.reinstate);

// GET route for reinstating rejected submissions (for direct access)
router.get('/:id/reinstate', submissionController.reinstate);

// Soft-delete submission
router.post('/:id/delete', csrfProtection, submissionController.deleteSubmission);

// Permanently delete a submission
router.post('/:id/delete/permanent', csrfProtection, submissionController.hardDeleteSubmission);

module.exports = router;
