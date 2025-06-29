/**
 * BCR Submissions Routes
 * Handles all routes related to submissions that may become BCRs
 */
const express = require('express');
const router = express.Router();
const bcrController = require('../../../controllers/modules/bcr/controller');
const reviewController = require('../../../controllers/modules/bcr/reviewController');

// List all submissions (not yet BCRs)
router.get('/', bcrController.listSubmissions);
router.get('/list', bcrController.listSubmissions); // For backward compatibility

// View a specific submission
router.get('/:submissionId', bcrController.viewSubmission);

// Edit a submission
router.get('/:submissionId/edit', bcrController.editSubmissionForm);
router.post('/:submissionId/edit', bcrController.updateSubmission);

// Review a submission (this is where a submission can be approved and become a BCR)
router.get('/:submissionId/review', reviewController.renderReviewForm);
router.post('/:submissionId/review', reviewController.processReview);

module.exports = router;
