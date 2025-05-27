/**
 * BCR Routes
 * Routes for the BCR module
 * Follows the structure defined in docs/bcr/ROUTE_DEFINITIONS.md
 */
const express = require('express');
const router = express.Router();

// Import controllers
const { 
  submissionsController,
  bcrController,
  impactedAreasController,
  authController,
  dashboardController
} = require('../../controllers/bcr');

// Root path handler - show BCR dashboard
router.get('/', (req, res) => {
  res.redirect('/bcr/dashboard');
});

// BCR Dashboard
router.get('/dashboard', dashboardController.dashboard);

// BCR Module Status
router.get('/module-status', dashboardController.moduleStatus);

// --- BCR Submissions ---
// New submission form
router.get('/bcr-submission/new', submissionsController.newSubmission);
// Create new submission
router.post('/bcr-submission', submissionsController.createSubmission);
// Review submission
router.post('/bcr-submission/:id/review', submissionsController.reviewSubmission);

// --- BCRs ---
// View BCR details
router.get('/bcr/:id', bcrController.viewBCR);
// Update BCR form
router.get('/bcr/:id/update', bcrController.updateBCRForm);
// Submit BCR update
router.post('/bcr/:id/update', bcrController.submitBCRUpdate);
// Confirmation page
router.get('/bcr/:id/confirm', bcrController.confirmationPage);
// Restricted action warning page
router.get('/bcr/:id/warning', bcrController.restrictedActionPage);

// --- Impacted Areas ---
// List all impacted areas
router.get('/impacted-areas', impactedAreasController.listAreas);
// New impacted area form
router.get('/impacted-areas/new', impactedAreasController.newAreaForm);
// Create new impacted area
router.post('/impacted-areas', impactedAreasController.createArea);
// Edit impacted area form
router.get('/impacted-areas/:id/edit', impactedAreasController.editAreaForm);
// Update impacted area
router.post('/impacted-areas/:id/update', impactedAreasController.updateArea);
// Delete impacted area
router.post('/impacted-areas/:id/delete', impactedAreasController.deleteArea);

// --- Authentication ---
// Login form
router.get('/login', authController.loginForm);
// Process login
router.post('/login', authController.login);
// Logout
router.get('/logout', authController.logout);

module.exports = router;
