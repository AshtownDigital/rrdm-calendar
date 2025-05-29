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
router.get('/:id', bcrController.viewSubmission);

// Edit a submission
router.get('/:id/edit', bcrController.editSubmissionForm);
router.post('/:id/edit', bcrController.updateSubmission);

// Review a submission (this is where a submission can be approved and become a BCR)
router.get('/:id/review', reviewController.renderReviewForm);
router.post('/:id/review', reviewController.processReview);

module.exports = router;
