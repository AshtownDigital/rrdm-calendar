const mongoose = require('mongoose');
const AcademicYear = require('../models/academicYear');
const releaseService = require('./releaseService'); // For automatic release generation
const { format } = require('date-fns'); // For date formatting

/**
 * Parses the start date input. If only a year is provided (e.g., "2025" or 2025),
 * it defaults to September 1st of that year.
 * If a full date string or Date object is provided, it's used directly.
 * @param {Date|String|Number} startDateInput - The input for the start date.
 * @returns {Date} The parsed start date.
 * @throws {Error} If the input cannot be resolved to a valid date.
 */
function parseStartDate(startDateInput) {
  if (startDateInput instanceof Date && !isNaN(startDateInput)) {
    return startDateInput; // Already a valid Date object
  }
  if (typeof startDateInput === 'string' || typeof startDateInput === 'number') {
    const year = parseInt(startDateInput, 10);
    if (!isNaN(year) && String(year).length === 4) {
      // Assume Sept 1st if only year is given
      return new Date(Date.UTC(year, 8, 1)); // Month is 0-indexed, so 8 is September
    }
    // Try parsing as a full date string
    const parsedDate = new Date(startDateInput);
    if (!isNaN(parsedDate)) {
      return parsedDate;
    }
  }
  throw new Error('Invalid Start Date input. Must be a Date object, a YYYY string/number, or a valid date string.');
}

/**
 * Creates a single new academic year record.
 * @param {Object} data - The data for the academic year (startDate, status).
 * @param {String} userId - The ID of the user performing the action (for audit log).
 * @param {String} username - The username of the user performing the action (for audit log).
 * @returns {Promise<Object>} The created academic year document.
 * @throws {Error} If creation fails or inputs are invalid.
 */
async function createAcademicYear(data, userId, username) {
  const { startDate: startDateInput, status } = data;

  if (!startDateInput) {
    throw new Error('Start Date is required to create an academic year.');
  }

  // Parse and validate that startDateInput will result in a Sept 1st Date object
  // The model's validator will also check this, but early validation is good.
  const parsedStartDate = parseStartDate(startDateInput); // Ensures it's a Date object, potentially defaulting to Sept 1st if only year given
  if (parsedStartDate.getUTCMonth() !== 8 || parsedStartDate.getUTCDate() !== 1) {
    throw new Error('Start Date must be September 1st.');
  }

  const academicYearData = {
    startDate: parsedStartDate,
  };

  if (status) {
    academicYearData.status = status; // Allow overriding default status if provided
  }

  const academicYear = new AcademicYear(academicYearData);
  academicYear.addToAuditLog(userId, username, 'Academic Year Created');

  try {
    await academicYear.save(); // Model's pre-save hook will derive name, code, endDate, fullName and validate
    return academicYear;
  } catch (error) {
    console.error('Error creating academic year:', error);
    if (error.code === 11000) { // MongoDB duplicate key error
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      let userMessage = `Failed to create academic year: A record with this ${field} already exists.`;
      if (field === 'startDate') {
        userMessage = `Failed to create academic year: An academic year starting on ${new Date(value).toLocaleDateString()} already exists.`
      }
      throw new Error(userMessage);
    }
    if (error.name === 'ValidationError') {
      // Extract a more user-friendly message from Mongoose validation errors
      const messages = Object.values(error.errors).map(e => e.message);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }
    throw new Error(`Failed to create academic year: ${error.message}`);
  }
}

/**
 * Validates the academic year sequence for gaps.
 * @param {Array} existingYears - An array of existing academic years sorted by startDate.
 * @returns {Array} An array of year numbers that are missing from the sequence.
 */
async function validateAcademicYearSequence() {
  // Get all existing academic years, sorted by startDate
  const existingYears = await AcademicYear.find({}).sort({ startDate: 1 }).lean().exec();
  
  if (existingYears.length === 0) {
    // No years exist yet, so no gaps
    return [];
  }
  
  // Find gaps in the sequence
  const missingYears = [];
  let previousYear = null;
  
  for (let i = 0; i < existingYears.length; i++) {
    const currentYear = existingYears[i];
    const startYear = currentYear.startDate.getUTCFullYear();
    
    if (previousYear !== null) {
      // Check if there's a gap between this year and the previous year
      const expectedStartYear = previousYear + 1;
      
      if (startYear > expectedStartYear) {
        // There's a gap - add all missing years to the array
        for (let missingYear = expectedStartYear; missingYear < startYear; missingYear++) {
          missingYears.push(missingYear);
        }
      }
    }
    
    previousYear = startYear;
  }
  
  return missingYears;
}

