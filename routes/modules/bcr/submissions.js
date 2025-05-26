/**
 * BCR Submissions Routes
 * Handles all routes related to BCR submissions
 */
const express = require('express');
const router = express.Router();
const bcrController = require('../../../controllers/modules/bcr/controller');
const reviewController = require('../../../controllers/modules/bcr/reviewController');

// List all submissions
router.get('/', bcrController.listSubmissions);
router.get('/list', bcrController.listSubmissions); // For backward compatibility

// View a specific submission
router.get('/:id', bcrController.viewSubmission);

// Review a submission
router.get('/:id/review', reviewController.renderReviewForm);
router.post('/:id/review', reviewController.processReview);

module.exports = router;
