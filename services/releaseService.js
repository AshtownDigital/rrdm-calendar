const Release = require('../models/Release');
const AcademicYear = require('../models/AcademicYear'); // Needed for context, e.g., when generating releases
const { addWeeks, isWithinInterval, format } = require('date-fns'); // For date calculations

/**
 * @description Create a new release
 * @param {Object} releaseData - Data for the new release
 * @returns {Promise<Object>} The created release document
 */
async function createRelease(releaseData) {
  try {
    const release = new Release(releaseData);
    await release.save();
    return release;
  } catch (error) {
    console.error('Error creating release:', error);
    throw error;
  }
}

/**
 * @description Get a release by its ID
 * @param {String} releaseId - The ID of the release
 * @returns {Promise<Object|null>} The release document or null if not found
 */
async function getReleaseById(releaseId) {
  try {
    console.log(`Fetching release with ID: ${releaseId}`);
    // Use the current schema field names
    const release = await Release.findById(releaseId);
    
    if (!release) {
      console.log(`No release found with ID: ${releaseId}`);
      return null;
    }
    
    console.log(`Found release: ${release.ReleaseCode}`);
    return release;
  } catch (error) {
    console.error(`Error fetching release with ID ${releaseId}:`, error);
    throw error;
  }
}

/**
 * @description Get all releases, with filtering, sorting, and pagination
 * @param {Object} filterOptions - Options for filtering, pagination, sorting
 * @param {Object} [filterOptions.filter={}] - Mongoose query filter object
 * @param {Object} [filterOptions.sort={releaseDate: -1}] - Mongoose sort object
 * @param {number} [filterOptions.page=1] - Current page number
 * @param {number} [filterOptions.limit=10] - Number of items per page
 * @returns {Promise<Object>} An object containing releases array and pagination info
 */
async function getAllReleases(filterOptions = {}) {
  try {
    console.log('Getting releases with filter options:', JSON.stringify(filterOptions, null, 2));
    const page = parseInt(filterOptions.page, 10) || 1;
    const limit = parseInt(filterOptions.limit, 10) || 10; // Default limit 10
    const skip = (page - 1) * limit;
    const filter = filterOptions.filter || {};
    
    // Update default sort field to match the model field name
    const sort = filterOptions.sort || { GoLiveDate: -1 }; // Default sort by GoLiveDate descending
    
    console.log('Filter:', JSON.stringify(filter));
    console.log('Sort:', JSON.stringify(sort));

    const releases = await Release.find(filter)
      .populate('AcademicYearID', 'name') // Populate academic year name
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // Use .lean() for better performance as we are only reading data
      
    console.log(`Found ${releases.length} releases`);
    if (releases.length > 0) {
      console.log('Sample release:', JSON.stringify(releases[0], null, 2));
    }

    const totalItems = await Release.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      releases,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        limit: limit,
        totalItems: totalItems,
      },
    };
  } catch (error) {
    console.error('Error fetching all releases with pagination:', error);
    throw error;
  }
}

/**
 * @description Update an existing release
 * @param {String} releaseId - The ID of the release to update
 * @param {Object} updateData - Data to update the release with
 * @returns {Promise<Object|null>} The updated release document or null if not found
 */
async function updateRelease(releaseId, updateData) {
  try {
    // Ensure updatedAt is handled by middleware or set manually if needed
    updateData.updatedAt = new Date();
    const release = await Release.findByIdAndUpdate(releaseId, updateData, { new: true, runValidators: true })
      .populate('academicYear').populate('createdBy').populate('updatedBy');
    return release;
  } catch (error) {
    console.error(`Error updating release with ID ${releaseId}:`, error);
    throw error;
  }
}

/**
 * @description Delete a release by its ID
 * @param {String} releaseId - The ID of the release to delete
 * @returns {Promise<Object|null>} The deleted release document or null if not found
 */
async function deleteRelease(releaseId) {
  try {
    const release = await Release.findByIdAndDelete(releaseId);
    return release;
  } catch (error)
{ // Typo: extra brace, should be removed
    console.error(`Error deleting release with ID ${releaseId}:`, error);
    throw error;
  }
}

/**
 * @description Automatically generate standard releases for a given academic year
 * @param {String|Object} academicYearIdOrDoc - The ID of the academic year or the academic year document
 * @param {String} userId - The ID of the user performing the action (for audit fields)
 * @param {String} username - The username of the user performing the action (for logs)
 * @returns {Promise<Array<Object>>} An array of created release documents
 */