/**
 * Creates multiple academic year records, ensuring a continuous sequence without gaps.
 * @param {String|Number} startYearInput - The first year for which to create an academic year (e.g., 2025).
 * @param {Number} numberOfYears - The total number of academic years to create.
 * @param {String} userId - The ID of the user performing the action.
 * @param {String} username - The username of the user performing the action.
 * @returns {Promise<Object>} An object containing 'createdYears' (array of successful creations) and 'errorsEncountered' (array of errors).
 */
async function createMultipleAcademicYears(startYearInput, numberOfYears, userId, username) {
  const firstYear = parseInt(startYearInput, 10);
  if (isNaN(firstYear) || String(firstYear).length !== 4) {
    throw new Error('Invalid Start Year input. Must be a YYYY number or string.');
  }
  if (typeof numberOfYears !== 'number' || numberOfYears <= 0 || !Number.isInteger(numberOfYears)) {
    throw new Error('Number of years must be a positive integer.');
  }

  // Check for gaps in the existing academic year sequence
  const missingYears = await validateAcademicYearSequence();
  console.log('Missing years in sequence:', missingYears);

  const results = {
    createdYears: [],
    errorsEncountered: []
  };

  // First, fill any gaps in the sequence
  if (missingYears.length > 0) {
    console.log('Filling gaps in academic year sequence...');
    for (const yearToFill of missingYears) {
      // Only fill gaps that are before or equal to the requested start year + numberOfYears
      // This prevents filling future gaps beyond what was requested
      if (yearToFill < firstYear + numberOfYears) {
        const startDateForYear = new Date(Date.UTC(yearToFill, 8, 1)); // Month 8 is September
        
        try {
          const academicYear = await createAcademicYear({ startDate: startDateForYear }, userId, username);
          results.createdYears.push(academicYear);
          console.log(`Filled gap: Created academic year ${yearToFill}/${yearToFill+1}`);
        } catch (error) {
          console.error(`Error filling gap for academic year starting Sept ${yearToFill}:`, error.message);
          results.errorsEncountered.push({ 
            attemptedStartDate: startDateForYear.toISOString().slice(0,10),
            error: error.message 
          });
        }
      }
    }
  }

  // Then create the requested years, skipping any that might overlap with the gaps we just filled
  for (let i = 0; i < numberOfYears; i++) {
    const currentProcessingYear = firstYear + i;
    
    // Skip if this year was already created as part of filling gaps
    if (missingYears.includes(currentProcessingYear)) {
      console.log(`Skipping ${currentProcessingYear} as it was already filled as a gap`);
      continue;
    }
    
    // Construct the startDate as September 1st of the currentProcessingYear
    const startDateForYear = new Date(Date.UTC(currentProcessingYear, 8, 1)); // Month 8 is September

    try {
      // Check if this academic year already exists
      const existingYear = await AcademicYear.findOne({
        startDate: { $gte: new Date(Date.UTC(currentProcessingYear, 8, 1)), $lt: new Date(Date.UTC(currentProcessingYear, 8, 2)) }
      });
      
      if (existingYear) {
        console.log(`Academic year ${currentProcessingYear}/${currentProcessingYear+1} already exists, skipping`);
        continue;
      }
      
      // createAcademicYear expects an object like { startDate: Date, status?: String }
      const academicYear = await createAcademicYear({ startDate: startDateForYear }, userId, username);
      results.createdYears.push(academicYear);
    } catch (error) {
      console.error(`Error creating academic year starting Sept ${currentProcessingYear}:`, error.message);
      results.errorsEncountered.push({ 
        attemptedStartDate: startDateForYear.toISOString().slice(0,10),
        error: error.message 
      });
    }
  }
  
  return results;
}

