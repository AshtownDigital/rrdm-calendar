const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const releaseService = require('../services/releaseService'); // For Release Diary views
const releaseDiaryController = require('../controllers/releaseDiaryController');
const academicYearService = require('../services/academicYearService'); // For API calls
const debugController = require('../controllers/debugController'); // For debugging and diagnostics
const AcademicYear = require('../models/academicYear'); // For direct DB queries in view routes if needed
const { csrfProtection, enhancedCsrfProtection } = require('../middleware/csrf'); // Import CSRF protection middleware

// Apply CSRF protection to all POST requests handled by this router
// For GET requests that render forms needing CSRF, ensure token is passed to template
// Middleware to make flash messages and user info available to all views in this router
// CSRF token is now handled globally in server.js
router.use((req, res, next) => {
  // If auth middleware is missing, req.isAuthenticated might not exist or always be false
  res.locals.isAuthenticated = req.isAuthenticated ? req.isAuthenticated() : false; 
  res.locals.user = req.user || null; // req.user would be set by auth middleware
  res.locals.flashMessages = req.flash(); // Make flash messages available to all templates
  next();
});

// Home page
router.get('/', (req, res) => {
  res.render('modules/home/index', {
    pageTitle: 'Home - RRDM',
  });
});

// --- Release Diary Route ---
router.get('/release-diary', releaseDiaryController.renderReleaseDiaryPage);

// --- Release Notes Route ---
router.get('/release-notes', (req, res) => {
  // This is a temporary route handler until the full release notes functionality is implemented
  res.render('modules/release-notes/index', {
    pageTitle: 'Release Notes - RRDM',
    releases: [] // Placeholder for actual release notes data
  });
});

// Dashboard
// router.get('/dashboard', isAuthenticated, (req, res) => { // isAuthenticated temporarily removed
router.get('/dashboard', (req, res) => {
  res.render('modules/dashboard/dashboard', {
    pageTitle: 'Dashboard - RRDM',
  });
});

// Academic Years List Page
// router.get('/academic-years', isAuthenticated, async (req, res) => { // isAuthenticated temporarily removed
router.get('/academic-years', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sortBy = 'startDate', 
      sortOrder = 'asc' 
    } = req.query;

    const queryParams = { page, limit, status, sortBy, sortOrder };
    const data = await academicYearService.listAcademicYears(queryParams);

    // Calculate the next potential start year for a new academic year
    const nextPotentialStartYear = await academicYearService.getNextAcademicYearStart();

    // Get the current academic year for the banner
    let currentAcademicYearForBanner = null;
    let nextAcademicYear = null;
    const today = new Date();

    // Handle differently based on environment
    if (process.env.NODE_ENV === 'test') {
      console.log('Using 10 mock academic years for banner display');
      // Get mock data for test mode
      const mockYears = academicYearService.getMockAcademicYears();
      
      if (mockYears && mockYears.length > 0) {
        // Find current academic year (with status 'Current')
        currentAcademicYearForBanner = mockYears.find(year => year.status === 'Current');
        
        // Find next academic year (with status 'Next')
        nextAcademicYear = mockYears.find(year => year.status === 'Next');
        
        // If no 'Next' status found, find the first future year after current
        if (!nextAcademicYear && currentAcademicYearForBanner) {
          const currentEndDate = new Date(currentAcademicYearForBanner.endDate);
          nextAcademicYear = mockYears.find(year => {
            const startDate = new Date(year.startDate);
            return startDate > currentEndDate;
          });
        }
      }
    } else {
      // Production mode - use database queries
      currentAcademicYearForBanner = await AcademicYear.findOne({
        startDate: { $lte: today },
        endDate: { $gte: today }
      }).lean();
      
      // Find the next academic year (the one immediately following the current one)
      if (currentAcademicYearForBanner && currentAcademicYearForBanner.endDate) {
        nextAcademicYear = await AcademicYear.findOne({
          startDate: { $gt: currentAcademicYearForBanner.endDate }
        }).sort({ startDate: 1 }).lean();
        
        if (nextAcademicYear) {
          console.log(`Next academic year identified: ${nextAcademicYear.fullName}`);
        }
      }
    }
    
    // Calculate days remaining in the current academic year if it exists
    let daysRemaining = null;
    if (currentAcademicYearForBanner && currentAcademicYearForBanner.endDate) {
      const endDate = new Date(currentAcademicYearForBanner.endDate);
      const timeDiff = endDate.getTime() - today.getTime();
      daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      console.log(`Days remaining in current academic year: ${daysRemaining}`);
    }

    res.render('academic-years/list', {
      pageTitle: 'Academic Years - RRDM',
      academicYears: data.academicYears,
      pagination: data.pagination,
      currentSort: { sortBy, sortOrder },
      currentFilters: { status },
      queryParams: req.query,
      nextPotentialStartYear,
      currentAcademicYearForBanner,
      nextAcademicYear,
      daysRemaining,
    });
  } catch (error) {
    console.error('Error fetching academic years for view:', error);
    // Instead of redirecting, render the academic years page with an error message
    res.render('academic-years/list', {
      pageTitle: 'Academic Years - RRDM',
      academicYears: [],
      pagination: { page: 1, limit: 10, totalPages: 0, totalItems: 0 },
      currentSort: { sortBy: 'startDate', sortOrder: 'asc' },
      currentFilters: { status: null },
      queryParams: req.query,
      nextPotentialStartYear: null,
      currentAcademicYearForBanner: null,
      nextAcademicYear: null,
      daysRemaining: null,
      error: 'Failed to load academic years: ' + error.message
    });
  }
});