async function generateStandardReleasesForAcademicYear(academicYearIdOrDoc, userId, username = 'system', forceRegenerate = false) {
  try {
    console.log(`Initial academicYearIdOrDoc:`, academicYearIdOrDoc, `(type: ${typeof academicYearIdOrDoc}), UserID: ${userId}`);
    const STANDARD_LEAD_TIME_DAYS = 14;
    const mongoose = require('mongoose'); // Ensure mongoose is available

    const validUserId = mongoose.Types.ObjectId.isValid(userId) 
      ? userId 
      : new mongoose.Types.ObjectId(); // Fallback if userId is not a valid ObjectId string
    console.log(`Using effective user ID: ${validUserId}`);

    let resolvedAcademicYearDoc;

    if (academicYearIdOrDoc && typeof academicYearIdOrDoc === 'object' && academicYearIdOrDoc.startDate && academicYearIdOrDoc.endDate) {
      // Input is already a populated document-like object
      console.log('academicYearIdOrDoc is a populated document, using directly.');
      resolvedAcademicYearDoc = academicYearIdOrDoc;
    } else {
      // Input is an ID string, an ObjectId instance, or a partial/unpopulated document. Needs fetching.
      let idToFetch = null;
      if (typeof academicYearIdOrDoc === 'string') {
        if (mongoose.Types.ObjectId.isValid(academicYearIdOrDoc)) {
          idToFetch = academicYearIdOrDoc;
        } else {
          console.error('Invalid string ID for academicYearIdOrDoc:', academicYearIdOrDoc);
          throw new Error('Invalid string format for Academic Year ID.');
        }
      } else if (academicYearIdOrDoc && typeof academicYearIdOrDoc === 'object') {
        // Could be ObjectId instance or a Mongoose document shell
        // ObjectId.toString() gives the hex string. Mongoose doc._id.toString() also works.
        const potentialId = academicYearIdOrDoc._id ? academicYearIdOrDoc._id.toString() : academicYearIdOrDoc.toString();
        if (mongoose.Types.ObjectId.isValid(potentialId)) {
          idToFetch = potentialId;
        } else {
          console.error('academicYearIdOrDoc is an object, but cannot determine a valid ID:', JSON.stringify(academicYearIdOrDoc));
          throw new Error('Cannot determine a valid ID from the provided academic year object.');
        }
      } else {
        console.error('Invalid type or value for academicYearIdOrDoc:', academicYearIdOrDoc);
        throw new Error('Invalid type or value for academic year identifier.');
      }

      if (!idToFetch) {
         console.error('Failed to derive a valid ID for fetching academic year from:', academicYearIdOrDoc);
         throw new Error('Could not derive a valid ID to fetch academic year.');
      }
      
      console.log(`Attempting to fetch academic year with ID: ${idToFetch}`);
      resolvedAcademicYearDoc = await AcademicYear.findById(idToFetch).lean();
      
      if (!resolvedAcademicYearDoc) {
        throw new Error(`Academic year with ID ${idToFetch} not found.`);
      }
      console.log('Fetched academic year document successfully:', JSON.stringify(resolvedAcademicYearDoc, null, 2));
    }
    
    // Validate the resolved academic year document
    if (!resolvedAcademicYearDoc || !resolvedAcademicYearDoc.startDate || !resolvedAcademicYearDoc.endDate) {
      console.error('Validation failed: Resolved academic year is missing required date fields or is invalid.', JSON.stringify(resolvedAcademicYearDoc, null, 2));
      throw new Error('Resolved academic year is missing required date fields or is invalid.');
    }
    
    // Use 'academicYear' for consistency with the rest of the function
    const academicYear = resolvedAcademicYearDoc;
    console.log(`Successfully processed academic year: ${academicYear.name}, Code: ${academicYear.code}`);
    console.log(`Academic year dates: Start=${academicYear.startDate}, End=${academicYear.endDate}`);

    if (forceRegenerate) {
      console.log(`Force regenerate enabled for ${academicYear.name}. Deleting existing 'AcademicYearBaseline' and 'InYearPeriod' releases.`);
      await Release.deleteMany({
        AcademicYearID: academicYear._id,
        ReleaseType: { $in: ['AcademicYearBaseline', 'InYearPeriod'] }
      });
      console.log(`Deleted existing standard releases for ${academicYear.name}.`);
    }
    
    // Format academic year for naming and coding
    const academicYearName = academicYear.name || 'Unknown';
    const yearCode = academicYear.code ? academicYear.code.replace('AY', '') : academicYearName;

    // Check if a baseline release already exists for this academic year to avoid duplicates
    const existingBaseline = await Release.findOne({
      AcademicYearID: academicYear._id,
      ReleaseType: 'AcademicYearBaseline'
    }).lean();

    if (existingBaseline) {
      console.log(`Baseline release already exists for academic year ${academicYear.name}, skipping generation.`);
      // We could return existing releases here or continue with generating only new in-year releases
    }
    
    // Get the highest record number across all releases to ensure unique incremental RecordNumber
    const lastRelease = await Release.findOne().sort({ RecordNumber: -1 }).lean();
    let nextRecordNumber = lastRelease ? lastRelease.RecordNumber + 1 : 1;
    
    // Prepare data that will be the basis for all auto-generated releases
    const releaseData = [];
    
    // Create a baseline release if it doesn't exist yet
    if (!existingBaseline) {
      console.log(`Creating baseline release for academic year ${academicYearName}`);
      // Calculate baseline dates (go-live date is academic year start, freeze date is 14 days before)
      const baselineGoLiveDate = new Date(academicYear.startDate);
      // Ensure the date is valid
      if (isNaN(baselineGoLiveDate.getTime())) {
        console.error(`Invalid academic year start date: ${academicYear.startDate}`);
        throw new Error('Invalid academic year start date');
      }
      
      const baselineCutoffDate = new Date(baselineGoLiveDate);
      baselineCutoffDate.setDate(baselineCutoffDate.getDate() - STANDARD_LEAD_TIME_DAYS);
      
      // Format the academic year for release code (e.g., "22/23" from 2022/2023)
      const yearStart = baselineGoLiveDate.getFullYear();
      const yearCode = `${String(yearStart).slice(-2)}/${String(yearStart + 1).slice(-2)}`;
      
      // Make sure we have a valid record number
      const recordNumberResult = await Release.find().sort({RecordNumber: -1}).limit(1);
      const lastRecordNumber = recordNumberResult.length > 0 ? recordNumberResult[0].RecordNumber : 0;
      const newRecordNumber = lastRecordNumber + 1;
      
      console.log(`Creating baseline release with RecordNumber: ${newRecordNumber}`);
      
      // Add to release data for later saving
      releaseData.push({
        RecordNumber: newRecordNumber,
        AcademicYearID: academicYear._id,
        AcademicYearName: academicYearName,
        ReleaseCode: `${yearCode}-001-BS`, // BS for Baseline
        ReleaseType: 'AcademicYearBaseline',
        ReleaseNameDetails: `AY ${academicYearName} - Baseline`,
        Status: 'Planned',
        GoLiveDate: baselineGoLiveDate,
        StartDate: baselineGoLiveDate, // Same as GoLiveDate
        EndDate: baselineGoLiveDate, // Same as GoLiveDate
        FreezeCutOffDate: baselineCutoffDate,
        CreatedByUserID: validUserId,
        LastModifiedByUserID: validUserId,
        // Add any other required fields from the model
        ResponsibleTeamLead: '',
        ImpactAssessment: '',
        CommunicationSent: false,
        CommunicationLink: '',
        RelatedDocumentationLinks: [],
        Notes: 'Baseline release',
        IsArchived: false
      });
    }
    
    // Check for existing in-year releases for this academic year to avoid duplicates
    const existingReleases = await Release.find({
      AcademicYearID: academicYear._id,
      ReleaseType: 'InYearPeriod'
    }).lean();

    // Existing release go-live dates for checking duplicates
    const existingGoLiveDates = existingReleases.map(release => {
      const date = new Date(release.GoLiveDate);
      return date.toISOString().split('T')[0]; // Store as YYYY-MM-DD for comparison
    });
    
    // Find the first Monday after the baseline go-live date (Sept 1st) for bi-weekly scheduling
    // Start in-year releases 2 weeks after the academic year start date
    let currentDate = new Date(academicYear.startDate);
    currentDate.setDate(currentDate.getDate() + 14); // Add 2 weeks

    // Then, find the first Monday on or after this new date
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToAdd = (dayOfWeek <= 1) ? (1 - dayOfWeek) : (8 - dayOfWeek); // Calculate days to next Monday
    currentDate.setDate(currentDate.getDate() + daysToAdd);
    
    // Generate bi-weekly in-year releases until the end of the academic year
    let periodCounter = 1;
    let sequenceCounter = 1; // Starts from 1 (001) for in-year releases after baseline (which is 001-BS)

    while (currentDate <= academicYear.endDate) {
      // Check if the current date falls within any academic break period
      const isInBreakPeriod = academicYear.academicBreaks && academicYear.academicBreaks.some(breakPeriod => {
        return isWithinInterval(currentDate, {
          start: new Date(breakPeriod.startDate),
          end: new Date(breakPeriod.endDate)
        });
      });

      // Skip this release if it falls within a break period
      if (!isInBreakPeriod) {
        // Check if we already have a release with this go-live date
        const dateString = currentDate.toISOString().split('T')[0];
        if (!existingGoLiveDates.includes(dateString)) {
          // Create new dates to avoid reference issues
          const goLiveDate = new Date(currentDate);
          // Ensure the date is valid
          if (isNaN(goLiveDate.getTime())) {
            console.error(`Skipping invalid date: ${currentDate}`);
            continue; // Skip this iteration if date is invalid
          }
          
          const startDate = new Date(goLiveDate);
          const endDate = new Date(goLiveDate);
          
          // Calculate cutoff date (ensuring it's a valid date)
          const cutoffDate = new Date(goLiveDate);
          cutoffDate.setDate(cutoffDate.getDate() - STANDARD_LEAD_TIME_DAYS);
          
          // Verify cutoff date is valid
          if (isNaN(cutoffDate.getTime())) {
            console.error(`Invalid cutoff date calculated for ${goLiveDate}`);
            continue; // Skip this iteration if cutoff date is invalid
          }

          // Format sequence number with padding (e.g., 002, 003)
          const sequenceFormatted = String(sequenceCounter + 1).padStart(3, '0');
          
          // Make sure we have a valid record number for each release
          const recordNumberResult = await Release.find().sort({RecordNumber: -1}).limit(1);
          const lastRecordNumber = recordNumberResult.length > 0 ? recordNumberResult[0].RecordNumber : 0;
          const newRecordNumber = lastRecordNumber + 1 + releaseData.length;
          
          console.log(`Creating in-year release for period ${periodCounter} with record number ${newRecordNumber}`);
          
          releaseData.push({
            RecordNumber: newRecordNumber,
            AcademicYearID: academicYear._id,
            AcademicYearName: academicYearName,
            ReleaseCode: `${yearCode}-${sequenceFormatted}-IY`, // IY for In-Year
            ReleaseType: 'InYearPeriod',
            ReleaseNameDetails: `AY ${academicYearName} - Release Period ${periodCounter}`,
            Status: 'Planned',
            GoLiveDate: goLiveDate,
            StartDate: startDate,
            EndDate: endDate,
            FreezeCutOffDate: cutoffDate,
            CreatedByUserID: validUserId,
            LastModifiedByUserID: validUserId,
            ResponsibleTeamLead: '',
            ImpactAssessment: '',
            CommunicationSent: false,
            CommunicationLink: '',
            RelatedDocumentationLinks: [],
            Notes: `In-year release for period ${periodCounter}`,
            IsArchived: false
          });
          
          sequenceCounter++;
          periodCounter++;
        }
      }
      
      // Advance to the next bi-weekly date
      currentDate = addWeeks(currentDate, 2);
    }

    // Save all new releases
    const createdReleases = [];
    for (const data of releaseData) {
      const release = new Release(data);
      await release.save();
      createdReleases.push(release);
    }

    console.log(`Generated ${createdReleases.length} releases for academic year ${academicYear.name}.`);
    return createdReleases;
  } catch (error) {
    console.error(`Error generating standard releases for academic year:`, error);
    throw error;
  }
}