/**
 * Updates an existing academic year record.
 * @param {String} identifier - The _id or uuid of the academic year to update.
 * @param {Object} updateData - An object containing fields to update (e.g., { startDate, status }).
 * @param {String} userId - The ID of the user performing the action.
 * @param {String} username - The username of the user performing the action.
 * @returns {Promise<Object>} The updated academic year document.
 * @throws {Error} If the academic year is not found, inputs are invalid, or update fails.
 */
async function updateAcademicYear(identifier, updateData, userId, username) {
  let academicYear;
  // Check if the identifier is a valid MongoDB ObjectId string
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    try {
      academicYear = await AcademicYear.findById(identifier).exec();
    } catch (e) {
      // If findById throws an error (e.g. cast error for a malformed ID string that somehow passed isValid),
      // treat as not found and allow fallback to UUID search.
      console.error('Error during findById, will attempt findOne by UUID:', e.message);
      academicYear = null; 
    }
  }
  
  // If not found by _id (or if identifier wasn't a valid ObjectId or findById failed), try finding by UUID

  if (!academicYear) {
    throw new Error('Academic Year not found with the provided identifier.');
  }

  const originalAcademicYearObject = academicYear.toObject({ virtuals: false }); // For audit logging old values
  const auditChanges = [];
  let hasChanges = false;

  // Process startDate update
  if (updateData.hasOwnProperty('startDate')) {
    throw new Error('Start Date cannot be modified after creation.'); 
    // This is intentionally not allowing startDate to be modified since it affects the year name and code.
    // For the rare case it's needed, we might want a separate function to handle the side effects.
    // The existing process for creating new academic years should be sufficient.
  }

  // Process academicBreaks update
  if (updateData.hasOwnProperty('academicBreaks')) {
    const newAcademicBreaks = updateData.academicBreaks;
    if (!Array.isArray(newAcademicBreaks)) {
      throw new Error('Invalid academicBreaks value. Must be an array.');
    }
    
    // Validate each break in the array
    for (const breakItem of newAcademicBreaks) {
      if (!breakItem.startDate || !breakItem.endDate) {
        throw new Error('Each academic break must have startDate and endDate.');
      }
      
      const startDate = new Date(breakItem.startDate);
      const endDate = new Date(breakItem.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format for academic break dates.');
      }
      
      if (startDate >= endDate) {
        throw new Error('Break end date must be after start date.');
      }
    }
    
    // Compare with existing academic breaks to detect changes
    const oldBreaksJson = JSON.stringify(academicYear.academicBreaks || []);
    const newBreaksJson = JSON.stringify(newAcademicBreaks);
    
    if (oldBreaksJson !== newBreaksJson) {
      auditChanges.push({
        field: 'academicBreaks',
        oldValue: academicYear.academicBreaks || [],
        newValue: newAcademicBreaks
      });
      academicYear.academicBreaks = newAcademicBreaks;
      hasChanges = true;
    }
  }

  // Process status update
  if (updateData.hasOwnProperty('status')) {
    const newStatus = updateData.status;
    const allowedStatuses = AcademicYear.schema.path('status').enumValues;
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(`Invalid status value: '${newStatus}'. Allowed statuses are: ${allowedStatuses.join(', ')}.`);
    }
    
    // Track if this is a status change to 'Current' or 'Next' that should trigger release generation
    let statusChangeTriggersReleases = false;
    const oldStatus = academicYear.status;
    
    if (academicYear.status !== newStatus) {
      // Check if this status change should trigger release generation
      if ((newStatus === 'Current' || newStatus === 'Next') && 
          (oldStatus !== 'Current' && oldStatus !== 'Next')) {
        statusChangeTriggersReleases = true;
      }
      
      auditChanges.push({ field: 'status', oldValue: academicYear.status, newValue: newStatus });
      academicYear.status = newStatus;
      hasChanges = true;
      
      // Store that we need to trigger release generation after saving
      academicYear._triggerReleaseGeneration = statusChangeTriggersReleases;
    }
  }

  if (!hasChanges && Object.keys(updateData).length > 0) {
    // Input was provided, but it resulted in no effective change to the data.
    // Depending on desired behavior, could return the original object, or a specific message.
    // For now, we'll proceed to save if there were any inputs, Mongoose might have other hooks/validation.
    // If auditChanges is empty, it means no tracked fields were altered.
  }
  
  if (auditChanges.length === 0 && Object.keys(updateData).length > 0 && !hasChanges) {
    // This case means updateData was provided but didn't change any of the tracked fields
    // (e.g. providing the same startDate or status). We can return the document as is.
    return academicYear;
  }
  
  if (auditChanges.length > 0) { // Only add audit log and save if there were actual changes to audited fields
    academicYear.addToAuditLog(userId, username, 'Academic Year Updated', auditChanges);
    
    // Track if we need to trigger release generation (set by the status change handler)
    const needsReleaseGeneration = academicYear._triggerReleaseGeneration;
    
    try {
      await academicYear.save();
      
      // If status changed to 'Current' or 'Next', trigger release generation
      if (needsReleaseGeneration) {
        try {
          console.log(`Academic year ${academicYear.name} status changed to ${academicYear.status}. Triggering release generation.`);
          const releaseGeneration = await releaseService.generateReleasesForRelevantAcademicYears(userId, username);
          console.log('Release generation completed:', releaseGeneration);
          
          // Add information about release generation to the returned object
          // Don't modify the actual MongoDB document
          const result = academicYear.toObject();
          result.releasesGenerated = true;
          return result;
        } catch (releaseError) {
          // Log error but don't fail the overall update
          console.error('Error generating releases after academic year status change:', releaseError);
        }
      }
      
      return academicYear;
    } catch (error) {
      console.error('Error updating academic year:', error);
      if (error.code === 11000) { // MongoDB duplicate key error
        const field = Object.keys(error.keyValue)[0];
        throw new Error(`Failed to update academic year: A record with ${field} '${error.keyValue[field]}' already exists.`);
      }
      if (error.name === 'ValidationError') {
        throw new Error(`Validation failed: ${error.message}`);
      }
      throw new Error(`Failed to update academic year: ${error.message}`);
    }
  } else {
    // No auditable changes were made, and no updateData was provided, or updateData didn't lead to changes.
    return academicYear; // Return the original document as no update was performed.
  }
}