// Academic Year - New Form
// router.get('/academic-years/new', isAuthenticated, isSysAdmin, (req, res) => { // isAuthenticated, isSysAdmin temporarily removed
router.get('/academic-years/new', (req, res) => {
  res.render('academic-years/new', {
    pageTitle: 'New Academic Year - RRDM',
    formData: {},
    errors: {},
  });
});

// Academic Year - Edit Form
// router.get('/academic-years/:identifier/edit', isAuthenticated, isSysAdmin, async (req, res) => { // isAuthenticated, isSysAdmin temporarily removed
router.get('/academic-years/:identifier/edit', async (req, res) => {
  try {
    const { identifier } = req.params;
    const academicYear = await academicYearService.getAcademicYearByIdentifier(identifier);
    if (!academicYear) {
      req.flash('error', 'Academic Year not found.');
      return res.redirect('/academic-years');
    }
    const formattedStartDate = academicYear.startDate.toISOString().split('T')[0];

    res.render('academic-years/edit', {
      pageTitle: 'Edit Academic Year - RRDM',
      formData: { ...academicYear, startDate: formattedStartDate },
      errors: {},
    });
  } catch (error) {
    console.error('Error fetching academic year for edit:', error);
    req.flash('error', 'Failed to load academic year for editing. ' + error.message);
    res.redirect('/academic-years');
  }
});

// NEW ROUTE: Academic Years - Bulk Generate Warning Page
// router.get('/academic-years/bulk-generate-warning', isAuthenticated, isSysAdmin, async (req, res) => { // isAuthenticated, isSysAdmin temporarily removed
router.get('/academic-years/bulk-generate-warning', async (req, res) => {
  try {
    const numberOfYears = parseInt(req.query.numberOfYears, 10);

    if (isNaN(numberOfYears) || numberOfYears <= 0 || numberOfYears > 10) {
      req.flash('error', 'Invalid number of years specified for bulk generation.');
      return res.redirect('/academic-years');
    }

    // Use our new helper function to correctly determine the next academic year to be created
    const nextPotentialStartYear = await academicYearService.getNextAcademicYearStart();

    res.render('academic-years/bulk-warning', {
      pageTitle: 'Confirm Bulk Generation - RRDM',
      numberOfYears: numberOfYears,
      nextPotentialStartYear: nextPotentialStartYear,
    });
  } catch (error) {
    console.error('Error preparing bulk generate warning page:', error);
    req.flash('error', 'An error occurred while preparing the bulk generation confirmation. ' + error.message);
    res.redirect('/academic-years');
  }
});

