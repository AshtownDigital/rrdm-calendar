/**
 * BCR Module Controller
 * Consolidated controller for BCR functionality
 */

const mongoose = require('mongoose');
const bcrModel = require('../../../models/modules/bcr/model');
const releaseService = require('../../../services/releaseService');
const AcademicYear = require('../../../models/academicYear');
const { Submission } = require('../../../models');
const workflowService = require('../../../services/modules/bcr/workflowService');
const counterService = require('../../../services/modules/bcr/counterService');
const { createModuleLogger } = require('../../../services/shared/loggerService');

// Create module-specific logger
const moduleLogger = createModuleLogger('controllers:bcr');

/**
 * Render the new submission form
 */
exports.newSubmissionForm = async (req, res) => {
  try {
    moduleLogger.info('Rendering new submission form', { userId: req.user?.id });
    
    // Get academic years for the form
    const academicYears = await AcademicYear.find({ active: true }).sort({ startYear: -1 });
    
    res.render('bcr/submissions/new', {
      title: 'New BCR Submission',
      academicYears,
      csrfToken: req.csrfToken(),
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error rendering submission form', error, { userId: req.user?.id });
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
    
    // Create new submission from form data
    const submission = new Submission({
      title: req.body.title,
      description: req.body.description,
      submittedBy: req.user.id,
      academicYear: req.body.academicYear,
      department: req.body.department,
      priority: req.body.priority || 'medium'
    });
    
    await submission.save();
    
    moduleLogger.info('Submission created successfully', { 
      userId: req.user?.id, 
      submissionId: submission._id 
    });
    
    req.flash('success', 'Your submission has been created successfully');
    res.redirect(`/bcr/submissions/${submission._id}`);
  } catch (error) {
    moduleLogger.error('Error creating submission', error, { userId: req.user?.id });
    req.flash('error', 'An error occurred while creating your submission');
    res.redirect('/bcr/submit');
  }
};

/**
 * List all submissions
 */
exports.listSubmissions = async (req, res) => {
  try {
    moduleLogger.info('Listing submissions', { userId: req.user?.id });
    
    // Get submissions with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let submissions = [];
    let total = 0;
    
    // Check if we're in test mode and should use mock data
    if (process.env.NODE_ENV === 'test') {
      try {
        // Load mock data from file
        const fs = require('fs');
        const path = require('path');
        const mockDataPath = path.join(process.cwd(), 'mock-data', 'bcr-submissions.json');
        
        moduleLogger.debug('Loading mock BCR submissions data from:', mockDataPath);
        
        if (fs.existsSync(mockDataPath)) {
          const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
          moduleLogger.debug('Mock data loaded successfully, found', mockData.length, 'submissions for testing');
          
          // Apply pagination to mock data
          total = mockData.length;
          submissions = mockData
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(skip, skip + limit);
            
          moduleLogger.debug('Returning', submissions.length, 'mock BCR submissions after pagination');
        } else {
          moduleLogger.warn('Mock BCR submissions file not found at path:', mockDataPath);
        }
      } catch (mockError) {
        moduleLogger.error('Error loading mock BCR submissions:', mockError);
      }
    } else {
      // Production mode - query the database
      submissions = await Submission.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', 'name email')
        .populate('academicYear');
      
      total = await Submission.countDocuments();
    }
    
    // Format dates for display if needed
    submissions = submissions.map(submission => {
      // If this is a plain object (from mock data), we need to add any computed properties
      if (!submission.toObject) {
        return {
          ...submission,
          createdAtFormatted: new Date(submission.createdAt).toLocaleDateString('en-GB')
        };
      }
      // If it's a Mongoose document, convert to plain object
      const submissionObj = submission.toObject ? submission.toObject() : submission;
      submissionObj.createdAtFormatted = new Date(submission.createdAt).toLocaleDateString('en-GB');
      return submissionObj;
    });
    
    // Use the submissions list template in the new folder structure
    res.render('bcr/submissions/list', {
      title: 'BCR Submissions',
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      user: req.user,
      isMockData: process.env.NODE_ENV === 'test',
      filters: {
        statuses: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'In Development', 'Testing'],
        impactAreas: ['Security', 'User Experience', 'Performance', 'Accessibility', 'Integration', 'Data Management'],
        submitters: submissions.map(s => s.fullName).filter((name, index, self) => self.indexOf(name) === index)
      },
      selectedFilters: {
        status: 'all',
        impactArea: 'all',
        dfeAffiliation: 'all',
        submitter: 'all'
      }
    });
  } catch (error) {
    moduleLogger.error('Error listing submissions', error, { userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading submissions',
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
    const submissionId = req.params.submissionId;
    moduleLogger.info('Viewing submission', { userId: req.user?.id, submissionId });
    
    let submission = null;
    let isDbConnected = true;
    let timedOut = false;
    
    // Check if we're in test mode and should use mock data
    if (process.env.NODE_ENV === 'test') {
      try {
        // Load mock data from file
        const fs = require('fs');
        const path = require('path');
        const mockDataPath = path.join(process.cwd(), 'mock-data', 'bcr-submissions.json');
        
        moduleLogger.debug('Loading mock BCR submission from:', mockDataPath);
        
        if (fs.existsSync(mockDataPath)) {
          const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
          submission = mockData.find(s => s._id === submissionId);
          moduleLogger.debug('Found mock BCR submission:', submission ? 'Yes' : 'No');
        } else {
          moduleLogger.warn('Mock BCR submissions file not found');
        }
      } catch (mockError) {
        moduleLogger.error('Error loading mock BCR submission:', mockError);
      }
    } else {
      // Production mode - query the database
      submission = await Submission.findById(submissionId)
        .populate('submittedBy', 'name email')
        .populate('academicYear')
        .populate('reviewedBy', 'name email');
    }
    
    if (!submission) {
      moduleLogger.warn('Submission not found', { userId: req.user?.id, submissionId });
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
    
    res.render('bcr/submissions/view', {
      title: `Submission: ${submission.submissionCode || submission._id}`,
      submission,
      user: req.user,
      isMockData: process.env.NODE_ENV === 'test'
    });
  } catch (error) {
    moduleLogger.error('Error viewing submission', error, { 
      userId: req.user?.id, 
      submissionId: req.params.submissionId 
    });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

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
            // Get BCRs directly instead of submissions to access the workflowStatus field
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
      rejected: counters.rejected || 0,
      implemented: (counters.phases && counters.phases['Implementation']) || 0 // Get implementation phase count
    };
    
    // Format recent BCRs
    const formattedRecentBcrs = recentBcrs.map(bcr => {
      // Get workflow status tag based on phase and status
      let statusClass = 'govuk-tag';
      let statusText = 'New Submission';
      let phaseName = '';
      
      // First check for the workflowStatus field (new field)
      if (bcr.workflowStatus) {
        statusText = bcr.workflowStatus;
      }
      // Then check for currentStatusId (populated reference)
      else if (bcr.currentStatusId && bcr.currentStatusId.name) {
        statusText = bcr.currentStatusId.name;
      }
      // Finally fall back to the legacy status field
      else if (bcr.status) {
        statusText = bcr.status;
      }
      
      // Get the phase name if available
      if (bcr.currentPhaseId && bcr.currentPhaseId.name) {
        phaseName = bcr.currentPhaseId.name;
      }
      
      // If we have phase information, include it in the status text
      if (phaseName) {
        statusText = `${phaseName}: ${statusText}`;
      }
      
      // Determine the status class (color)
      if (bcr.currentStatusId && bcr.currentStatusId.color) {
        // Use the color from the status if available
        statusClass = `govuk-tag govuk-tag--${bcr.currentStatusId.color}`;
      } else {
        // Use the workflowService to get the appropriate tag styling
        const statusTag = workflowService.getStatusTag({
          name: statusText,
          value: statusText.toLowerCase().replace(/\s+/g, '-')
        });
        statusClass = statusTag.class;
      }
      
      // Get the submission code if available
      const submissionCode = bcr.submissionId?.submissionCode || 'N/A';
      
      return {
        id: bcr._id || bcr.id,
        bcrNumber: bcr.bcrNumber || 'N/A',
        submissionCode: submissionCode,
        description: bcr.title || bcr.description || (bcr.submissionId?.briefDescription) || 'Untitled',
        status: statusText,
        statusClass: statusClass,
        statusText: statusText,
        createdAt: bcr.createdAt ? new Date(bcr.createdAt).toLocaleDateString('en-GB') : 'Unknown'
      };
    });
    
    // Render the dashboard with actual data
    res.render('bcr/dashboard/index', {
      title: 'BCR Dashboard',
      stats: stats,
      phases: counters.phases || {},
      impactAreas: impactAreas,
      urgencyLevels: urgencyLevels,
      bcrsByUrgency: {}, // This would need additional queries to populate
      recentBcrs: formattedRecentBcrs,
      connectionIssue: !isDbConnected, // Pass connection state to the template
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error in dashboard controller:', { error: error.message, userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render BCR workflow view
 */
exports.showWorkflow = async (req, res) => {
  try {
    moduleLogger.info('Loading workflow view');
    const phases = await workflowService.getAllPhases();
    const statuses = await workflowService.getAllStatuses();
    
    // Helper functions for the template
    const helpers = {
      getPhaseByDisplayOrder: (phases, displayOrder) => {
        return phases.find(p => p.displayOrder === displayOrder);
      },
      
      getStatusById: (statuses, statusId) => {
        if (!statusId) return null;
        const statusIdStr = statusId.toString();
        return statuses.find(s => s._id.toString() === statusIdStr);
      },
      
      getGroupDescription: (groupName) => {
        const descriptions = {
          "Submission & Initial Review": "The initial phases of the BCR process involve submission, review, and prioritization.",
          "Requirements & Analysis": "These phases focus on documenting and analyzing the requirements for the business change.",
          "Development & Testing": "These phases cover the implementation and testing of the business change.",
          "Documentation & Communication": "These phases ensure proper documentation and communication of the business change.",
          "Deployment & Closure": "These phases manage the deployment and closure of the business change."
        };
        return descriptions[groupName] || "This group of phases manages a specific aspect of the BCR process.";
      }
    };
    
    moduleLogger.info('Workflow view loaded successfully', { phasesCount: phases.length, statusesCount: statuses.length });
    res.render('bcr/workflow/dynamic', {
      title: 'BCR Workflow',
      phases,
      statuses,
      getPhaseByDisplayOrder: helpers.getPhaseByDisplayOrder,
      getStatusById: helpers.getStatusById,
      getGroupDescription: helpers.getGroupDescription,
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error in workflow controller:', { error: error.message, userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the workflow view',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

// ... rest of the code remains the same ...
/**
 * List all approved Business Change Requests (post-approval)
 */
exports.listApprovedBcrs = async (req, res) => {
  try {
    // Ignore any error messages about BCRs not found
    let errorMessage = req.query.error;
    if (errorMessage === 'Business+Change+Request+not+found') {
      errorMessage = null;
    }
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let bcrs = [];
    let phases = [];
    let statuses = [];
    
    // Check if we're in testing mode with DB bypass (indicated by environment variable or mocked connection)
    if (process.env.BYPASS_DB === 'true' || (isDbConnected && process.env.NODE_ENV === 'test')) {
      moduleLogger.info('TESTING MODE: Bypassing BCR database query');
      // Continue with empty arrays for rendering
    } else if (isDbConnected) {
      try {
        // Set a timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching BCRs'));
          }, 8000);
        });
        
        try {
          // Get all phases and statuses for reference
          phases = await Promise.race([
            workflowService.getAllPhases(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout fetching phases')), 5000))
          ]);
          
          statuses = await Promise.race([
            workflowService.getAllStatuses(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout fetching statuses')), 5000))
          ]);
          
          // Get BCRs with optional filtering
          bcrs = await Promise.race([
            bcrModel.getAllBcrs(req.query),
            timeoutPromise
          ]);
        } catch (fetchError) {
          moduleLogger.error('Error during data fetching:', { error: fetchError.message });
          // Continue with empty arrays
          bcrs = [];
          phases = phases || [];
          statuses = statuses || [];
        }
        
        moduleLogger.info(`Retrieved ${bcrs.length} BCRs, ${phases.length} phases, and ${statuses.length} statuses`);
      } catch (error) {
        moduleLogger.error('Error fetching BCRs:', { error: error.message });
        // Don't rethrow, continue with bcrs = []
      }
    }
    
    // If we got no BCRs, ensure we have an empty array
    const bcrsToDisplay = Array.isArray(bcrs) ? bcrs : [];
    
    // Format BCRs for display
    const formattedBcrs = bcrsToDisplay.map(bcr => {
      // Default values for phase and status
      let currentPhase = 'Phase 1: Complete and Submit BCR form';
      let workflowStatus = 'New Submission';
      let workflowStatusClass = 'govuk-tag';
      let currentPhaseId = null;
      let currentStatusId = null;
      
      // Get the current phase and status from the BCR
      if (bcr.currentPhaseId) {
        currentPhaseId = bcr.currentPhaseId._id || bcr.currentPhaseId;
        currentPhase = bcr.currentPhaseId.name || 'Unknown Phase';
      }
      
      // First check for the workflowStatus field (new field)
      if (bcr.workflowStatus) {
        workflowStatus = bcr.workflowStatus;
        
        // Try to find the matching status in our statuses list
        const matchingStatus = statuses.find(s => s.name === bcr.workflowStatus);
        if (matchingStatus && matchingStatus.color) {
          workflowStatusClass = `govuk-tag govuk-tag--${matchingStatus.color}`;
        } else {
          // Use the getStatusTag helper for consistent styling
          const statusTag = workflowService.getStatusTag({
            name: bcr.workflowStatus,
            value: bcr.workflowStatus.toLowerCase().replace(/\s+/g, '-')
          });
          workflowStatusClass = statusTag.class;
        }
      } 
      // Then check for currentStatusId (populated reference)
      else if (bcr.currentStatusId) {
        currentStatusId = bcr.currentStatusId._id || bcr.currentStatusId;
        workflowStatus = bcr.currentStatusId.name || 'Unknown Status';
        workflowStatusClass = bcr.currentStatusId.color ? 
          `govuk-tag govuk-tag--${bcr.currentStatusId.color}` : 'govuk-tag';
      } 
      // Finally fall back to the legacy status field
      else if (bcr.status) {
        workflowStatus = bcr.status;
        
        // Try to find the matching status in our statuses list
        const matchingStatus = statuses.find(s => s.name === bcr.status);
        if (matchingStatus && matchingStatus.color) {
          workflowStatusClass = `govuk-tag govuk-tag--${matchingStatus.color}`;
        }
      }
      
      // If we have a submissionId reference, extract additional info if needed
      if (bcr.submissionId) {
        // Only use these as fallbacks if not already set
        if (!currentPhase && bcr.submissionId.workflowPhase) {
          currentPhase = bcr.submissionId.workflowPhase;
        }
        
        if (!workflowStatus && bcr.submissionId.status) {
          workflowStatus = bcr.submissionId.status;
        }
      }
      
      return {
        id: bcr._id || bcr.id,
        bcrNumber: bcr.bcrNumber || 'N/A',
        submissionCode: bcr.submissionId ? bcr.submissionId.submissionCode : 'N/A',
        briefDescription: bcr.title || (bcr.submissionId ? bcr.submissionId.briefDescription : 'No description provided'),
        currentPhase: currentPhase,
        currentPhaseId: currentPhaseId,
        displayStatus: workflowStatus,
        currentStatusId: currentStatusId,
        statusClass: workflowStatusClass,
        createdAt: bcr.createdAt ? 
          new Date(bcr.createdAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Unknown',
        updatedAt: bcr.updatedAt ? 
          new Date(bcr.updatedAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Unknown',
        reviewedAt: bcr.reviewedAt ? 
          new Date(bcr.reviewedAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Unknown'
      };
    });
    
    // Render the BCRs dashboard template
    // Providing the necessary data for the BCR dashboard view
    res.render('bcr/dashboard/index', {
      title: 'Business Change Requests',
      bcrs: formattedBcrs,
      phases: phases,
      statuses: statuses,
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      error: errorMessage || null,
      user: req.user
    });
  } catch (error) {
    const errorMessage = `Error retrieving BCRs: ${error.message}`;
    moduleLogger.error('Error in list approved BCRs controller:', { error: error.message });
    
    res.render('bcr/dashboard/index', {
      title: 'Business Change Requests',
      bcrs: [],
      phases: [],
      statuses: [],
      connectionIssue: true,
      timedOut: false,
      error: errorMessage,
      stats: { total: 0, pending: 0, approved: 0, rejected: 0, implemented: 0 },
      recentBcrs: [],
      urgencyLevels: [],
      bcrsByUrgency: {},
      user: req.user
    });
  }
};

/**
 * View workflow progress for a specific BCR by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.viewWorkflowProgress = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the BCR data
    const bcr = await bcrModel.getBcrById(id);
    if (!bcr) {
      req.flash('error', 'BCR not found');
      return res.redirect('/bcr/business-change-requests');
    }
    
    // Get the submission data if available
    let submission = null;
    if (bcr.submissionId) {
      submission = await Submission.findById(bcr.submissionId);
    }
    
    // Get the current phase and status
    const phase = await workflowService.getPhaseById(bcr.currentPhaseId);
    const status = await workflowService.getStatusById(bcr.currentStatusId);
    
    // Set the current phase and status
    const currentPhase = phase ? phase.name : 'Unknown';
    const workflowStatus = status ? status.name : 'Unknown';
    const workflowStatusClass = status && status.color ? `govuk-tag govuk-tag--${status.color}` : 'govuk-tag';
    
    // Format the BCR data for the view
    const bcrData = {
      ...bcr,
      createdAt: bcr.createdAt,
      updatedAt: bcr.updatedAt
    };
    
    // Get all phases for the workflow visualization
    const allPhases = await bcrModel.getAllPhases();
    
    // Get all statuses for the timeline
    const allStatuses = await bcrModel.getAllStatuses();
    
    // Create a simple workflow visualization
    const workflowProgress = [];
    
    // Sort phases by display order
    allPhases.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Find the current phase index
    const currentPhaseIndex = allPhases.findIndex(phase => 
      phase._id.toString() === (bcr.currentPhaseId ? bcr.currentPhaseId._id.toString() : ''));
    
    // Get the initial phase for the BCR creation event in the timeline
    let initialPhase = 'Initial Phase';
    if (allPhases.length > 0) {
      initialPhase = allPhases[0].name;
    }
    
    // Create the workflow progress data
    for (let i = 0; i < allPhases.length; i++) {
      const phase = allPhases[i];
      const isCurrentPhase = i === currentPhaseIndex;
      const isCompleted = i < currentPhaseIndex;
      
      workflowProgress.push({
        id: phase._id,
        name: phase.name,
        displayOrder: phase.displayOrder,
        status: isCompleted ? 'Completed' : (isCurrentPhase ? 'In Progress' : 'Not Started'),
        statusClass: isCompleted ? 'govuk-tag--green' : (isCurrentPhase ? 'govuk-tag--blue' : 'govuk-tag--grey')
      });
    }
    
    // Render the workflow progress view
    res.render('bcr/bcrs/workflow-progress', {
      title: `Workflow Progress for BCR ${bcrData.bcrNumber}`,
      bcr: {
        ...bcrData,
        initialPhase: initialPhase
      },
      submission,
      currentPhase,
      workflowStatus,
      workflowStatusClass,
      workflowProgress,
      allPhases,
      allStatuses,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    moduleLogger.error('Error viewing workflow progress:', { error: error.message });
    // Handle error without using flash if it's not available
    return res.status(500).render('error', {
      message: 'An error occurred while viewing the workflow progress',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * View a specific Business Change Request
 */
exports.viewBcr = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if the ID is a valid MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render('error', {
        title: 'Invalid Request',
        message: 'The provided ID is not valid',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // First try to find the ID as a BCR
    let bcr = await bcrModel.getBcrById(id);
    let submission = null;
    
    // If not found as a BCR, check if it's a submission ID
    if (!bcr) {
      submission = await bcrModel.getSubmissionById(id);
      
      if (submission && submission.bcrId) {
        // If it's a submission with a BCR ID, get the BCR
        bcr = await bcrModel.getBcrById(submission.bcrId);
      } else if (submission && submission.bcrNumber) {
        // If it's a submission with a BCR number but no BCR ID, try to find the BCR by other means
        // This is a fallback for submissions that were approved before the BCR model was updated
        const bcrs = await bcrModel.getAllBcrs({ search: submission.bcrNumber });
        if (bcrs && bcrs.length > 0) {
          bcr = bcrs[0];
        }
      }
      
      // If we still couldn't find a BCR, create a simple BCR object from the submission
      if (!bcr && submission) {
        // Create a temporary BCR object from the submission data
        bcr = {
          _id: submission._id,
          bcrNumber: submission.bcrNumber || 'BCR-Unknown',
          title: submission.briefDescription || 'No title available',
          description: submission.justification || 'No description available',
          urgencyLevel: submission.urgencyLevel || 'Medium',
          status: submission.status || 'Approved',
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt
        };
      } else if (!bcr) {
        // If no BCR and no submission found, redirect to the list page
        return res.redirect('/bcr/business-change-requests');
      }
    } else if (bcr.submissionId) {
      // If we found the BCR directly, get its associated submission
      submission = await bcrModel.getSubmissionById(bcr.submissionId);
    }
    
    // Get the current phase and status from the database
    let workflowStatus = 'New Submission';
    let workflowStatusClass = 'govuk-tag';
    let currentPhase = '';
    let currentPhaseObj = null;
    let currentStatusObj = null;
    
    // Fetch the current phase and status if the BCR has them
    if (bcr.currentPhaseId) {
      try {
        // Get the current phase
        const phase = await workflowService.getPhaseById(bcr.currentPhaseId);
        if (phase) {
          currentPhaseObj = phase;
          currentPhase = phase.name;
          moduleLogger.info('Fetched current phase:', currentPhase);
        }
      } catch (error) {
        moduleLogger.error('Error fetching current phase:', { error: error.message });
      }
    }
    
    if (bcr.currentStatusId) {
      try {
        // Get the current status
        const status = await workflowService.getStatusById(bcr.currentStatusId);
        if (status) {
          currentStatusObj = status;
          workflowStatus = status.name;
          moduleLogger.info('Fetched current status:', workflowStatus);
        }
      } catch (error) {
        moduleLogger.error('Error fetching current status:', { error: error.message });
      }
    } else if (bcr.workflowStatus) {
      // If we have a workflowStatus field but no currentStatusId, use that
      workflowStatus = bcr.workflowStatus;
      moduleLogger.info('Using workflowStatus field:', workflowStatus);
    }
    
    // Get the status tag styling
    const statusTag = workflowService.getStatusTag(currentStatusObj || { name: workflowStatus });
    workflowStatusClass = statusTag.class;
    
    // Log the values we're using
    moduleLogger.info('Using dynamic values for BCR:', bcr.bcrNumber || bcr.bcrCode);
    moduleLogger.info('- Current Phase:', currentPhase);
    moduleLogger.info('- Workflow Status:', workflowStatus);
    moduleLogger.info('- Status Class:', workflowStatusClass);
    
    // Prepare BCR data for the view
    const bcrData = {
      ...bcr._doc || bcr,
      bcrNumber: bcr.bcrCode || bcr.bcrNumber || `BCR-${bcr.recordNumber || 'Unknown'}`,
      title: submission ? submission.briefDescription : (bcr.title || 'No title available'),
      description: submission ? submission.justification : (bcr.description || 'No description available')
    };
    
    // Debug log to see what values are being passed to the template
    moduleLogger.info('Debug - BCR View Data:', {
      bcrNumber: bcrData.bcrNumber,
      currentPhase,
      currentPhaseObj,
      workflowStatus,
      workflowStatusClass,
      currentStatus: currentStatusObj
    });
    
    // Fetch release details if a release is associated with this BCR
    let associatedRelease = null;
    let associatedAcademicYear = null;
    
    if (bcr.associatedReleaseId) {
      try {
        // Get the release details
        associatedRelease = await releaseService.getReleaseById(bcr.associatedReleaseId);
        
        // If we have a release with an academic year, get the academic year details
        if (associatedRelease && associatedRelease.AcademicYearID) {
          associatedAcademicYear = await AcademicYear.findById(associatedRelease.AcademicYearID)
            .select('name code fullName status')
            .lean();
        }
        
        moduleLogger.info('Found associated release for BCR details page:', associatedRelease ? associatedRelease.ReleaseNameDetails : 'None');
      } catch (error) {
        moduleLogger.error('Error fetching associated release details:', { error: error.message });
        // Don't fail if we can't get release details
      }
    }
    
    // Get all phases for the workflow visualization
    const allPhases = await bcrModel.getAllPhases();
    
    // Get all statuses for the timeline
    const allStatuses = await bcrModel.getAllStatuses();
    
    // Create a simple workflow visualization
    const workflowProgress = [];
    
    // Sort phases by display order
    allPhases.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Find the current phase index
    const currentPhaseIndex = allPhases.findIndex(phase => 
      phase._id.toString() === (bcr.currentPhaseId ? bcr.currentPhaseId._id.toString() : ''));
    
    // Get the initial phase for the BCR creation event in the timeline
    let initialPhase = 'Initial Phase';
    if (allPhases.length > 0) {
      initialPhase = allPhases[0].name;
    }
    
    // Create the workflow progress data
    for (let i = 0; i < allPhases.length; i++) {
      const phase = allPhases[i];
      const isCurrentPhase = i === currentPhaseIndex;
      const isCompleted = i < currentPhaseIndex;
      
      workflowProgress.push({
        id: phase._id,
        name: phase.name,
        displayOrder: phase.displayOrder,
        status: isCompleted ? 'Completed' : (isCurrentPhase ? 'In Progress' : 'Not Started'),
        statusClass: isCompleted ? 'govuk-tag--green' : (isCurrentPhase ? 'govuk-tag--blue' : 'govuk-tag--grey')
      });
    }
    
    // Create timeline data for history section
    const timeline = [];
    
    // Add phase transitions to timeline
    if (bcrData.phaseHistory && bcrData.phaseHistory.length > 0) {
      bcrData.phaseHistory.forEach(history => {
        const phaseObj = allPhases.find(p => p._id.toString() === history.phaseId.toString());
        const phaseName = phaseObj ? phaseObj.name : 'Unknown Phase';
        const userObj = history.updatedBy ? 
          (typeof history.updatedBy === 'object' ? history.updatedBy : { name: 'System' }) : 
          { name: 'System' };
        
        timeline.push({
          title: `Phase changed to ${phaseName}`,
          by: userObj.name,
          date: history.updatedAt,
          content: history.notes || 'Phase transition occurred'
        });
      });
    }
    
    // Add status changes to timeline
    if (bcrData.statusHistory && bcrData.statusHistory.length > 0) {
      bcrData.statusHistory.forEach(history => {
        const statusObj = allStatuses.find(s => s._id.toString() === history.statusId.toString());
        const statusName = statusObj ? statusObj.name : 'Unknown Status';
        const userObj = history.updatedBy ? 
          (typeof history.updatedBy === 'object' ? history.updatedBy : { name: 'System' }) : 
          { name: 'System' };
        
        timeline.push({
          title: `Status changed to ${statusName}`,
          by: userObj.name,
          date: history.updatedAt,
          content: history.notes || 'Status change occurred'
        });
      });
    }
    
    // Add release assignment to timeline if present
    if (associatedRelease) {
      timeline.push({
        title: `Release assigned: ${associatedRelease.ReleaseNameDetails}`,
        by: bcrData.updatedBy ? bcrData.updatedBy.name : 'System',
        date: bcrData.updatedAt,
        content: `BCR was assigned to release ${associatedRelease.ReleaseCode || associatedRelease.ReleaseNameDetails}`
      });
    }
    
    // Add BCR creation to timeline
    timeline.push({
      title: 'BCR Created',
      by: bcrData.createdBy ? bcrData.createdBy.name : 'System',
      date: bcrData.createdAt,
      content: 'Business Change Request was created'
    });
    
    // Sort timeline by date descending (newest first)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Render the BCR view
    return res.render('bcr/bcrs/details', {
      title: `Business Change Request: ${bcrData.bcrNumber}`,
      bcr: bcrData,
      submission,
      // Pass the full objects to the template instead of just strings
      currentPhase: currentPhaseObj, // Pass phase object instead of string
      currentStatus: currentStatusObj, // Pass status object
      // Keep these for backward compatibility
      currentPhaseName: currentPhase,
      workflowStatus,
      workflowStatusClass,
      workflowProgress,
      allPhases,
      allStatuses,
      // Add associated release details
      associatedRelease,
      associatedAcademicYear,
      // Add timeline data for history section
      timeline,
      // SLA status for the right column
      slaStatus: bcrData.slaStatus || {
        responseStatus: 'on-track',
        resolutionStatus: 'on-track',
        targetResponseDate: new Date(Date.now() + 86400000), // tomorrow
        targetResolutionDate: new Date(Date.now() + 7 * 86400000) // 7 days from now
      },
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    moduleLogger.error('Error in viewBcr controller:', { error: error.message });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the Business Change Request',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Helper function to get a color for a status
 */
function getStatusColor(status) {
  switch (status) {
    case 'Active':
      return 'blue';
    case 'In Progress':
      return 'purple';
    case 'Completed':
      return 'green';
    case 'On Hold':
      return 'yellow';
    case 'Cancelled':
      return 'red';
    default:
      return 'grey';
  }
}

/**
 * View a specific BCR submission
 */
exports.viewSubmission = async (req, res) => {
  try {
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let submission = null;
    
    if (isDbConnected) {
      try {
        // Set a timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching submission details'));
          }, 8000);
        });
        
        // Race the query against the timeout
        submission = await Promise.race([
          bcrModel.getSubmissionById(req.params.id),
          timeoutPromise
        ]);
      } catch (queryError) {
        moduleLogger.error('Error fetching submission details:', { error: queryError.message });
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
    
    res.render('bcr/submissions/view', {
      title: `Submission ${submission.submissionCode}`,
      submission,
      statusTag: getSubmissionStatusTag(submission),
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error in view submission controller:', { error: error.message });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submission details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * List all impact areas
 */
exports.listImpactAreas = async (req, res) => {
  try {
    moduleLogger.info('Retrieving impact areas...');
    const impactAreas = await bcrModel.getAllImpactAreas();
    moduleLogger.info(`Found ${impactAreas.length} impact areas:`, impactAreas);
    
    // Map MongoDB document structure to template structure
    const mappedImpactAreas = [];
    
    for (const area of impactAreas) {
      // Use the name from the database, or extract it from the description if not available
      let areaName = area.name;
      if (!areaName) {
        // If we have a description that matches one of our known areas, use that name
        const descriptions = {
          'Changes to databases, schema design, internal data handling, or system logic.': 'Backend',
          'Updates to UI components, form elements, filters, labels, or layout.': 'Frontend',
          'Creation, modification, or removal of API endpoints or request/response formats.': 'API',
          'Changes to data import/export templates, field order, column definitions.': 'CSV',
          'Additions, updates, or removals of reference data values (e.g., dropdown options).': 'Reference Data',
          'Updates to internal guidance, user manuals, technical specs, or public-facing help.': 'Documentation & Guidance',
          'Changes required due to external policy or legal/regulatory compliance updates.': 'Policy',
          'Modifications impacting funding calculations, eligibility, or reporting models.': 'Funding'
        };
        areaName = descriptions[area.value] || 'Unknown Area';
      }
      
      mappedImpactAreas.push({
        id: area._id,
        name: areaName,
        description: area.value || '',
        displayOrder: area.displayOrder || 0,
        isActive: area.isActive !== undefined ? area.isActive : true,
        bcrCount: 0 // Default to 0 since we don't have this data yet
      });
    }
    
    moduleLogger.info('Mapped impact areas:', mappedImpactAreas);
    
    res.render('impacted-areas/list', {
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
 * Render new impact area form
 */
exports.newImpactAreaForm = async (req, res) => {
  try {
    res.render('impacted-areas/new', {
      title: 'New Impact Area',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error in new impact area form controller:', { error: error.message });
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
    await bcrModel.createImpactArea({
      type: 'impactArea',
      value: req.body.value,
      displayName: req.body.displayName,
      displayOrder: parseInt(req.body.displayOrder, 10) || 0
    });
    
    res.redirect('/bcr/impact-areas/list');
  } catch (error) {
    moduleLogger.error('Error in create impact area controller:', { error: error.message });
    res.status(500).render('bcr/impact-areas/new', {
      title: 'New Impact Area',
      formData: req.body,
      error: 'Failed to create impact area',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * Render edit impact area form
 */
exports.editImpactAreaForm = async (req, res) => {
  try {
    const impactArea = await bcrModel.getConfigById(req.params.id);
    
    if (!impactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested impact area was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('bcr/impact-areas/edit', {
      title: `Edit Impact Area: ${impactArea.displayName || impactArea.value}`,
      impactArea,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    moduleLogger.error('Error in edit impact area form controller:', { error: error.message });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit form',
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
    await bcrModel.updateConfig(req.params.id, {
      value: req.body.value,
      displayName: req.body.displayName,
      displayOrder: parseInt(req.body.displayOrder, 10) || 0
    });
    
    res.redirect('/bcr/impact-areas/list');
  } catch (error) {
    console.error('Error in update impact area controller:', error);
    res.status(500).render('bcr/impact-areas/edit', {
      title: 'Edit Impact Area',
      impactArea: { id: req.params.id, ...req.body },
      error: 'Failed to update impact area',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * Render delete impact area confirmation
 */
exports.deleteImpactAreaConfirm = async (req, res) => {
  try {
    const impactArea = await bcrModel.getConfigById(req.params.id);
    
    if (!impactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested impact area was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('bcr/impact-areas/delete-confirm', {
      title: `Delete Impact Area: ${impactArea.displayName || impactArea.value}`,
      impactArea,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in delete impact area confirm controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the delete confirmation',
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
    await bcrModel.deleteConfig(req.params.id);
    
    res.redirect('/bcr/impact-areas/list');
  } catch (error) {
    console.error('Error in delete impact area controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while trying to delete the impact area',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render the edit submission form
 */
exports.editSubmissionForm = async (req, res) => {
  try {
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let submission = null;
    let impactAreas = [];
    let urgencyLevels = [];
    
    if (isDbConnected) {
      try {
        // Set a timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching submission details'));
          }, 8000);
        });
        
        // Race the query against the timeout
        submission = await Promise.race([
          bcrModel.getSubmissionById(req.params.id),
          timeoutPromise
        ]);
        
        // Get impact areas and urgency levels for form dropdowns
        [impactAreas, urgencyLevels] = await Promise.all([
          bcrModel.getAllImpactAreas(),
          bcrModel.getAllUrgencyLevels()
        ]);
      } catch (queryError) {
        console.error('Error fetching submission details:', queryError);
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
    
    res.render('bcr/submissions/edit', {
      title: `Edit Submission ${submission.submissionCode}`,
      submission,
      impactAreas,
      urgencyLevels,
      statusTag: getSubmissionStatusTag(submission),
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in edit submission form controller:', error);
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
 */
exports.updateSubmission = async (req, res) => {
  try {
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
    
    // Redirect to the submission view page
    res.redirect(`/bcr/submissions/${submissionId}`);
  } catch (error) {
    console.error('Error in update submission controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while updating the submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Helper function to get the appropriate status tag for a submission
 */
function getSubmissionStatusTag(submission) {
  // Use standardized GOV.UK Design System tag colors
  if (!submission.status) {
    return { text: 'Unknown', class: 'govuk-tag govuk-tag--grey' };
  }
  
  switch (submission.status.toLowerCase()) {
    case 'pending':
      return { text: 'Pending', class: 'govuk-tag govuk-tag--blue' };
    case 'approved':
      return { text: 'Approved', class: 'govuk-tag govuk-tag--green' };
    case 'rejected':
      return { text: 'Rejected', class: 'govuk-tag govuk-tag--red' };
    case 'in review':
      return { text: 'In Review', class: 'govuk-tag govuk-tag--purple' };
    case 'implementation':
      return { text: 'Implementation', class: 'govuk-tag govuk-tag--orange' };
    case 'completed':
      return { text: 'Completed', class: 'govuk-tag govuk-tag--green' };
    default:
      return { text: submission.status, class: 'govuk-tag' };
  }
}
