/**
 * Submissions Module Routes
 * Stand-alone routes for managing BCR submissions, detached from the BCR module.
 * For the initial extraction we reuse the existing controllers while we refactor
 * later. All paths are prefixed with /submissions at mount-time.
 */

const express = require('express');
const router = express.Router();

// Middleware
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Re-use existing controllers for now
const splitViewController = require('../../../controllers/modules/submissions/splitViewController');
const submissionController = require('../../../controllers/modules/submissions/submissionController');
const reviewController = require('../../../controllers/reviewController');

/* === Submission Routes === */

// Legacy /view route redirect to details page
router.get('/view/:submissionId', (req, res) => {
  return res.redirect(`/submissions/${req.params.submissionId}/details`);
});
// Default to submissions list/dashboard view
router.get('/', submissionController.submissionDashboard);
// List with pagination
router.get('/list', submissionController.listSubmissions);
router.get('/dashboard', submissionController.submissionDashboard);

// Create / Submit new submission
router.get('/new', csrfProtection, submissionController.newSubmissionForm);
router.post('/new', csrfProtection, submissionController.createSubmission);

// Individual submission routes
// Edit submission
router.get('/:submissionId/edit', csrfProtection, submissionController.editSubmissionForm);
// Delete submission
router.get('/:submissionId/delete', csrfProtection, submissionController.deleteSubmissionConfirm);
router.post('/:submissionId/delete', csrfProtection, submissionController.deleteSubmission);
router.post('/:submissionId/edit', csrfProtection, submissionController.updateSubmission);

router.get('/:submissionId/details',  splitViewController.viewSubmissionDetails);
router.get('/:submissionId/dates',    splitViewController.viewSubmissionDates);
router.get('/:submissionId/workflow', splitViewController.viewSubmissionWorkflow);
router.get('/:submissionId/history',  splitViewController.viewSubmissionHistory);

// Fallback: /submissions/:id shows details page
router.get('/:submissionId', (req,res)=>res.redirect(`/submissions/${req.params.submissionId}/details`));

// Review workflow for submissions
router.get('/:submissionId/review', csrfProtection, reviewController.renderReviewForm);
router.post('/:submissionId/review', csrfProtection, reviewController.processReview);

// Legacy /view path support
router.get('/view/:submissionId/review', csrfProtection, reviewController.renderReviewForm);
router.post('/view/:submissionId/review', csrfProtection, reviewController.processReview);

module.exports = router;