// IMPORTANT: Release Management Module - Main Entry Point
// This route handles the main release management listing page
// router.get('/releases', isAuthenticated, async (req, res) => { // isAuthenticated temporarily removed
router.get('/release-management', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      releaseType,
      academicYearId,
      sortBy = 'GoLiveDate', 
      sortOrder = 'asc' 
    } = req.query;

    console.log('Release list view query params:', req.query);
    
    // Build filter object based on query parameters
    const filter = {};
    
    // Filter by status if provided
    if (status) {
      filter.Status = status;
    }
    
    // Filter by release type if provided
    if (releaseType) {
      filter.ReleaseType = releaseType;
    }
    
    // Filter by academic year if provided
    if (academicYearId) {
      filter.AcademicYearID = academicYearId;
    }
    
    const filterOptions = {
      page,
      limit,
      sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
      filter: filter
    };
    
    // releaseService is imported at the top of the file
    const result = await releaseService.getAllReleases(filterOptions);
    
    console.log(`Found ${result.releases ? result.releases.length : 0} releases`);
    console.log('Pagination:', JSON.stringify(result.pagination));
    
    // Check if we need to trigger release generation
    if (!result.releases || result.releases.length === 0) {
      console.log('No releases found - checking if we need to generate releases...');
      
      // Get the latest academic year
      const academicYearData = await academicYearService.listAcademicYears({ 
        limit: 1, 
        sortBy: 'startDate', 
        sortOrder: 'desc' 
      });
      
      if (academicYearData && academicYearData.academicYears && academicYearData.academicYears.length > 0) {
        const latestYear = academicYearData.academicYears[0];
        console.log(`Found latest academic year: ${latestYear.name}`);
        
        try {
          // Generate releases for this year
          const userId = req.user && req.user.id ? req.user.id : 'SYSTEM';
          const username = req.user && req.user.username ? req.user.username : 'system';
          
          console.log('Triggering release generation for the latest academic year...');
          await releaseService.generateStandardReleasesForAcademicYear(
            latestYear._id, 
            userId, 
            username
          );
          
          // Get releases again after generation
          const updatedResult = await releaseService.getAllReleases(filterOptions);
          result.releases = updatedResult.releases;
          result.pagination = updatedResult.pagination;
          
          req.flash('success', 'Generated standard releases for the latest academic year.');
        } catch (genError) {
          console.error('Error generating releases:', genError);
        }
      }
    }

    // Get distinct academic year IDs that have releases
    const Release = require('../models/Release');
    const distinctAcademicYearIds = await Release.distinct('AcademicYearID');
    console.log(`Found ${distinctAcademicYearIds.length} distinct academic years with releases`);
    
    // Fetch only those academic years that have releases
    let academicYears = [];
    if (distinctAcademicYearIds.length > 0) {
      const academicYearData = await academicYearService.listAcademicYears({ 
        filter: { _id: { $in: distinctAcademicYearIds } },
        limit: 1000, 
        sortBy: 'startDate', 
        sortOrder: 'asc' 
      });
      academicYears = academicYearData ? academicYearData.academicYears : [];
      console.log(`Fetched ${academicYears.length} academic years with releases`);
    }

    res.render('release-management/list', {
      pageTitle: 'Release Directory - RRDM',
      releases: result.releases || [],
      pagination: result.pagination,
      currentSort: { sortBy, sortOrder },
      currentFilters: { status, releaseType, academicYearId },
      queryParams: req.query, // Pass all query params for pagination links
      academicYears: academicYears || []
    });
  } catch (error) {
    console.error('Error fetching releases for view:', error);
    req.flash('error', 'Failed to load release diary. ' + error.message);
    // Redirect to a safe page, e.g., dashboard or home
    res.redirect('/dashboard'); 
  }
});

// Release - View Single Release
router.get('/release-management/view/:releaseId', async (req, res) => {
  try {
    const releaseId = req.params.releaseId;
    console.log(`Viewing release details for ID: ${releaseId}`);
    
    // Get the release details
    const release = await releaseService.getReleaseById(releaseId);
    
    if (!release) {
      console.log('Release not found');
      req.flash('error', 'Release not found.');
      return res.redirect('/release-management');
    }
    
    console.log('Release found:', release.ReleaseCode);
    
    try {
      // Format dates for display
      const formattedRelease = {
        ...release.toObject(),
        GoLiveDateFormatted: formatDate(release.GoLiveDate),
        StartDateFormatted: formatDate(release.StartDate),
        EndDateFormatted: formatDate(release.EndDate),
        FreezeCutOffDateFormatted: formatDate(release.FreezeCutOffDate),
        CreatedDateTimeFormatted: formatDate(release.CreatedDateTime),
        LastModifiedDateTimeFormatted: formatDate(release.LastModifiedDateTime)
      };
      
      console.log('Rendering template: release-management/view');
      return res.render('release-management/view', {
        pageTitle: `Release Details: ${release.ReleaseCode} - RRDM`,
        release: formattedRelease
      });
    } catch (formatError) {
      console.error('Error formatting release data:', formatError);
      req.flash('error', 'Error formatting release data: ' + formatError.message);
      return res.redirect('/release-management');
    }
  } catch (error) {
    console.error('Error viewing release details:', error);
    req.flash('error', 'Failed to load release details: ' + error.message);
    return res.redirect('/release-management');
  }
});

