const express = require('express');
const router = express.Router();
const academicYearController = require('../controllers/academicYearController');

// Middleware for authentication (placeholder - to be implemented or replaced with your actual auth middleware)
const isAuthenticated = (req, res, next) => {
  // Example: Check if user is authenticated
  // Replace this with your actual authentication check
  if (req.user) { // Or req.session.user, etc.
    return next();
  }
  // For API routes, typically return 401/403 if not authenticated
  // For now, for easier testing, we can allow it or make it simpler.
  // In a real app, this should be robust.
  console.warn('Bypassing authentication for academic year route - ensure this is secured in production.');
  // Simulating a user for now if not present, for easier testing of controller logic
  if (!req.user) {
    req.user = { id: 'TEST_USER_ID', username: 'testuser' };
  }
  next(); 
};

/**
 * @route   GET /api/academic-years
 * @desc    List all academic years
 * @access  Private (to be secured with actual authentication middleware)
 */
router.get('/', isAuthenticated, academicYearController.handleListAcademicYears);

/**
 * @route   POST /api/academic-years
 * @desc    Create a new academic year
 * @access  Private (to be secured with actual authentication middleware)
 */
router.post('/', isAuthenticated, academicYearController.handleCreateAcademicYear);

/**
 * @route   POST /api/academic-years/bulk
 * @desc    Bulk create academic years
 * @access  Private (to be secured with actual authentication middleware)
 */
router.post('/bulk', isAuthenticated, academicYearController.handleBulkCreateAcademicYears);

// Future routes for this module can be added here:
// router.get('/', ...); // Get all academic years (with filtering/sorting)
/**
 * @route   GET /api/academic-years/:identifier
 * @desc    Get a single academic year by _id or uuid
 * @access  Private (to be secured with actual authentication middleware)
 */
router.get('/:identifier', isAuthenticated, academicYearController.handleGetAcademicYearByIdentifier);

/**
 * @route   PUT /api/academic-years/:identifier
 * @desc    Update an existing academic year by _id or uuid
 * @access  Private (to be secured with actual authentication middleware)
 */
router.put('/:identifier', isAuthenticated, academicYearController.handleUpdateAcademicYear);

// router.patch('/:id/status', ...); // Manually update status
// router.patch('/:id/status', ...); // Manually update status
// router.delete('/:id', ...); // Archive/Deactivate an academic year (soft delete)

module.exports = router;
