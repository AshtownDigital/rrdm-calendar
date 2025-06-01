const releaseService = require('../services/releaseService');
const mongoose = require('mongoose'); // For ObjectId validation

// Controller to create a new release
exports.createRelease = async (req, res) => {
  try {
    // Basic validation (more can be added, e.g., using a validation library)
    if (!req.body.releaseName || !req.body.releaseDate || !req.body.academicYear) {
      return res.status(400).json({ message: 'Missing required fields: releaseName, releaseDate, academicYear.' });
    }
    // Assuming createdBy will be populated from authenticated user in a real scenario
    // For now, it can be passed in req.body or left to be handled by the service if default logic exists
    const releaseData = { ...req.body }; 
    if (req.user && req.user.id) { // If auth is implemented and user is available
        releaseData.createdBy = req.user.id;
        releaseData.updatedBy = req.user.id;
    }

    const release = await releaseService.createRelease(releaseData);
    res.status(201).json({ message: 'Release created successfully', data: release });
  } catch (error) {
    console.error('Error in createRelease controller:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating release', error: error.message });
  }
};

// Controller to get all releases
exports.getAllReleases = async (req, res) => {
  try {
    // TODO: Implement query parameter handling for filtering, pagination, sorting
    const filterOptions = {
        // filter: req.query.filter ? JSON.parse(req.query.filter) : {},
        // sort: req.query.sort ? JSON.parse(req.query.sort) : { releaseDate: -1 },
        // limit: req.query.limit ? parseInt(req.query.limit) : 0,
        // skip: req.query.skip ? parseInt(req.query.skip) : 0
    };
    const releases = await releaseService.getAllReleases(filterOptions);
    res.status(200).json({ message: 'Releases fetched successfully', data: releases });
  } catch (error) {
    console.error('Error in getAllReleases controller:', error);
    res.status(500).json({ message: 'Error fetching releases', error: error.message });
  }
};

// Controller to get a single release by ID
exports.getReleaseById = async (req, res) => {
  try {
    const releaseId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(releaseId)) {
        return res.status(400).json({ message: 'Invalid Release ID format.' });
    }
    const release = await releaseService.getReleaseById(releaseId);
    if (!release) {
      return res.status(404).json({ message: 'Release not found' });
    }
    res.status(200).json({ message: 'Release fetched successfully', data: release });
  } catch (error) {
    console.error('Error in getReleaseById controller:', error);
    res.status(500).json({ message: 'Error fetching release', error: error.message });
  }
};

// Controller to update a release by ID
exports.updateRelease = async (req, res) => {
  try {
    const releaseId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(releaseId)) {
        return res.status(400).json({ message: 'Invalid Release ID format.' });
    }
    const updateData = { ...req.body };
    if (req.user && req.user.id) { // If auth is implemented
        updateData.updatedBy = req.user.id;
    }

    const release = await releaseService.updateRelease(releaseId, updateData);
    if (!release) {
      return res.status(404).json({ message: 'Release not found for update' });
    }
    res.status(200).json({ message: 'Release updated successfully', data: release });
  } catch (error) {
    console.error('Error in updateRelease controller:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: 'Error updating release', error: error.message });
  }
};

// Controller to delete a release by ID
exports.deleteRelease = async (req, res) => {
  try {
    const releaseId = req.params.id;
     if (!mongoose.Types.ObjectId.isValid(releaseId)) {
        return res.status(400).json({ message: 'Invalid Release ID format.' });
    }
    const release = await releaseService.deleteRelease(releaseId);
    if (!release) {
      return res.status(404).json({ message: 'Release not found for deletion' });
    }
    res.status(200).json({ message: 'Release deleted successfully', data: release });
  } catch (error) {
    console.error('Error in deleteRelease controller:', error);
    res.status(500).json({ message: 'Error deleting release', error: error.message });
  }
};

// Controller to generate standard releases for an academic year
exports.generateStandardReleases = async (req, res) => {
  try {
    const academicYearId = req.params.academicYearId;
    if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
        return res.status(400).json({ message: 'Invalid Academic Year ID format.' });
    }
    
    let userId = '000000000000000000000000'; // Default system user ID
    let username = 'system';
    
    if (req.user) {
        userId = req.user.id || userId;
        username = req.user.username || username;
    } else {
        console.warn('generateStandardReleases called without authenticated user ID.');
    }

    const releases = await releaseService.generateStandardReleasesForAcademicYear(academicYearId, userId, username);
    res.status(201).json({ message: `Standard releases generated successfully for academic year ${academicYearId}`, data: releases });
  } catch (error) {
    console.error('Error in generateStandardReleases controller:', error);
    if (error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error generating standard releases', error: error.message });
  }
};

// Controller to generate releases for all relevant academic years
exports.generateAllReleases = async (req, res) => {
  try {
    console.log('Generating releases for all relevant academic years');
    
    let userId = '000000000000000000000000'; // Default system user ID
    let username = 'system';
    
    if (req.user) {
        userId = req.user.id || userId;
        username = req.user.username || username;
    } else {
        console.warn('generateAllReleases called without authenticated user ID.');
    }
    
    // Call the service function to generate releases for all relevant academic years
    const result = await releaseService.generateReleasesForRelevantAcademicYears(userId, username);
    
    // For HTML forms, redirect back to release management page with flash message
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      req.flash('success', `Successfully generated ${result.results ? result.results.reduce((total, r) => total + r.releasesGenerated, 0) : 0} releases.`);
      return res.redirect('/release-management');
    }
    
    // For API clients, return JSON
    res.status(201).json({ 
      message: 'Releases generated successfully for relevant academic years', 
      data: result 
    });
  } catch (error) {
    console.error('Error in generateAllReleases controller:', error);
    
    // For HTML forms, redirect back to release management page with error message
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      req.flash('error', `Error generating releases: ${error.message}`);
      return res.redirect('/release-management');
    }
    
    // For API clients, return error JSON
    res.status(500).json({ 
      message: 'Error generating releases for relevant academic years', 
      error: error.message 
    });
  }
};