// Helper function to format dates
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

// Release - New Form
// router.get('/release-management/new', isAuthenticated, async (req, res) => { // isAuthenticated, isSysAdmin etc. can be added later
router.get('/release-management/new', async (req, res) => {
  try {
    // Fetch all academic years for the dropdown
    const academicYearData = await academicYearService.listAcademicYears({ limit: 1000, sortBy: 'startDate', sortOrder: 'asc' }); // Fetch all, sorted
    const academicYears = academicYearData ? academicYearData.academicYears : [];

    res.render('release-management/new', {
      pageTitle: 'Add New Release Entry - RRDM',
      formData: {},
      errors: {},
      academicYears: academicYears || [],
      // academicYears: [] // Example: pass academic years if needed for a select dropdown
    });
  } catch (error) {
    console.error('Error rendering new release form:', error);
    req.flash('error', 'Could not load the new release form. ' + error.message);
    res.redirect('/release-management');
  }
});

// Handle generate releases for all academic years
router.post('/release-management/generate-releases', async (req, res) => {
  try {
    console.log('Received request to generate releases for all academic years');
    
    const userId = req.user && req.user.id ? req.user.id : '000000000000000000000000';
    const username = req.user && req.user.username ? req.user.username : 'system';
    
    // Fetch all relevant academic years (current + future)
    const today = new Date();
    // Fetch current and next two academic years (or first three future if no current)
    // For simplicity, we'll fetch all future/current and limit to 3 for regeneration
    const academicYears = await AcademicYear.find({
      endDate: { $gte: today }
    }).sort({ startDate: 'asc' }).limit(3).lean(); // Get up to 3 relevant academic years
    
    if (!academicYears || academicYears.length === 0) {
      req.flash('warning', 'No current or future academic years found to generate releases for.');
      return res.redirect('/release-management');
    }
    
    console.log(`Found ${academicYears.length} academic years to generate releases for`);    
    
    // Generate releases for each academic year
    let totalReleasesGenerated = 0;
    const results = [];
    
    for (const year of academicYears) {
      try {
        if (year.startDate && year.endDate) {
          console.log(`Generating releases for ${year.name} (${year._id})`);
          const releases = await releaseService.generateStandardReleasesForAcademicYear(year, userId, username, true); // forceRegenerate = true
          totalReleasesGenerated += releases.length;
          results.push({
            academicYear: year.name,
            releasesGenerated: releases.length
          });
        } else {
          console.warn(`Skipping academic year ${year.name || year._id} due to missing dates`);
        }
      } catch (yearError) {
        console.error(`Error generating releases for year ${year.name || year._id}:`, yearError);
        // Continue with other years even if one fails
      }
    }
    
    // Flash a success message
    req.flash('success', `Successfully generated ${totalReleasesGenerated} releases for ${results.length} academic years.`);
    
    // Redirect back to the release management page
    return res.redirect('/release-management');
  } catch (error) {
    console.error('Error generating releases:', error);
    req.flash('error', `Error generating releases: ${error.message}`);
    return res.redirect('/release-management');
  }
});

// New route for selecting academic years for release generation
router.get('/release-management/select-generate-years', csrfProtection, async (req, res) => {
  try {
    // Fetch 'Current' and 'Future' academic years
    const currentYearsData = await academicYearService.listAcademicYears({
      status: 'Current',
      limit: 100, // Assuming not more than 100 current years (usually 1)
      sortBy: 'startDate',
      sortOrder: 'asc'
    });
    const futureYearsData = await academicYearService.listAcademicYears({
      status: 'Future',
      limit: 100, // Assuming not more than 100 future years
      sortBy: 'startDate',
      sortOrder: 'asc'
    });

    const academicYears = [
      ...(currentYearsData.academicYears || []),
      ...(futureYearsData.academicYears || [])
    ];

    res.render('release-management/select-generate-years', {
      pageTitle: 'Select Academic Years for Release Generation - RRDM',
      academicYears: academicYears,
      csrfToken: req.csrfToken() // Pass CSRF token for the form
    });
  } catch (error) {
    console.error('Error fetching academic years for selection:', error);
    req.flash('error', 'Failed to load academic year selection page. ' + error.message);
    res.redirect('/release-management');
  }
});

