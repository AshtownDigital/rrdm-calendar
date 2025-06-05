/**
 * BCR Release Assignment Controller
 * Handles assigning BCRs to releases
 */

const mongoose = require('mongoose');
const bcrModel = require('../../../models/modules/bcr/model');
const releaseService = require('../../../services/releaseService');
const AcademicYear = require('../../../models/AcademicYear');

/**
 * Render the form for assigning a BCR to a release
 */
exports.renderAssignReleaseForm = async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Get the BCR details
    const bcr = await bcrModel.getBcrById(bcrId);
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'BCR Not Found',
        message: 'The requested BCR was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get all releases to determine which academic years have releases
    // Pass limit: 0 to fetch all non-archived releases
    console.log('Controller: renderAssignReleaseForm - Calling getAllReleases with limit: 0 to fetch all non-archived releases.');
    const releaseData = await releaseService.getAllReleases({ filter: { IsArchived: false }, limit: 0 });
    const releases = releaseData.releases || [];
    
    console.log(`Controller: renderAssignReleaseForm - Received ${releases.length} releases from service. Sample (if any):`, releases.length > 0 ? JSON.stringify(releases[0], null, 2) : 'No releases');
    
    // Extract unique academic year IDs from releases
    const academicYearIds = [...new Set(releases.map(release => {
      // Handle AcademicYearID as either a string, ObjectId, or object with _id
      if (!release.AcademicYearID) return null;
      
      if (typeof release.AcademicYearID === 'object' && release.AcademicYearID._id) {
        return release.AcademicYearID._id.toString();
      } else {
        return release.AcademicYearID.toString();
      }
    }).filter(id => id))];
    
    console.log(`Found ${academicYearIds.length} unique academic years with releases:`, academicYearIds);
    
    // Get only academic years that have releases - use direct ID comparison to avoid ObjectId casting issues
    const academicYears = await AcademicYear.find({});
    const filteredAcademicYears = academicYears.filter(year => 
      academicYearIds.includes(year._id.toString()));
    
    console.log(`Filtered to ${filteredAcademicYears.length} academic years that have releases`);
    
    // Sort the filtered academic years by start year in descending order
    const sortedAcademicYears = filteredAcademicYears.sort((a, b) => b.startYear - a.startYear);
    
    // For each academic year, count how many releases it has
    const academicYearsWithReleaseCounts = sortedAcademicYears.map(year => {
      const yearId = year._id.toString();
      const yearReleases = releases.filter(release => {
        if (!release.AcademicYearID) return false;
        
        // Handle AcademicYearID as either a string, ObjectId, or object with _id
        let academicYearIdString;
        if (typeof release.AcademicYearID === 'object' && release.AcademicYearID._id) {
          academicYearIdString = release.AcademicYearID._id.toString();
        } else {
          academicYearIdString = release.AcademicYearID.toString();
        }
        
        return academicYearIdString === yearId;
      });
      
      return {
        ...year.toObject(),
        releaseCount: yearReleases.length
      };
    });
    
    console.log(`Prepared ${academicYearsWithReleaseCounts.length} academic years with release counts`);
    
    // Get the currently associated release (if any)
    let associatedRelease = null;
    if (bcr.associatedReleaseId) {
      associatedRelease = await Release.findById(bcr.associatedReleaseId);
    }
    
    console.log('Rendering assign-release with data:', {
      academicYearsCount: academicYearsWithReleaseCounts.length,
      academicYearsList: academicYearsWithReleaseCounts.map(y => ({ id: y._id, name: y.name, count: y.releaseCount }))
    });
    
    // Render the assign release form
    res.render('modules/bcr/assign-release', {
      title: 'Assign BCR to Release',
      bcr,
      academicYears: academicYearsWithReleaseCounts,
      associatedRelease,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in renderAssignReleaseForm controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the assign release form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process the assignment of a BCR to a release
 */
exports.processAssignRelease = async (req, res) => {
  try {
    const bcrId = req.params.id;
    const { releaseId, notes } = req.body;
    
    if (!releaseId) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'No release selected',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // Get the BCR
    const bcr = await bcrModel.getBcrById(bcrId);
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'BCR Not Found',
        message: 'The requested BCR was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get the release details
    const release = await releaseService.getById(releaseId);
    if (!release) {
      return res.status(404).render('error', {
        title: 'Release Not Found',
        message: 'The selected release was not found',
        error: {},
        user: req.user
      });
    }
    
    // Update the BCR with the selected release
    bcr.associatedReleaseId = releaseId;
    
    // Add a workflow history entry
    const historyEntry = {
      date: new Date(),
      action: 'Release Assigned',
      userId: req.user ? req.user.id : null,
      details: notes || `BCR scheduled for release ${release.ReleaseNameDetails} by ${req.user ? req.user.name || req.user.email : 'system'}`,
      releaseId
    };
    
    // Update the BCR with the new history entry
    bcr.workflowHistory = bcr.workflowHistory || [];
    bcr.workflowHistory.push(historyEntry);
    await bcr.save();
    
    console.log(`BCR ${bcrId} assigned to release ${releaseId} successfully`);
    
    // Redirect to the BCR details page
    res.redirect(`/bcr/business-change-requests/${bcrId}`);
  } catch (error) {
    console.error('Error in processAssignRelease controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while assigning the BCR to a release',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};