async function getAcademicYearByIdentifier(identifier) {
  let academicYear;
  // Check if the identifier is a valid MongoDB ObjectId string
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    try {
      academicYear = await AcademicYear.findById(identifier).exec();
    } catch (e) {
      // If findById throws an error (e.g. cast error for a malformed ID string that somehow passed isValid),
      // treat as not found and allow fallback to UUID search.
      console.error('Error during findById in getAcademicYearByIdentifier, will attempt findOne by UUID:', e.message);
      academicYear = null; 
    }
  }
  
  // If not found by _id (or if identifier wasn't a valid ObjectId or findById failed), try finding by UUID
  if (!academicYear) {
    academicYear = await AcademicYear.findOne({ uuid: identifier }).exec();
  }

  return academicYear; // Will be null if not found by either method
}

async function listAcademicYears(options = {}) {
  const { page = 1, limit = 10, status, sortBy = 'startDate', sortOrder = 'asc' } = options;

  const query = {};
  if (status) {
    query.status = status;
  }

  const sort = {};
  if (sortBy) {
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  }

  try {
    const academicYears = await AcademicYear.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10))
      .exec();

    const totalRecords = await AcademicYear.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      academicYears,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages,
        totalRecords,
        pageSize: parseInt(limit, 10),
      },
    };
  } catch (error) {
    console.error('Error listing academic years:', error);
    throw new Error('Failed to retrieve academic years.');
  }
}

/**
 * Updates the status ('Future', 'Current', 'Past') of all academic years based on the current date.
 * This function is intended to be run periodically or on-demand to ensure data integrity.
 * When an academic year's status changes to 'Current' or 'Next', this will trigger
 * automatic generation of release entries for the current and next three years.
 * @param {String} [userId='system'] - The ID of the user/process performing the action.
 * @param {String} [username='system_update'] - The username of the user/process.
 * @returns {Promise<Object>} An object summarizing the operation, e.g., { checked: 5, updated: 2, releasesGenerated: true }.
 * @throws {Error} If there's an issue fetching or updating records.
 */
