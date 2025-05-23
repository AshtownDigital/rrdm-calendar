/**
 * Funding Management Routes
 * Main entry point for all funding-related routes
 */
const express = require('express');
const router = express.Router();
const { indexController, allocationsController } = require('../../controllers/funding');

// Main funding page
router.get('/', indexController.index);

// Funding requirements routes
router.get('/requirements', allocationsController.listRequirements);
router.get('/requirements/:id', allocationsController.viewRequirementDetails);
router.get('/requirements/:id/edit', allocationsController.showEditRequirementForm);
router.post('/requirements/:id/update', allocationsController.updateRequirement);

// Funding history routes
router.get('/history', allocationsController.viewFundingHistory);

// Funding reports routes
router.get('/reports', allocationsController.viewReports);

// Structured funding view routes
router.get('/structured-view', allocationsController.viewStructuredFunding);

// Subject records routes
router.get('/subject-records', allocationsController.viewSubjectRecords);

module.exports = router;
