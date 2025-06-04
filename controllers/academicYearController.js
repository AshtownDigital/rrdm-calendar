const academicYearService = require('../services/academicYearService');
const AcademicYear = require('../models/academicYear'); // Assuming model path. Moved here for clarity if used globally or ensure it's only where needed.

/**
 * Handles the creation of a new academic year.
 * Expects startDate in req.body.
 * Expects userId and username to be available on req.user (from auth middleware).
 */
async function handleCreateAcademicYear(req, res) {
  try {
    // The service layer now expects an object { startDate, status? }
    // req.body should contain startDate and optionally status.
    const { startDate, status } = req.body;
    
    // Assuming authentication middleware populates req.user
    // Fallback if req.user is not available (e.g., for initial testing without full auth setup)
    const userId = req.user && req.user.id ? req.user.id : 'SYSTEM'; // Or req.user._id depending on your User model
    const username = req.user && req.user.username ? req.user.username : 'system';

    if (!startDate) {
      return res.status(400).json({ message: 'Start Date (startDate) is required in the request body.' });
    }

    // Pass the data object { startDate, status } to the service
    const academicYear = await academicYearService.createAcademicYear({ startDate, status }, userId, username);
    return res.status(201).json(academicYear);

  } catch (error) {
    console.error('Error in handleCreateAcademicYear:', error.message);
    if (error.message.includes('already exists') || error.message.includes('Invalid Start Date')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'An unexpected error occurred while creating the academic year.' });
  }
}

/**
 * Handles the bulk creation of academic years.
 * Expects numberOfYears in req.body. StartYear is now auto-determined.
 */
// Note: 'const AcademicYear = require(...)' is already at the top.
// Note: 'const academicYearService = require(...)' is already at the top. NO LONGER NEEDED HERE.

async function handleBulkCreateAcademicYears(req, res) {
  console.log('\n--- handleBulkCreateAcademicYears ---');
  console.log('Timestamp:', new Date().toISOString());
  console.log('req.body:', JSON.stringify(req.body, null, 2));
  try {
    let { numberOfYears } = req.body;

    // Convert numberOfYears from form (string) to number
    numberOfYears = parseInt(numberOfYears, 10);

    if (isNaN(numberOfYears) || typeof numberOfYears !== 'number' || numberOfYears <= 0) {
      req.flash('error', 'Number of years is required and must be a positive integer.');
      return res.redirect('/academic-years');
    }
    if (numberOfYears > 10) { // Safety limit
      req.flash('error', 'Cannot create more than 10 academic years at a time for bulk operation.');
      return res.redirect('/academic-years');
    }

    // Determine startYear automatically
    let startYear;
    const latestAcademicYear = await AcademicYear.findOne().sort({ endDate: -1 });

    if (latestAcademicYear && latestAcademicYear.endDate) {
      startYear = latestAcademicYear.endDate.getUTCFullYear() + 1;
    } else {
      startYear = new Date().getUTCFullYear(); // Default to current year if no academic years exist
    }

    const userId = req.user && req.user.id ? req.user.id : 'SYSTEM_BULK';
    const username = req.user && req.user.username ? req.user.username : 'system_bulk';

    console.log('Calling service with startYear:', startYear, 'numberOfYears:', numberOfYears);
    const result = await academicYearService.createMultipleAcademicYears(String(startYear), numberOfYears, userId, username);
    console.log('Result from service:', JSON.stringify(result, null, 2));

    if (result.errorsEncountered.length > 0 && result.createdYears.length > 0) {
      req.flash('warning', `Bulk operation partially successful. ${result.createdYears.length} year(s) created. Errors: ${result.errorsEncountered.join(', ')}`);
    } else if (result.errorsEncountered.length > 0) {
      req.flash('error', `Bulk operation failed. Errors: ${result.errorsEncountered.join(', ')}`);
    } else {
      req.flash('success', `${result.createdYears.length} academic year(s) successfully generated starting from ${startYear}/${startYear + 1}.`);
    }
    return res.redirect('/academic-years');

  } catch (error) {
    console.error('Error in handleBulkCreateAcademicYears:', error.message);
    req.flash('error', error.message || 'An unexpected error occurred during bulk generation.');
    return res.redirect('/academic-years');
  }
}