async function updateAcademicYearStatuses(userId = 'system', username = 'system_update') {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Normalize current date to UTC midnight for comparison

  let checkedCount = 0;
  let updatedCount = 0;
  let statusChanges = [];
  let releaseGenerationTriggered = false;

  try {
    const academicYears = await AcademicYear.find({});
    checkedCount = academicYears.length;

    for (const year of academicYears) {
      const startDate = new Date(year.startDate);
      startDate.setUTCHours(0, 0, 0, 0);

      const endDate = new Date(year.endDate);
      endDate.setUTCHours(0, 0, 0, 0);

      let newStatus = year.status;

      if (today < startDate) {
        newStatus = 'Future';
      } else if (today >= startDate && today <= endDate) {
        newStatus = 'Current';
      } else if (today > endDate) {
        newStatus = 'Past';
      }

      if (year.status !== newStatus) {
        // Store the status change for later evaluation
        statusChanges.push({
          year,
          oldStatus: year.status,
          newStatus
        });

        // Update the year status
        const oldStatus = year.status;
        year.status = newStatus;
        year.addToAuditLog(userId, username, 'Status Automatically Updated', [
          { field: 'status', oldValue: oldStatus, newValue: newStatus }
        ]);
        await year.save();
        updatedCount++;
      }
    }

    // Check if any status changes warrant release generation
    // This happens when a year becomes 'Current' or 'Next'
    const triggeringChanges = statusChanges.filter(change => 
      change.newStatus === 'Current' || change.newStatus === 'Next'
    );

    // If we have triggering status changes, generate releases for current + next 3 years
    if (triggeringChanges.length > 0) {
      console.log('Academic year status changes detected that require release generation.');
      
      // Trigger release generation for current + next 3 academic years
      try {
        const releaseGeneration = await releaseService.generateReleasesForRelevantAcademicYears(userId, username);
        releaseGenerationTriggered = true;
        console.log('Release generation completed successfully:', releaseGeneration);
      } catch (releaseError) {
        console.error('Error during automatic release generation:', releaseError);
        // We don't want to fail the whole status update if just release generation fails
        // So we log the error but don't throw it
      }
    }

    console.log(`Academic year statuses checked: ${checkedCount}, updated: ${updatedCount}`);
    return { 
      checked: checkedCount, 
      updated: updatedCount,
      releasesGenerated: releaseGenerationTriggered
    };

  } catch (error) {
    console.error('Error updating academic year statuses:', error);
    throw new Error(`Failed to update academic year statuses: ${error.message}`);
  }
}

/**
 * Determines the correct start year for the next academic year to be created.
 * This follows the business rule that academic years run from Sept 1 to Aug 31.
 * @returns {Promise<Number>} The year in which the next academic year should start.
 */
async function getNextAcademicYearStart() {
  // Check for gaps in the sequence first
  const missingYears = await validateAcademicYearSequence();
  
  if (missingYears.length > 0) {
    // If there are gaps, the next year to create should be the earliest gap
    console.log(`Next academic year should fill gap: ${missingYears[0]}/${missingYears[0] + 1}`);
    return missingYears[0];
  }
  
  // If no gaps, find the latest academic year
  const latestAcademicYear = await AcademicYear.findOne().sort({ endDate: -1 }).lean();
  
  if (latestAcademicYear && latestAcademicYear.endDate) {
    // The next academic year starts in September of the same year the previous one ends
    // For example, if latest ends Aug 31, 2032, next starts Sept 1, 2032
    const nextStartYear = latestAcademicYear.endDate.getUTCFullYear();
    console.log(`Next academic year after ${latestAcademicYear.name}: ${nextStartYear}/${nextStartYear + 1}`);
    return nextStartYear;
  }
  
  // If no academic years exist, start from current year
  const currentYear = new Date().getUTCFullYear();
  console.log(`No existing academic years, starting with current year: ${currentYear}/${currentYear + 1}`);
  return currentYear;
}

module.exports = {
  createAcademicYear,
  listAcademicYears,
  getAcademicYearByIdentifier,
  parseStartDate, // Exporting for potential use in controller or tests
  createMultipleAcademicYears,
  updateAcademicYear,
  updateAcademicYearStatuses,
  validateAcademicYearSequence, // Export the sequence validation function
  getNextAcademicYearStart // Export the function to determine next academic year start
};
