/**
 * BCR View Controller
 * Handles viewing and displaying BCR details and workflow progress
 */

const mongoose = require('mongoose');
const bcrModel = require('../../../../models/modules/bcr/model');
const workflowService = require('../../../../services/modules/bcr/workflowService');
const { createModuleLogger } = require('../../../../services/shared/loggerService');
const Submission = require('../../../../models/Submission');

// Create module-specific logger
const logger = createModuleLogger('viewController');

/**
 * View a specific Business Change Request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.viewBcr = async (req, res) => {
  try {
    const id = req.params.id;
    logger.info('Viewing BCR details', { userId: req.user?.id, bcrId: id });
    
    // Check if the ID is a valid MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      logger.warn('Invalid BCR ID format', { userId: req.user?.id, bcrId: id });
      return res.status(400).render('error', {
        title: 'Invalid Request',
        message: 'The provided ID is not valid',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
      logger.warn('Database connection issue detected', { userId: req.user?.id });
      return res.status(503).render('error', {
        title: 'Service Temporarily Unavailable',
        message: 'Database connection issue detected. Please try again later.',
        error: { status: 503 },
        connectionIssue: true,
        user: req.user
      });
    }
    
    // First try to find the ID as a BCR
    let bcr = await bcrModel.getBcrById(id);
    let submission = null;
    
    // If not found as a BCR, check if it's a submission ID
    if (!bcr) {
      logger.debug('BCR not found directly, checking if it\'s a submission ID', { userId: req.user?.id, submissionId: id });
      submission = await bcrModel.getSubmissionById(id);
      
      if (submission && submission.bcrId) {
        // If it's a submission with a BCR ID, get the BCR
        logger.debug('Found submission with BCR ID', { 
          userId: req.user?.id, 
          submissionId: id, 
          bcrId: submission.bcrId 
        });
        bcr = await bcrModel.getBcrById(submission.bcrId);
      } else if (submission && submission.bcrNumber) {
        // If it's a submission with a BCR number but no BCR ID, try to find the BCR by other means
        logger.debug('Found submission with BCR number but no BCR ID', { 
          userId: req.user?.id, 
          submissionId: id, 
          bcrNumber: submission.bcrNumber 
        });
        const bcrs = await bcrModel.getAllBcrs({ search: submission.bcrNumber });
        if (bcrs && bcrs.length > 0) {
          bcr = bcrs[0];
        }
      }
      
      // If we still couldn't find a BCR, create a simple BCR object from the submission
      if (!bcr && submission) {
        logger.info('Creating temporary BCR object from submission data', { 
          userId: req.user?.id, 
          submissionId: id 
        });
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
        logger.warn('BCR or submission not found', { userId: req.user?.id, bcrId: id });
        return res.redirect('/bcr/business-change-requests');
      }
    } else if (bcr.submissionId) {
      // If we found the BCR directly, get its associated submission
      logger.debug('Found BCR directly, fetching associated submission', { 
        userId: req.user?.id, 
        bcrId: id, 
        submissionId: bcr.submissionId 
      });
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
          currentPhase = phase.name;
          logger.debug('Fetched current phase', { 
            userId: req.user?.id, 
            bcrId: id, 
            phaseId: bcr.currentPhaseId, 
            phaseName: currentPhase 
          });
        }
      } catch (error) {
        logger.error('Error fetching current phase', error, { 
          userId: req.user?.id, 
          bcrId: id, 
          phaseId: bcr.currentPhaseId 
        });
      }
    }
    
    if (bcr.currentStatusId) {
      try {
        // Get the current status
        const status = await workflowService.getStatusById(bcr.currentStatusId);
        if (status) {
          currentStatusObj = status;
          workflowStatus = status.name;
          logger.debug('Fetched current status', { 
            userId: req.user?.id, 
            bcrId: id, 
            statusId: bcr.currentStatusId, 
            statusName: workflowStatus 
          });
        }
      } catch (error) {
        logger.error('Error fetching current status', error, { 
          userId: req.user?.id, 
          bcrId: id, 
          statusId: bcr.currentStatusId 
        });
      }
    } else if (bcr.workflowStatus) {
      // If we have a workflowStatus field but no currentStatusId, use that
      workflowStatus = bcr.workflowStatus;
      logger.debug('Using workflowStatus field', { 
        userId: req.user?.id, 
        bcrId: id, 
        workflowStatus 
      });
    }
    
    // Get the status tag styling
    const statusTag = workflowService.getStatusTag(currentStatusObj || { name: workflowStatus });
    workflowStatusClass = statusTag.class;
    
    // Prepare BCR data for the view
    const bcrData = {
      ...bcr._doc || bcr,
      bcrNumber: bcr.bcrCode || bcr.bcrNumber || `BCR-${bcr.recordNumber || 'Unknown'}`,
      title: submission ? submission.briefDescription : (bcr.title || 'No title available'),
      description: submission ? submission.justification : (bcr.description || 'No description available')
    };
    
    // Fetch release details if a release is associated with this BCR
    let associatedRelease = null;
    let associatedAcademicYear = null;
    
    if (bcr.releaseId) {
      try {
        // This would need to be implemented based on your release model
        // associatedRelease = await releaseService.getReleaseById(bcr.releaseId);
        logger.debug('BCR has associated release', { 
          userId: req.user?.id, 
          bcrId: id, 
          releaseId: bcr.releaseId 
        });
      } catch (error) {
        logger.error('Error fetching associated release', error, { 
          userId: req.user?.id, 
          bcrId: id, 
          releaseId: bcr.releaseId 
        });
      }
    }
    
    if (bcr.academicYearId) {
      try {
        // This would need to be implemented based on your academic year model
        // associatedAcademicYear = await academicYearService.getAcademicYearById(bcr.academicYearId);
        logger.debug('BCR has associated academic year', { 
          userId: req.user?.id, 
          bcrId: id, 
          academicYearId: bcr.academicYearId 
        });
      } catch (error) {
        logger.error('Error fetching associated academic year', error, { 
          userId: req.user?.id, 
          bcrId: id, 
          academicYearId: bcr.academicYearId 
        });
      }
    }
    
    // Fetch workflow history
    let workflowHistory = [];
    try {
      workflowHistory = await workflowService.getWorkflowHistoryForBcr(id);
      logger.debug('Fetched workflow history', { 
        userId: req.user?.id, 
        bcrId: id, 
        historyCount: workflowHistory.length 
      });
    } catch (error) {
      logger.error('Error fetching workflow history', error, { 
        userId: req.user?.id, 
        bcrId: id 
      });
    }
    
    // Fetch impact areas
    let impactAreas = [];
    try {
      impactAreas = await bcrModel.getAllImpactAreas();
    } catch (error) {
      logger.error('Error fetching impact areas', error, { userId: req.user?.id });
    }
    
    logger.info('BCR view loaded successfully', { 
      userId: req.user?.id, 
      bcrId: id, 
      bcrNumber: bcrData.bcrNumber 
    });
    
    // Render the BCR view using the modular template
    res.render('bcr/view-modular', {
      title: `BCR ${bcrData.bcrNumber}`,
      bcr: bcrData,
      submission,
      currentPhase,
      workflowStatus,
      workflowStatusClass,
      workflowHistory,
      impactAreas,
      associatedRelease,
      associatedAcademicYear,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    logger.error('Error viewing BCR details', error, { 
      userId: req.user?.id, 
      bcrId: req.params.id 
    });
    
    return res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while viewing the BCR details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * List all approved BCRs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.listApprovedBcrs = async (req, res) => {
  try {
    logger.info('Listing approved BCRs', { userId: req.user?.id, filters: req.query });
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let bcrs = [];
    let timedOut = false;
    
    if (isDbConnected) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching approved BCRs'));
          }, 8000);
        });
        
        // Get approved BCRs with optional filtering
        bcrs = await Promise.race([
          bcrModel.getApprovedBcrs(req.query),
          timeoutPromise
        ]);
        
        logger.debug('Retrieved approved BCRs', { 
          userId: req.user?.id, 
          count: bcrs.length 
        });
      } catch (error) {
        logger.error('Error fetching approved BCRs', error, { userId: req.user?.id });
        // Continue with empty array
      }
    } else {
      logger.warn('Database connection issue detected', { userId: req.user?.id });
    }
    
    // Format BCRs for display
    const formattedBcrs = Array.isArray(bcrs) ? bcrs.map(bcr => ({
      id: bcr._id,
      bcrNumber: bcr.bcrNumber || 'N/A',
      title: bcr.title || 'No title available',
      status: bcr.status || 'Approved',
      statusClass: workflowService.getStatusTag({ name: bcr.status || 'Approved' }).class,
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
        }) : 'Unknown'
    })) : [];
    
    logger.info('Approved BCRs list loaded successfully', { 
      userId: req.user?.id, 
      count: formattedBcrs.length 
    });
    
    // Render the approved BCRs list view
    res.render('bcr/bcrs/list', {
      title: 'Approved Business Change Requests',
      bcrs: formattedBcrs,
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      user: req.user
    });
  } catch (error) {
    logger.error('Error listing approved BCRs', error, { userId: req.user?.id });
    
    return res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the approved BCRs list',
      error: process.env.NODE_ENV === 'development' ? error : {},
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
    logger.info('Viewing workflow progress', { userId: req.user?.id, bcrId: id });
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
      logger.warn('Database connection issue detected', { userId: req.user?.id });
      return res.status(503).render('error', {
        title: 'Service Temporarily Unavailable',
        message: 'Database connection issue detected. Please try again later.',
        error: { status: 503 },
        connectionIssue: true,
        user: req.user
      });
    }
    
    // Get the BCR data
    const bcr = await bcrModel.getBcrById(id);
    if (!bcr) {
      logger.warn('BCR not found for workflow progress view', { userId: req.user?.id, bcrId: id });
      req.flash('error', 'BCR not found');
      return res.redirect('/bcr/business-change-requests');
    }
    
    logger.debug('Found BCR for workflow progress', { 
      userId: req.user?.id, 
      bcrId: id, 
      bcrNumber: bcr.bcrNumber 
    });
    
    // Get the submission data if available
    let submission = null;
    if (bcr.submissionId) {
      try {
        submission = await Submission.findById(bcr.submissionId);
        logger.debug('Found submission for BCR', { 
          userId: req.user?.id, 
          bcrId: id, 
          submissionId: bcr.submissionId 
        });
      } catch (submissionError) {
        logger.error('Error fetching submission for BCR', submissionError, { 
          userId: req.user?.id, 
          bcrId: id, 
          submissionId: bcr.submissionId 
        });
      }
    }
    
    // Get the current phase and status
    let phase = null;
    let status = null;
    
    try {
      phase = await workflowService.getPhaseById(bcr.currentPhaseId);
      logger.debug('Fetched current phase for workflow progress', { 
        userId: req.user?.id, 
        bcrId: id, 
        phaseId: bcr.currentPhaseId, 
        phaseName: phase?.name 
      });
    } catch (phaseError) {
      logger.error('Error fetching phase for workflow progress', phaseError, { 
        userId: req.user?.id, 
        bcrId: id, 
        phaseId: bcr.currentPhaseId 
      });
    }
    
    try {
      status = await workflowService.getStatusById(bcr.currentStatusId);
      logger.debug('Fetched current status for workflow progress', { 
        userId: req.user?.id, 
        bcrId: id, 
        statusId: bcr.currentStatusId, 
        statusName: status?.name 
      });
    } catch (statusError) {
      logger.error('Error fetching status for workflow progress', statusError, { 
        userId: req.user?.id, 
        bcrId: id, 
        statusId: bcr.currentStatusId 
      });
    }
    
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
    let allPhases = [];
    try {
      allPhases = await bcrModel.getAllPhases();
      logger.debug('Fetched all phases for workflow visualization', { 
        userId: req.user?.id, 
        bcrId: id, 
        phaseCount: allPhases.length 
      });
    } catch (phasesError) {
      logger.error('Error fetching all phases', phasesError, { 
        userId: req.user?.id, 
        bcrId: id 
      });
    }
    
    // Get all statuses for the timeline
    let allStatuses = [];
    try {
      allStatuses = await bcrModel.getAllStatuses();
      logger.debug('Fetched all statuses for workflow timeline', { 
        userId: req.user?.id, 
        bcrId: id, 
        statusCount: allStatuses.length 
      });
    } catch (statusesError) {
      logger.error('Error fetching all statuses', statusesError, { 
        userId: req.user?.id, 
        bcrId: id 
      });
    }
    
    // Create a simple workflow visualization
    const workflowProgress = [];
    
    // Sort phases by display order
    allPhases.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Get the current phase if available
    let currentPhaseIndex = null;
    if (bcr.currentPhaseId) {
      currentPhaseIndex = allPhases.findIndex(phase => 
        phase._id.toString() === bcr.currentPhaseId.toString());
    }
    
    // Get the initial phase for the BCR creation event in the timeline
    let initialPhase = 'Initial Phase';
    if (allPhases.length > 0) {
      initialPhase = allPhases[0].name;
    }
    
    // Create the workflow progress data
    for (let i = 0; i < allPhases.length; i++) {
      const phaseItem = allPhases[i];
      const isCurrentPhase = i === currentPhaseIndex;
      const isCompleted = i < currentPhaseIndex;
      
      workflowProgress.push({
        id: phaseItem._id,
        name: phaseItem.name,
        displayOrder: phaseItem.displayOrder,
        status: isCompleted ? 'Completed' : (isCurrentPhase ? 'In Progress' : 'Not Started'),
        statusClass: isCompleted ? 'govuk-tag--green' : (isCurrentPhase ? 'govuk-tag--blue' : 'govuk-tag--grey')
      });
    }
    
    logger.info('Workflow progress view loaded successfully', { 
      userId: req.user?.id, 
      bcrId: id, 
      bcrNumber: bcrData.bcrNumber, 
      currentPhase, 
      workflowStatus 
    });
    
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
    logger.error('Error viewing workflow progress', error, { 
      userId: req.user?.id, 
      bcrId: req.params.id 
    });
    
    // Handle error without using flash if it's not available
    return res.status(500).render('error', {
      message: 'An error occurred while viewing the workflow progress',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};