/**
 * Handles listing academic years with pagination, filtering, and sorting.
 */
async function handleListAcademicYears(req, res) {
  try {
    // Extract query parameters for pagination, filtering, and sorting
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sortBy = 'startDate', // Default sort field
      sortOrder = 'asc'    // Default sort order (asc or desc)
    } = req.query;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      status,
      sortBy,
      sortOrder
    };

    const result = await academicYearService.listAcademicYears(options);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in handleListAcademicYears:', error);
    // More specific error handling can be added here based on error types
    if (error.message.includes('Failed to retrieve')) {
      res.status(500).json({ message: 'An error occurred while retrieving academic years.' });
    } else {
      res.status(500).json({ message: 'An unexpected error occurred.' });
    }
  }
}

/**
 * Handles retrieving a single academic year by its identifier (ID or UUID).
 */
async function handleGetAcademicYearByIdentifier(req, res) {
  try {
    const { identifier } = req.params;
    const academicYear = await academicYearService.getAcademicYearByIdentifier(identifier);

    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found.' });
    }

    res.status(200).json(academicYear);
  } catch (error) {
    console.error('Error in handleGetAcademicYearByIdentifier:', error);
    // In a real app, you might want to distinguish between different error types
    res.status(500).json({ message: 'An unexpected error occurred while retrieving the academic year.' });
  }
}

/**
 * Handles updating an existing academic year.
 * Expects identifier in req.params and updateData (startDate, status) in req.body.
 */
async function handleUpdateAcademicYear(req, res) {
  try {
    const { identifier } = req.params;
    const updateData = req.body; // Should contain fields like { startDate, status, academicBreaks }

    // Basic validation for updateData to ensure it's not attempting to update restricted fields.
    const allowedUpdates = ['startDate', 'status', 'academicBreaks'];
    const receivedKeys = Object.keys(updateData).filter(key => key !== '_method' && key !== '_csrf'); // Filter out form method fields
    
    for (const key of receivedKeys) {
      if (!allowedUpdates.includes(key)) {
        return res.status(400).json({ message: `Field '${key}' cannot be updated.` });
      }
    }
    if (receivedKeys.length === 0) {
        return res.status(400).json({ message: 'No update data provided.' });
    }
    
    // Process academicBreaks if present
    if (updateData.academicBreaks) {
      // If it's coming from a form, it might be an object with indexed keys
      if (!Array.isArray(updateData.academicBreaks)) {
        const academicBreaksArray = [];
        // Convert the object format to array
        Object.keys(updateData.academicBreaks).forEach(index => {
          const breakData = updateData.academicBreaks[index];
          if (breakData.startDate && breakData.endDate) {
            academicBreaksArray.push({
              startDate: new Date(breakData.startDate),
              endDate: new Date(breakData.endDate),
              description: breakData.description || ''
            });
          }
        });
        updateData.academicBreaks = academicBreaksArray;
      }
      
      // Validate dates
      for (const breakPeriod of updateData.academicBreaks) {
        const startDate = new Date(breakPeriod.startDate);
        const endDate = new Date(breakPeriod.endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ message: 'Invalid date format for academic break.' });
        }
        
        if (startDate >= endDate) {
          return res.status(400).json({ message: 'Break end date must be after start date.' });
        }
      }
    }

    const userId = req.user && req.user.id ? req.user.id : 'SYSTEM_UPDATE';
    const username = req.user && req.user.username ? req.user.username : 'system_update';

    const updatedAcademicYear = await academicYearService.updateAcademicYear(identifier, updateData, userId, username);
    
    return res.status(200).json(updatedAcademicYear);

  } catch (error)
 {
    console.error('Error in handleUpdateAcademicYear:', error.message);
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Invalid') || error.message.includes('Failed to update') || error.message.includes('Validation failed')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'An unexpected error occurred while updating the academic year.' });
  }
}

module.exports = {
  handleCreateAcademicYear,
  handleListAcademicYears,
  handleBulkCreateAcademicYears,
  handleUpdateAcademicYear,
  handleGetAcademicYearByIdentifier
};