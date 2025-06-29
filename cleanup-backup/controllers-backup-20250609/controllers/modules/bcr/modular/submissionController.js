/**
 * BCR Submission Controller
 * Handles submission-related functionality for the BCR module
 */

const mongoose = require('mongoose');
const bcrModel = require('../../../../models/modules/bcr/model');
const statusTagService = require('../../../../services/shared/statusTagService');
const { createModuleLogger } = require('../../../../services/shared/loggerService');

// Create module-specific logger
const logger = createModuleLogger('submissionController');

/**
 * Render the new BCR submission form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.newSubmissionForm = async (req, res) => {
  try {
    logger.info('Loading new submission form', { userId: req.user?.id });
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    
    // Get impact areas and urgency levels
    let impactAreas = [];
    let urgencyLevels = [];
    
    if (isDbConnected) {
      try {
        [impactAreas, urgencyLevels] = await Promise.all([
          bcrModel.getAllImpactAreas(),
          bcrModel.getAllUrgencyLevels()
        ]);
      } catch (error) {
        logger.error('Error fetching form data', error, { userId: req.user?.id });
        // Continue with empty arrays
      }
    }
    
    logger.info('New submission form loaded successfully');
    res.render('modules/bcr/submissions/new', {
      title: 'New BCR Submission',
      impactAreas,
      urgencyLevels,
      connectionIssue: !isDbConnected,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    logger.error('Error in new submission form controller', error, { userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submission form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * Create a new BCR submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createSubmission = async (req, res) => {
  try {
    logger.info('Creating new submission', { userId: req.user?.id });
    // Prepare submission data from form
    const submissionData = {
      fullName: req.body.fullName,
      emailAddress: req.body.emailAddress,
      organisation: req.body.organisation,
      briefDescription: req.body.briefDescription,
      justification: req.body.justification,
      urgencyLevel: req.body.urgencyLevel,
      impactAreas: Array.isArray(req.body.impactAreas) ? req.body.impactAreas : [req.body.impactAreas],
      technicalDependencies: req.body.technicalDependencies,
      additionalNotes: req.body.additionalNotes,
      status: 'Pending',
      submittedBy: req.user ? req.user.id : null
    };
    
    // Create the submission
    const submission = await bcrModel.createSubmission(submissionData);
    
    logger.info('Submission created successfully', { userId: req.user?.id, submissionId: submission._id });
    
    // Redirect to the submission view page
    res.redirect(`/bcr/submissions/${submission._id}`);
  } catch (error) {
    logger.error('Error in create submission controller', error, { userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while creating the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * List all submissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.listSubmissions = async (req, res) => {
  try {
    logger.info('Listing submissions', { userId: req.user?.id, filters: req.query });
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    
    // Prepare filters from query parameters
    const filters = {
      status: req.query.status,
      urgencyLevel: req.query.urgencyLevel,
      impactArea: req.query.impactArea,
      search: req.query.search,
      excludeApproved: true // Exclude submissions that have been approved as BCRs
    };
    
    // Get submissions with filters
    let submissions = [];
    let impactAreas = [];
    let urgencyLevels = [];
    let isMockData = false;
    
    // Check if we're in test mode and should use mock data
    if (process.env.NODE_ENV === 'test') {
      try {
        // Load mock data from file
        const fs = require('fs');
        const path = require('path');
        const mockDataPath = path.join(process.cwd(), 'mock-data', 'bcr-submissions.json');
        
        logger.info(`Loading mock BCR submissions from: ${mockDataPath}`);
        
        if (fs.existsSync(mockDataPath)) {
          const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
          logger.info(`Loaded ${mockData.length} mock BCR submissions for testing`);
          
          // Apply basic filtering if filters are provided
          submissions = mockData.filter(submission => {
            if (filters.status && filters.status !== 'all' && submission.status !== filters.status) {
              return false;
            }
            if (filters.urgencyLevel && filters.urgencyLevel !== 'all' && submission.urgencyLevel !== filters.urgencyLevel) {
              return false;
            }
            if (filters.impactArea && filters.impactArea !== 'all' && 
                (!submission.impactAreas || !submission.impactAreas.includes(filters.impactArea))) {
              return false;
            }
            if (filters.search && filters.search.trim() !== '') {
              const searchTerm = filters.search.toLowerCase();
              const searchableFields = [
                submission.submissionCode,
                submission.title,
                submission.briefDescription,
                submission.fullName
              ];
              if (!searchableFields.some(field => field && field.toLowerCase().includes(searchTerm))) {
                return false;
              }
            }
            return true;
          });
          
          // Extract unique impact areas and urgency levels from mock data
          impactAreas = Array.from(new Set(mockData.flatMap(s => s.impactAreas || []))).map(name => ({ name }));
          urgencyLevels = Array.from(new Set(mockData.map(s => s.urgencyLevel))).filter(Boolean).map(name => ({ name }));
          
          isMockData = true;
          logger.info(`Returning ${submissions.length} mock BCR submissions after filtering`);
        } else {
          logger.warn('Mock BCR submissions file not found');
        }
      } catch (mockError) {
        logger.error('Error loading mock BCR submissions:', mockError);
      }
    } else if (isDbConnected) {
      try {
        // Set a timeout for the database operations
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database operation timed out')), 5000);
        });
        
        // Execute database operations with timeout
        [submissions, impactAreas, urgencyLevels] = await Promise.all([
          Promise.race([bcrModel.getAllSubmissions(filters), timeoutPromise]),
          Promise.race([bcrModel.getAllImpactAreas(), timeoutPromise]),
          Promise.race([bcrModel.getAllUrgencyLevels(), timeoutPromise])
        ]);
      } catch (error) {
        logger.error('Error or timeout fetching submissions data', error, { userId: req.user?.id });
        // Continue with empty arrays
      }
    }
    
    // Add status tags to submissions
    submissions = submissions.map(submission => {
      return {
        ...submission,
        statusTag: statusTagService.getSubmissionStatusTag(submission.status),
        createdAtFormatted: new Date(submission.createdAt).toLocaleDateString('en-GB')
      };
    });
    
    logger.info('Submissions list loaded successfully', { count: submissions.length });
    res.render('modules/bcr/submissions/list', {
      title: 'BCR Submissions',
      submissions,
      impactAreas,
      urgencyLevels,
      filters: req.query,
      connectionIssue: !isDbConnected && !isMockData,
      isMockData,
      user: req.user
    });
  } catch (error) {
    logger.error('Error in list submissions controller', error, { userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submissions list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * View a specific submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.viewSubmission = async (req, res) => {
  try {
    logger.info('Viewing submission', { userId: req.user?.id, submissionId: req.params.id });
    const submissionId = req.params.id;
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let submission = null;
    let timedOut = false;
    let isMockData = false;
    
    // Check if we're in test mode and should use mock data
    if (process.env.NODE_ENV === 'test') {
      try {
        const fs = require('fs');
        const path = require('path');
        const mockDataPath = path.join(__dirname, '../../../../mock-data/bcr-submissions.json');
        
        if (fs.existsSync(mockDataPath)) {
          const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
          submission = mockData.find(item => item._id === submissionId || item.submissionCode === submissionId);
          
          if (submission) {
            // Format dates for consistency
            if (submission.submissionDate) {
              submission.submissionDate = new Date(submission.submissionDate);
            }
            if (submission.lastUpdated) {
              submission.lastUpdated = new Date(submission.lastUpdated);
            }
            
            logger.info('Using mock data for submission view', { submissionId });
            isMockData = true;
          }
        }
      } catch (error) {
        logger.error('Error loading mock submission data', error);
        // Continue to try database if mock data fails
      }
    }
    
    // If not in test mode or mock data not found, try database
    if (!submission && isDbConnected) {
      try {
        // Set a timeout for the database operation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Database operation timed out'));
          }, 5000);
        });
        
        // Execute database operation with timeout
        submission = await Promise.race([
          bcrModel.getSubmissionById(submissionId),
          timeoutPromise
        ]);
      } catch (error) {
        logger.error('Error or timeout fetching submission', error, { userId: req.user?.id });
        // Don't rethrow, continue with submission = null
      }
    }
    
    if (!submission) {
      // If we couldn't find the submission due to connection issues or timeout,
      // show a more helpful error page with connection status
      return res.status(404).render('error', {
        title: 'Submission Not Available',
        message: timedOut ? 
          'The request to fetch the submission timed out. Please try again later.' : 
          (!isDbConnected && process.env.NODE_ENV !== 'test' ? 
            'Database connection issue detected. Please try again when the database is available.' : 
            'The requested submission was not found'),
        error: {},
        connectionIssue: !isDbConnected && !isMockData,
        timedOut: timedOut,
        user: req.user
      });
    }
    
    logger.info('Submission view loaded successfully', { submissionId: req.params.id });
    res.render('modules/bcr/submissions/view', {
      title: `Submission ${submission.submissionCode || submission._id}`,
      submission,
      statusTag: statusTagService.getSubmissionStatusTag(submission.status),
      connectionIssue: !isDbConnected && !isMockData,
      timedOut: timedOut,
      isMockData: isMockData,
      user: req.user
    });
  } catch (error) {
    logger.error('Error in view submission controller', error, { userId: req.user?.id, submissionId: req.params.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * Render the edit submission form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.editSubmissionForm = async (req, res) => {
  try {
    logger.info('Loading edit submission form', { userId: req.user?.id, submissionId: req.params.id });
    const submissionId = req.params.id;
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let submission = null;
    let impactAreas = [];
    let urgencyLevels = [];
    let timedOut = false;
    
    if (isDbConnected) {
      try {
        // Set a timeout for the database operations
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Database operation timed out'));
          }, 5000);
        });
        
        // Execute database operations with timeout
        [submission, impactAreas, urgencyLevels] = await Promise.all([
          Promise.race([bcrModel.getSubmissionById(submissionId), timeoutPromise]),
          Promise.race([bcrModel.getAllImpactAreas(), timeoutPromise]),
          Promise.race([bcrModel.getAllUrgencyLevels(), timeoutPromise])
        ]);
      } catch (error) {
        logger.error('Error or timeout fetching submission data', error, { userId: req.user?.id, submissionId: req.params.id });
        // Don't rethrow, continue with submission = null
      }
    }
    
    if (!submission) {
      // If we couldn't find the submission due to connection issues or timeout,
      // show a more helpful error page with connection status
      return res.status(404).render('error', {
        title: 'Submission Not Available',
        message: timedOut ? 
          'The request to fetch the submission timed out. Please try again later.' : 
          (!isDbConnected ? 
            'Database connection issue detected. Please try again when the database is available.' : 
            'The requested submission was not found'),
        error: {},
        connectionIssue: !isDbConnected,
        timedOut: timedOut,
        user: req.user
      });
    }
    
    logger.info('Edit submission form loaded successfully', { submissionId: req.params.id });
    res.render('modules/bcr/submissions/edit', {
      title: `Edit Submission ${submission.submissionCode || submission._id}`,
      submission,
      impactAreas,
      urgencyLevels,
      statusTag: statusTagService.getSubmissionStatusTag(submission.status),
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    logger.error('Error in edit submission form controller', error, { userId: req.user?.id, submissionId: req.params.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * Update a submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateSubmission = async (req, res) => {
  try {
    logger.info('Updating submission', { userId: req.user?.id, submissionId: req.params.id });
    const submissionId = req.params.id;
    
    // Get the current submission
    const currentSubmission = await bcrModel.getSubmissionById(submissionId);
    if (!currentSubmission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested submission was not found',
        error: {},
        user: req.user
      });
    }
    
    // Prepare update data from form
    const updateData = {
      fullName: req.body.fullName,
      emailAddress: req.body.emailAddress,
      organisation: req.body.organisation,
      briefDescription: req.body.briefDescription,
      justification: req.body.justification,
      urgencyLevel: req.body.urgencyLevel,
      impactAreas: Array.isArray(req.body.impactAreas) ? req.body.impactAreas : [req.body.impactAreas],
      technicalDependencies: req.body.technicalDependencies,
      additionalNotes: req.body.additionalNotes,
      updatedAt: new Date()
    };
    
    // Update the submission
    await bcrModel.Submission.findByIdAndUpdate(submissionId, updateData);
    
    logger.info('Submission updated successfully', { userId: req.user?.id, submissionId });
    
    // Redirect to the submission view page
    res.redirect(`/bcr/submissions/${submissionId}`);
  } catch (error) {
    logger.error('Error in update submission controller', error, { userId: req.user?.id, submissionId: req.params.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while updating the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Export all submission-related controllers
 */
module.exports = exports;
