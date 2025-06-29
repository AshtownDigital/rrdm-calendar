const express = require('express');
const router = express.Router();
const releaseController = require('../controllers/releaseController');
// const { isAuthenticated, authorizeRoles } = require('../middleware/authMiddleware'); // Assuming auth middleware exists

// TODO: Add appropriate authentication and authorization middleware to routes
// Note: This file defines API routes for the release-management module

// Create a new release
// router.post('/', isAuthenticated, authorizeRoles(['admin', 'manager']), releaseController.createRelease);
router.post('/', releaseController.createRelease); // Placeholder without auth

// Get all releases
// router.get('/', isAuthenticated, releaseController.getAllReleases);
router.get('/', releaseController.getAllReleases); // Placeholder without auth

// Get a single release by ID
// router.get('/:releaseId', isAuthenticated, releaseController.getReleaseById);
router.get('/:releaseId', releaseController.getReleaseById); // Placeholder without auth

// Update a release by ID
// router.put('/:releaseId', isAuthenticated, authorizeRoles(['admin', 'manager']), releaseController.updateRelease);
router.put('/:releaseId', releaseController.updateRelease); // Placeholder without auth

// Delete a release by ID
// router.delete('/:releaseId', isAuthenticated, authorizeRoles(['admin', 'manager']), releaseController.deleteRelease);
router.delete('/:releaseId', releaseController.deleteRelease); // Placeholder without auth

// Generate standard releases for a given academic year
// router.post('/academic-year/:academicYearId/generate-standard', isAuthenticated, authorizeRoles(['admin', 'manager']), releaseController.generateStandardReleases);
router.post('/academic-year/:academicYearId/generate-standard', releaseController.generateStandardReleases); // Placeholder without auth

// Generate standard releases for all relevant academic years
// router.post('/generate', isAuthenticated, authorizeRoles(['admin', 'manager']), releaseController.generateAllReleases);
router.post('/generate', releaseController.generateAllReleases); // Placeholder without auth

// --- Routes for Frontend Data Population (e.g., for dropdowns) ---

// Get academic years that have releases
// router.get('/data/academic-years-for-releases', isAuthenticated, releaseController.getAcademicYearsForReleasesDropdown);
router.get('/data/academic-years-for-releases', releaseController.getAcademicYearsForReleasesDropdown); // Placeholder without auth

// Get releases by academic year ID
// router.get('/data/by-academic-year/:academicYearId', isAuthenticated, releaseController.getReleasesByAcademicYearDropdown);
router.get('/data/by-academic-year/:academicYearId', releaseController.getReleasesByAcademicYearDropdown); // Placeholder without auth


module.exports = router;
