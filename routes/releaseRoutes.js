const express = require('express');
const router = express.Router();
const releaseController = require('../controllers/releaseController'); // We'll create this next
// const { isAuthenticated, authorizeRoles } = require('../middleware/authMiddleware'); // Assuming auth middleware exists

// TODO: Add appropriate authentication and authorization middleware to routes

// Create a new release
// router.post('/', isAuthenticated, authorizeRoles(['admin', 'manager']), releaseController.createRelease);
router.post('/', releaseController.createRelease); // Placeholder without auth

// Get all releases
// router.get('/', isAuthenticated, releaseController.getAllReleases);
router.get('/', releaseController.getAllReleases); // Placeholder without auth

// Get a single release by ID
// router.get('/:id', isAuthenticated, releaseController.getReleaseById);
router.get('/:id', releaseController.getReleaseById); // Placeholder without auth

// Update a release by ID
// router.put('/:id', isAuthenticated, authorizeRoles(['admin', 'manager']), releaseController.updateRelease);
router.put('/:id', releaseController.updateRelease); // Placeholder without auth

// Delete a release by ID
// router.delete('/:id', isAuthenticated, authorizeRoles(['admin', 'manager']), releaseController.deleteRelease);
router.delete('/:id', releaseController.deleteRelease); // Placeholder without auth

// Generate standard releases for a given academic year
// router.post('/academic-year/:academicYearId/generate-standard', isAuthenticated, authorizeRoles(['admin', 'manager']), releaseController.generateStandardReleases);
router.post('/academic-year/:academicYearId/generate-standard', releaseController.generateStandardReleases); // Placeholder without auth

// Generate standard releases for all relevant academic years
// router.post('/generate', isAuthenticated, authorizeRoles(['admin', 'manager']), releaseController.generateAllReleases);
router.post('/generate', releaseController.generateAllReleases); // Placeholder without auth


module.exports = router;
