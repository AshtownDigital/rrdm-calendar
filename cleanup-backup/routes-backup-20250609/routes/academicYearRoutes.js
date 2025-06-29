const express = require('express');
const router = express.Router();
const academicYearController = require('../controllers/academicYearController');

// Middleware for authentication (placeholder - to be implemented or replaced with your actual auth middleware)
const isAuthenticated = (req, res, next) => {
  // For now, we'll bypass authentication for easier testing
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

// router.patch('/:academicYearId/status', ...); // Manually update status
// router.patch('/:academicYearId/status', ...); // Manually update status
// router.delete('/:academicYearId', ...); // Archive/Deactivate an academic year (soft delete)

module.exports = router;