/**
 * @description Generate releases for multiple academic years (current + next 3)
 * @param {String} userId - The ID of the user performing the action
 * @param {String} username - The username of the user performing the action
 * @returns {Promise<Object>} Summary of releases generated
 */
async function generateReleasesForRelevantAcademicYears(userId, username = 'system') {
  try {
    // Get current date for comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get all academic years in the system
    const academicYears = await AcademicYear.find().sort({ startDate: 1 }).lean();
    if (!academicYears.length) {
      console.log('No academic years found in the system.');
      return { message: 'No academic years found.', generated: 0 };
    }

    // Filter to current academic year and the next three future years
    let currentYearIndex = -1;
    
    // Find the current academic year (the one that includes today)
    for (let i = 0; i < academicYears.length; i++) {
      const year = academicYears[i];
      if (today >= new Date(year.startDate) && today <= new Date(year.endDate)) {
        currentYearIndex = i;
        break;
      }
    }

    if (currentYearIndex === -1) {
      // If we didn't find a 'current' year, find the next future year
      for (let i = 0; i < academicYears.length; i++) {
        if (today < new Date(academicYears[i].startDate)) {
          currentYearIndex = i - 1; // The previous year would be the 'current equivalent'
          break;
        }
      }
      
      // If still not found, use the last year available
      if (currentYearIndex === -1) {
        currentYearIndex = academicYears.length - 1;
      }
    }

    // Get the current year and next three years (if available)
    const relevantYears = [];
    for (let i = Math.max(0, currentYearIndex); i < Math.min(academicYears.length, currentYearIndex + 4); i++) {
      relevantYears.push(academicYears[i]);
    }

    // Generate releases for each relevant academic year
    const results = [];
    for (const year of relevantYears) {
      console.log(`Generating releases for academic year: ${year.name}`);
      const yearReleases = await generateStandardReleasesForAcademicYear(year, userId, username);
      results.push({
        academicYear: year.name,
        releasesGenerated: yearReleases.length
      });
    }

    return { 
      message: 'Releases generated successfully for relevant academic years.',
      results
    };
  } catch (error) {
    console.error('Error generating releases for relevant academic years:', error);
    throw error;
  }
}

