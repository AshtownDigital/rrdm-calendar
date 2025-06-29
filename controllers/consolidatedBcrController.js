/**
 * Consolidated BCR Controller
 * Combines functionality from multiple BCR-related controllers
 */

const mongoose = require('mongoose');
const bcrModel = require('../models/BcrService');
const releaseService = require('../services/releaseService');
const AcademicYear = require('../models/academicYear');
const Submission = require('../models/Submission');
const Bcr = require('../models/Bcr');
const ImpactedArea = require('../models/ImpactedArea');
const UrgencyLevel = require('../models/UrgencyLevel');
const workflowService = require('../services/modules/bcr/workflowService');
const counterService = require('../services/modules/bcr/counterService');
const { createModuleLogger } = require('../services/shared/loggerService');
const statusTagService = require('../services/shared/statusTagService');

// Create module-specific logger
const moduleLogger = createModuleLogger('controllers:bcr');

// ===== DASHBOARD =====

/**
 * Render BCR dashboard with counters and phases
 */
exports.dashboard = async (req, res) => {
  try {
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    
    // Use Promise.allSettled to handle partial failures
    const [impactAreasResult, urgencyLevelsResult, countersResult, recentBcrsResult] = 
      await Promise.allSettled([
        // Only attempt to fetch data if database is connected
        isDbConnected ? bcrModel.getAllImpactAreas() : Promise.resolve([]),
        isDbConnected ? bcrModel.getAllUrgencyLevels() : Promise.resolve([]),
        isDbConnected ? counterService.getCounters() : Promise.resolve({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          phases: {}
        }),
        // Wrap this in a try/catch with timeout to prevent hanging
        (async () => {
          if (!isDbConnected) {
            return []; // Skip database query if not connected
          }
          
          try {
            // Set a timeout for this operation
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Timeout fetching recent BCRs')), 5000);
            });
            
            // Race the query against the timeout
            return await Promise.race([
              bcrModel.getAllBcrs({ limit: 5 }),
              timeoutPromise
            ]);
          } catch (error) {
            moduleLogger.error('Error fetching recent BCRs', { error: error.message, userId: req.user?.id });
            return []; // Return empty array on error
          }
        })()
      ]);
    
    // Extract results or use defaults
    const impactAreas = impactAreasResult.status === 'fulfilled' ? impactAreasResult.value : [];
    const urgencyLevels = urgencyLevelsResult.status === 'fulfilled' ? urgencyLevelsResult.value : [];
    const counters = countersResult.status === 'fulfilled' ? countersResult.value : {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      phases: {}
    };
    const recentBcrs = recentBcrsResult.status === 'fulfilled' ? recentBcrsResult.value : [];
    
    // Format stats for the dashboard
    const stats = {
      total: counters.total || 0,
      pending: counters.pending || 0,
      approved: counters.approved || 0,
      rejected: 0,
      implemented: (counters.phases && counters.phases['Implementation']) || 0
    };
    
    // Format recent BCRs
    const formattedRecentBcrs = recentBcrs.map(bcr => {
      let statusText = bcr.workflowStatus || bcr.currentStatusId?.name || bcr.status || 'New Submission';
      let statusClass = bcr.currentStatusId?.color ? `govuk-tag govuk-tag--${bcr.currentStatusId.color}` : 
                        workflowService.getStatusTag({ 
                          name: statusText, 
                          value: statusText.toLowerCase().replace(/\s+/g, '-') 
                        }).class;
      let phaseName = bcr.currentPhaseId?.name || '';
      
      if (phaseName) {
        statusText = `${phaseName}: ${statusText}`;
      }
      
      return {
        id: bcr._id || bcr.id,
        bcrNumber: bcr.bcrNumber || 'N/A',
        submissionCode: bcr.submissionId?.submissionCode || 'N/A',
        description: bcr.title || bcr.description || bcr.submissionId?.briefDescription || 'Untitled',
        status: statusText,
        statusClass: statusClass,
        statusText: statusText,
        createdAt: bcr.createdAt ? new Date(bcr.createdAt).toLocaleDateString('en-GB') : 'Unknown'
      };
    });
    
    // Render the dashboard with all data
    res.render('bcr/dashboard/index', {
      title: 'BCR Dashboard',
      stats,
      phases: counters.phases || {},
      impactAreas,
      urgencyLevels,
      bcrsByUrgency: {},
      recentBcrs: formattedRecentBcrs,
      connectionIssue: !isDbConnected,
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error rendering BCR dashboard', { error, userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the BCR dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

// ===== SUBMISSION MANAGEMENT =====

/**
 * List all submissions with pagination and filtering
 */
exports.listSubmissions = async (req, res) => {
  try {
    moduleLogger.info('Listing submissions', { userId: req.user?.id });
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let submissions = [];
    let total = 0;
    let isMockData = false;
    
    if (!isDbConnected) {
      moduleLogger.warn('MongoDB not connected, using mock data');
      // Use mock data if database is not connected
      isMockData = true;
      // Mock data implementation would go here
    } else {
      // Production mode - query the database
      moduleLogger.debug('Querying MongoDB for submissions');
      
      submissions = await Submission.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      total = await Submission.countDocuments();
      
      moduleLogger.debug(`Found ${submissions.length} submissions in database out of ${total} total`);
    }
    
    // Format dates and ensure all required fields are available for display
    submissions = submissions.map(submission => {
      // Convert to plain object if it's a Mongoose document
      const submissionObj = submission.toObject ? submission.toObject() : { ...submission };
      
      // Format the date for display
      submissionObj.createdAtFormatted = new Date(submissionObj.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      // Ensure all required fields are available and convert MongoDB ObjectIDs to strings
      submissionObj.id = submissionObj._id ? submissionObj._id.toString() : submissionObj.id;
      
      // Make sure all required fields have values
      submissionObj.recordNumber = submissionObj.recordNumber || 'N/A';
      submissionObj.submissionCode = submissionObj.submissionCode || 'N/A';
      submissionObj.briefDescription = submissionObj.briefDescription || submissionObj.description || 'No description provided';
      submissionObj.fullName = submissionObj.fullName || submissionObj.submitterName || 'Unknown';
      submissionObj.organisation = submissionObj.organisation || submissionObj.submitterOrganisation || 'N/A';
      submissionObj.impactAreas = Array.isArray(submissionObj.impactAreas) ? submissionObj.impactAreas : [];
      submissionObj.status = submissionObj.status || 'Pending';
      submissionObj.urgencyLevel = submissionObj.urgencyLevel || 'Medium';
      
      return submissionObj;
    });
    
    // Get impact areas and urgency levels for filtering
    let impactAreas = [];
    let urgencyLevels = [];
    
    if (isDbConnected) {
      try {
        [impactAreas, urgencyLevels] = await Promise.all([
          ImpactedArea.find().sort({ name: 1 }),
          UrgencyLevel.find().sort({ priority: 1 })
        ]);
      } catch (error) {
        moduleLogger.error('Error fetching filter data', error);
      }
    }
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;
    
    res.render('bcr/submissions/list', {
      title: 'BCR Submissions',
      submissions,
      impactAreas,
      urgencyLevels,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPrevPage,
        hasNextPage
      },
      filters: req.query,
      connectionIssue: !isDbConnected && !isMockData,
      isMockData,
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error in list submissions controller', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submissions list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render the new BCR submission form
 */
exports.newSubmissionForm = async (req, res) => {
  try {
    moduleLogger.info('Rendering new submission form', { userId: req.user?.id });
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    
    // Get impact areas and urgency levels
    let impactAreas = [];
    let urgencyLevels = [];
    let academicYears = [];
    
    if (isDbConnected) {
      try {
        [impactAreas, urgencyLevels, academicYears] = await Promise.all([
          ImpactedArea.find().sort({ name: 1 }),
          UrgencyLevel.find().sort({ priority: 1 }),
          AcademicYear.find({ active: true }).sort({ startYear: -1 })
        ]);
      } catch (error) {
        moduleLogger.error('Error fetching form data', error);
      }
    }
    
    res.render('bcr/submissions/new', {
      title: 'New BCR Submission',
      impactAreas,
      urgencyLevels,
      academicYears,
      connectionIssue: !isDbConnected,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error rendering submission form', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submission form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Create a new BCR submission
 */
exports.createSubmission = async (req, res) => {
  try {
    moduleLogger.info('Creating new submission', { userId: req.user?.id });
    
    // Implementation of submission creation
    // This would include validation, saving to database, etc.
    
    res.redirect('/bcr/submissions');
  } catch (error) {
    moduleLogger.error('Error creating submission', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while creating the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * View a specific submission
 */
exports.viewSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    moduleLogger.info(`Viewing submission ${submissionId}`, { userId: req.user?.id });
    
    // Fetch the submission from the database
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    res.render('bcr/submissions/view', {
      title: `BCR Submission ${submission.submissionCode || submission.recordNumber}`,
      submission,
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error viewing submission', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while viewing the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

// ===== IMPACT AREAS MANAGEMENT =====

/**
 * List all impact areas
 */
exports.listImpactAreas = async (req, res) => {
  try {
    moduleLogger.info('Retrieving impact areas...');
    const impactAreas = await ImpactedArea.find().sort({ name: 1 });
    moduleLogger.info(`Found ${impactAreas.length} impact areas`);
    
    // Map MongoDB document structure to template structure
    const mappedImpactAreas = impactAreas.map(area => ({
      id: area._id.toString(),
      name: area.name,
      description: area.description || 'No description provided',
      createdAt: area.createdAt,
      updatedAt: area.updatedAt
    }));
    
    res.render('bcr/impact-areas/list', {
      title: 'BCR Impact Areas',
      impactAreas: mappedImpactAreas,
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error in list impact areas controller:', { error: error.message });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the impact areas list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render the new impact area form
 */
exports.newImpactAreaForm = async (req, res) => {
  try {
    moduleLogger.info('Rendering new impact area form');
    
    res.render('bcr/impact-areas/new', {
      title: 'New Impact Area',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error rendering new impact area form', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the new impact area form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Create a new impact area
 */
exports.createImpactArea = async (req, res) => {
  try {
    const { name, description } = req.body;
    moduleLogger.info(`Creating new impact area: ${name}`);
    
    // Validate input
    if (!name) {
      return res.status(400).render('bcr/impact-areas/new', {
        title: 'New Impact Area',
        error: 'Name is required',
        formData: req.body,
        csrfToken: req.csrfToken ? req.csrfToken() : '',
        user: req.user
      });
    }
    
    // Create new impact area
    const newImpactArea = new ImpactedArea({
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newImpactArea.save();
    moduleLogger.info(`Created new impact area with ID: ${newImpactArea._id}`);
    
    res.redirect('/bcr/impact-areas');
  } catch (error) {
    moduleLogger.error('Error creating impact area', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while creating the impact area',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render the edit impact area form
 */
exports.editImpactAreaForm = async (req, res) => {
  try {
    const { impactAreaId } = req.params;
    moduleLogger.info(`Rendering edit form for impact area ${impactAreaId}`);
    
    const impactArea = await ImpactedArea.findById(impactAreaId);
    
    if (!impactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impact area not found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    res.render('bcr/impact-areas/edit', {
      title: `Edit Impact Area: ${impactArea.name}`,
      impactArea,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error rendering edit impact area form', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit impact area form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Update an impact area
 */
exports.updateImpactArea = async (req, res) => {
  try {
    const { impactAreaId } = req.params;
    const { name, description } = req.body;
    moduleLogger.info(`Updating impact area ${impactAreaId}`);
    
    // Validate input
    if (!name) {
      return res.status(400).render('bcr/impact-areas/edit', {
        title: 'Edit Impact Area',
        error: 'Name is required',
        impactArea: { _id: impactAreaId, ...req.body },
        csrfToken: req.csrfToken ? req.csrfToken() : '',
        user: req.user
      });
    }
    
    // Update impact area
    const updatedImpactArea = await ImpactedArea.findByIdAndUpdate(
      impactAreaId,
      {
        name,
        description,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedImpactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impact area not found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    moduleLogger.info(`Updated impact area ${impactAreaId}`);
    res.redirect('/bcr/impact-areas');
  } catch (error) {
    moduleLogger.error('Error updating impact area', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while updating the impact area',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render the delete impact area confirmation page
 */
exports.deleteImpactAreaConfirm = async (req, res) => {
  try {
    const { impactAreaId } = req.params;
    moduleLogger.info(`Rendering delete confirmation for impact area ${impactAreaId}`);
    
    const impactArea = await ImpactedArea.findById(impactAreaId);
    
    if (!impactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impact area not found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    res.render('bcr/impact-areas/delete', {
      title: `Delete Impact Area: ${impactArea.name}`,
      impactArea,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error rendering delete impact area confirmation', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the delete impact area confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Delete an impact area
 */
exports.deleteImpactArea = async (req, res) => {
  try {
    const { impactAreaId } = req.params;
    moduleLogger.info(`Deleting impact area ${impactAreaId}`);
    
    const deletedImpactArea = await ImpactedArea.findByIdAndDelete(impactAreaId);
    
    if (!deletedImpactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impact area not found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    moduleLogger.info(`Deleted impact area ${impactAreaId}`);
    res.redirect('/bcr/impact-areas');
  } catch (error) {
    moduleLogger.error('Error deleting impact area', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while deleting the impact area',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

// ===== WORKFLOW MANAGEMENT =====

/**
 * List all workflow phases
 */
exports.listWorkflowPhases = async (req, res) => {
  try {
    moduleLogger.info('Listing workflow phases');
    
    // Implementation of workflow phases listing
    
    res.render('bcr/workflow/phases', {
      title: 'BCR Workflow Phases',
      phases: [],
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error listing workflow phases', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while listing workflow phases',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

// Export the consolidated controller
module.exports = exports;