// Release - Delete Auto-Generated Releases - Selection Page
router.get('/release-management/delete-releases', csrfProtection, async (req, res) => {
  try {
    // Get distinct academic year IDs that have auto-generated releases
    const Release = require('../models/Release');
    const pipeline = [
      { $match: { ReleaseType: { $in: ['AcademicYearBaseline', 'InYearPeriod'] } } },
      { $group: { _id: '$AcademicYearID' } }
    ];
    const distinctAcademicYearIds = await Release.aggregate(pipeline);
    const academicYearIdsWithReleases = distinctAcademicYearIds.map(item => item._id);
    
    console.log(`Found ${academicYearIdsWithReleases.length} academic years with auto-generated releases`);
    
    // Fetch only those academic years that have auto-generated releases
    let academicYears = [];
    if (academicYearIdsWithReleases.length > 0) {
      const academicYearData = await academicYearService.listAcademicYears({ 
        filter: { _id: { $in: academicYearIdsWithReleases } },
        limit: 1000, 
        sortBy: 'startDate', 
        sortOrder: 'asc' 
      });
      academicYears = academicYearData ? academicYearData.academicYears : [];
    }
    
    // Get counts of auto-generated releases for each academic year
    const academicYearsWithCounts = [];
    for (const year of academicYears) {
      const count = await Release.countDocuments({
        AcademicYearID: year._id,
        ReleaseType: { $in: ['AcademicYearBaseline', 'InYearPeriod'] }
      });
      
      academicYearsWithCounts.push({
        ...year,
        autoGeneratedReleaseCount: count
      });
    }
    
    res.render('release-management/delete-releases-select', {
      pageTitle: 'Delete Auto-Generated Releases - RRDM',
      academicYears: academicYearsWithCounts,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error rendering delete releases selection page:', error);
    req.flash('error', 'Failed to load academic years with releases. ' + error.message);
    res.redirect('/release-management');
  }
});

// Release - Delete Auto-Generated Releases - Confirm
router.post('/release-management/delete-releases-confirm', csrfProtection, async (req, res) => {
  try {
    console.log('Delete releases confirm request body:', req.body);
    
    const { academicYearIds } = req.body;
    
    // Validate input
    if (!academicYearIds || (Array.isArray(academicYearIds) && academicYearIds.length === 0)) {
      req.flash('error', 'No academic years selected for deletion.');
      return res.redirect('/release-management/delete-releases');
    }
    
    // Convert to array if it's a single value
    const academicYearIdsArray = Array.isArray(academicYearIds) ? academicYearIds : [academicYearIds];
    
    // Get academic year details for confirmation
    const AcademicYear = require('../models/academicYear');
    const academicYears = await AcademicYear.find({ _id: { $in: academicYearIdsArray } }).lean();
    
    // Get counts of auto-generated releases for each academic year
    const Release = require('../models/Release');
    const academicYearsWithCounts = [];
    let totalReleasesToDelete = 0;
    
    for (const year of academicYears) {
      const count = await Release.countDocuments({
        AcademicYearID: year._id,
        ReleaseType: { $in: ['AcademicYearBaseline', 'InYearPeriod'] }
      });
      
      academicYearsWithCounts.push({
        ...year,
        autoGeneratedReleaseCount: count
      });
      
      totalReleasesToDelete += count;
    }
    
    res.render('release-management/delete-releases-confirm', {
      pageTitle: 'Confirm Delete Auto-Generated Releases - RRDM',
      academicYears: academicYearsWithCounts,
      totalReleasesToDelete,
      academicYearIds: academicYearIdsArray,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error rendering delete releases confirmation page:', error);
    req.flash('error', 'Failed to process selected academic years. ' + error.message);
    res.redirect('/release-management/delete-releases');
  }
});

// Release - Delete Auto-Generated Releases - Execute
router.post('/release-management/delete-releases-execute', csrfProtection, async (req, res) => {
  try {
    console.log('Delete releases execute request body:', req.body);
    
    const { academicYearIds } = req.body;
    
    // Validate input
    if (!academicYearIds || (Array.isArray(academicYearIds) && academicYearIds.length === 0)) {
      req.flash('error', 'No academic years selected for deletion.');
      return res.redirect('/release-management/delete-releases');
    }
    
    // Convert to array if it's a single value
    const academicYearIdsArray = Array.isArray(academicYearIds) ? academicYearIds : [academicYearIds];
    
    // Execute deletion
    const userId = req.user && req.user.id ? req.user.id : 'SYSTEM';
    const username = req.user && req.user.username ? req.user.username : 'system';
    
    const result = await releaseService.deleteAutoGeneratedReleases(
      academicYearIdsArray,
      userId,
      username
    );
    
    // Render success page
    res.render('release-management/delete-releases-success', {
      pageTitle: 'Releases Deleted Successfully - RRDM',
      result
    });
  } catch (error) {
    console.error('Error executing release deletion:', error);
    req.flash('error', 'Failed to delete releases. ' + error.message);
    res.redirect('/release-management/delete-releases');
  }
});

// New POST route to handle selected academic years for release generation confirmation
router.post('/release-management/confirm-generate-releases', csrfProtection, async (req, res) => {
  const { selectedAcademicYearIds } = req.body;
  const csrfToken = req.csrfToken();

  if (!selectedAcademicYearIds || (Array.isArray(selectedAcademicYearIds) && selectedAcademicYearIds.length === 0) || (typeof selectedAcademicYearIds === 'string' && !selectedAcademicYearIds.trim())) {
    req.flash('error', 'No academic years were selected. Please select at least one academic year.');
    return res.redirect('/release-management/select-generate-years');
  }

  const yearIds = Array.isArray(selectedAcademicYearIds) ? selectedAcademicYearIds : [selectedAcademicYearIds];
  const academicYearsWithInfo = [];
  let overallWarning = false;

  try {
    for (const id of yearIds) {
      const academicYear = await academicYearService.getAcademicYearByIdentifier(id);
      if (academicYear) {
        const hasExistingReleases = await releaseService.checkExistingStandardReleases(id);
        academicYearsWithInfo.push({
          id: academicYear._id,
          fullName: academicYear.fullName || academicYear.name, // Use fullName, fallback to name
          status: academicYear.status,
          hasExistingReleases: hasExistingReleases
        });
        if (hasExistingReleases) {
          overallWarning = true;
        }
      } else {
        // Handle case where an ID might not resolve to an academic year (e.g., stale data)
        console.warn(`Academic year with ID ${id} not found during confirmation.`);
        // Optionally add a placeholder or error entry to academicYearsWithInfo
      }
    }

    res.render('release-management/confirm-generate-releases', {
      pageTitle: 'Confirm Standard Release Generation - RRDM',
      academicYearsWithInfo: academicYearsWithInfo,
      overallWarning: overallWarning, // To show a general warning message if any year has existing releases
      csrfToken: csrfToken
    });

  } catch (error) {
    console.error('Error in confirm-generate-releases route:', error);
    req.flash('error', 'An error occurred while preparing the confirmation page: ' + error.message);
    res.redirect('/release-management/select-generate-years');
  }
});

// New POST route to execute the generation of standard releases
router.post('/release-management/execute-generate-releases', async (req, res) => {
  const { academicYearIdsToProcess } = req.body;
  const userId = req.user && req.user._id ? req.user._id.toString() : 'system'; // Fallback to system user
  const username = req.user && req.user.username ? req.user.username : 'system_user'; // Fallback to system username

  if (!academicYearIdsToProcess || academicYearIdsToProcess.length === 0) {
    req.flash('error', 'No academic years were specified for release generation.');
    return res.redirect('/release-management/select-generate-years');
  }

  // Ensure it's always an array
  const yearIds = Array.isArray(academicYearIdsToProcess) ? academicYearIdsToProcess : [academicYearIdsToProcess];

  let successCount = 0;
  let errorCount = 0;
  const errorMessages = [];

  try {
    for (const academicYearId of yearIds) {
      try {
        // Fetch the academic year to get its name for messages
        const academicYear = await academicYearService.getAcademicYearByIdentifier(academicYearId);
        const yearName = academicYear ? (academicYear.fullName || academicYear.name) : `ID ${academicYearId}`;

        console.log(`Attempting to generate releases for ${yearName} (ID: ${academicYearId}) with forceRegenerate=true`);
        await releaseService.generateStandardReleasesForAcademicYear(academicYearId, userId, username, true);
        successCount++;
        req.flash('success', `Successfully generated standard releases for ${yearName}.`);
      } catch (generationError) {
        errorCount++;
        const academicYear = await academicYearService.getAcademicYearByIdentifier(academicYearId);
        const yearName = academicYear ? (academicYear.fullName || academicYear.name) : `ID ${academicYearId}`;
        console.error(`Error generating releases for ${yearName} (ID: ${academicYearId}):`, generationError);
        errorMessages.push(`Failed to generate releases for ${yearName}: ${generationError.message}`);
      }
    }

    if (errorCount > 0) {
      req.flash('error', `Encountered ${errorCount} error(s) during release generation. Check details below or server logs.`);
      errorMessages.forEach(msg => req.flash('error_detail', msg)); // Using a different key for detailed errors
    }
    if (successCount > 0 && errorCount === 0) {
      req.flash('success', `Successfully generated standard releases for ${successCount} academic year(s).`);
    } else if (successCount > 0 && errorCount > 0) {
      req.flash('info', `Generated releases for ${successCount} academic year(s), but ${errorCount} failed.`);
    }

    res.redirect('/release-management');

  } catch (error) {
    console.error('Critical error in execute-generate-releases route:', error);
    req.flash('error', 'A critical error occurred during the release generation process: ' + error.message);
    res.redirect('/release-management');
  }
});

// POST route to handle the execution of release generation
router.post('/release-management/generate-releases-execute', enhancedCsrfProtection, async (req, res) => {
  console.log('=== GENERATE RELEASES EXECUTE ROUTE HANDLER STARTED ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  console.log('Session ID:', req.sessionID);
  console.log('Cookies:', req.cookies);
  
  const userId = req.session.user?.id || 'system';
  const username = req.session.user?.username || 'system';
  
  // Get the academic year IDs from the request body
  const { academicYearIds } = req.body;
  console.log('Received academicYearIds:', academicYearIds);
  
  if (!academicYearIds) {
    console.error('No academic year IDs provided in request body');
    req.flash('error', 'No academic years were selected for release generation.');
    return res.redirect('/release-management/select-generate-years');
  }
  
  // Ensure it's always an array
  const yearIds = Array.isArray(academicYearIds) ? academicYearIds : [academicYearIds];
  console.log('Processing year IDs:', yearIds);
  
  let successCount = 0;
  let errorCount = 0;
  const errorMessages = [];
  
  try {
    for (const academicYearId of yearIds) {
      try {
        // Fetch the academic year to get its name for messages
        const academicYear = await academicYearService.getAcademicYearByIdentifier(academicYearId);
        const yearName = academicYear ? (academicYear.fullName || academicYear.name) : `ID ${academicYearId}`;
        
        console.log(`Attempting to generate releases for ${yearName} (ID: ${academicYearId}) with forceRegenerate=true`);
        await releaseService.generateStandardReleasesForAcademicYear(academicYearId, userId, username, true);
        successCount++;
        req.flash('success', `Successfully generated standard releases for ${yearName}.`);
      } catch (generationError) {
        errorCount++;
        const academicYear = await academicYearService.getAcademicYearByIdentifier(academicYearId);
        const yearName = academicYear ? (academicYear.fullName || academicYear.name) : `ID ${academicYearId}`;
        console.error(`Error generating releases for ${yearName} (ID: ${academicYearId}):`, generationError);
        errorMessages.push(`Failed to generate releases for ${yearName}: ${generationError.message}`);
      }
    }
    
    if (errorCount > 0) {
      req.flash('error', `Encountered ${errorCount} error(s) during release generation. Check details below or server logs.`);
      errorMessages.forEach(msg => req.flash('error_detail', msg)); // Using a different key for detailed errors
    }
    if (successCount > 0 && errorCount === 0) {
      req.flash('success', `Successfully generated standard releases for ${successCount} academic year(s).`);
    } else if (successCount > 0 && errorCount > 0) {
      req.flash('info', `Generated releases for ${successCount} academic year(s), but ${errorCount} failed.`);
    }
    
    console.log('=== GENERATE RELEASES EXECUTE ROUTE HANDLER COMPLETED ===');
    console.log(`Success: ${successCount}, Errors: ${errorCount}`);
    
    return res.redirect('/release-management');
    
  } catch (error) {
    console.error('Critical error in generate-releases-execute route:', error);
    req.flash('error', 'A critical error occurred during the release generation process: ' + error.message);
    return res.redirect('/release-management');
  }
});

module.exports = router;