async function checkExistingStandardReleases(academicYearId) {
  try {
    const filter = {
      AcademicYearID: academicYearId,
      ReleaseType: { $in: ['AcademicYearBaseline', 'InYearPeriod'] }
    };
    const existingReleases = await Release.countDocuments(filter);
    return existingReleases > 0;
  } catch (error) {
    console.error(`Error checking existing standard releases for AY ${academicYearId}:`, error);
    throw error; // Re-throw to be handled by the caller
  }
}

/**
 * @description Delete auto-generated releases for specific academic years
 * @param {Array<String>} academicYearIds - Array of academic year IDs to delete releases for
 * @param {String} userId - The ID of the user performing the action
 * @param {String} username - The username of the user performing the action
 * @returns {Promise<Object>} Summary of releases deleted
 */
async function deleteAutoGeneratedReleases(academicYearIds, userId, username = 'system') {
  try {
    if (!academicYearIds || !Array.isArray(academicYearIds) || academicYearIds.length === 0) {
      throw new Error('No academic year IDs provided for deletion');
    }

    console.log(`Deleting auto-generated releases for ${academicYearIds.length} academic years. User: ${username}`);
    
    // Get academic year details for reporting
    const AcademicYear = require('../models/AcademicYear');
    const academicYears = await AcademicYear.find({ _id: { $in: academicYearIds } }).lean();
    
    const academicYearNames = academicYears.map(year => year.name);
    console.log(`Academic years selected for deletion: ${academicYearNames.join(', ')}`);
    
    // Count releases before deletion for reporting
    const countBeforeDeletion = await Release.countDocuments({
      AcademicYearID: { $in: academicYearIds },
      ReleaseType: { $in: ['AcademicYearBaseline', 'InYearPeriod'] }
    });
    
    // Delete auto-generated releases for the specified academic years
    const result = await Release.deleteMany({
      AcademicYearID: { $in: academicYearIds },
      ReleaseType: { $in: ['AcademicYearBaseline', 'InYearPeriod'] }
    });
    
    console.log(`Deleted ${result.deletedCount} auto-generated releases for academic years: ${academicYearNames.join(', ')}`);
    
    // Create a summary for each academic year
    const deletionSummary = academicYears.map(year => ({
      academicYearId: year._id,
      academicYearName: year.name,
      releasesDeleted: result.deletedCount // This is the total count, we don't have per-year counts
    }));
    
    return {
      message: `Successfully deleted ${result.deletedCount} auto-generated releases for ${academicYearIds.length} academic years.`,
      totalDeleted: result.deletedCount,
      academicYears: deletionSummary
    };
  } catch (error) {
    console.error('Error deleting auto-generated releases:', error);
    throw error;
  }
}

module.exports = {
  createRelease,
  getReleaseById,
  getAllReleases,
  updateRelease,
  deleteRelease,
  generateStandardReleasesForAcademicYear,
  generateReleasesForRelevantAcademicYears,
  checkExistingStandardReleases,
  deleteAutoGeneratedReleases
};
