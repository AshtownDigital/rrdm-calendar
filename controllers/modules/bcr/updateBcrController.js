/**
 * BCR Update Controller
 * Handles updating BCR workflow status and phases
 */

console.log('Loading updateBcrController.js...');
const mongoose = require('mongoose');
const bcrModel = require('../../../models/modules/bcr/model');
const workflowService = require('../../../services/modules/bcr/workflowService');
const phaseRulesService = require('../../../services/modules/bcr/phaseRulesService');
const releaseService = require('../../../services/releaseService');
const AcademicYear = require('../../../models/AcademicYear');

/**
 * Render the workflow update form
 */
exports.renderUpdateWorkflowForm = async (req, res) => {
  console.log('renderUpdateWorkflowForm called with params:', req.params);
  try {
    const bcrId = req.params.id;
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let bcr = null;
    let submission = null;
    
    if (isDbConnected) {
      try {
        // Set a timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching BCR details'));
          }, 8000);
        });
        
        // First try to find the ID as a BCR
        console.log('Trying to find BCR with ID:', bcrId);
        bcr = await Promise.race([
          bcrModel.getBcrById(bcrId),
          timeoutPromise
        ]);
        
        // If BCR not found, check if it's a submission ID
        if (!bcr) {
          console.log('BCR not found, checking if it is a submission ID');
          submission = await Promise.race([
            bcrModel.getSubmissionById(bcrId),
            timeoutPromise
          ]);
          
          // If it's a submission with a BCR reference, get the BCR
          if (submission && submission.bcrId) {
            console.log('Found submission with BCR reference:', submission.bcrId);
            bcr = await Promise.race([
              bcrModel.getBcrById(submission.bcrId),
              timeoutPromise
            ]);
          } else if (submission && submission.bcrNumber) {
            // If it's a submission with a BCR number but no BCR ID, try to find the BCR by number
            console.log('Found submission with BCR number:', submission.bcrNumber);
            const bcrs = await Promise.race([
              bcrModel.getAllBcrs({ search: submission.bcrNumber }),
              timeoutPromise
            ]);
            
            if (bcrs && bcrs.length > 0) {
              bcr = bcrs[0];
              console.log('Found BCR by number:', bcr._id);
            }
          }
        }
      } catch (queryError) {
        console.error('Error fetching BCR details:', queryError);
        // Don't rethrow, continue with bcr = null
      }
    }
    
    if (!bcr) {
      // If we couldn't find the BCR due to connection issues or timeout,
      // show a more helpful error page with connection status
      return res.status(404).render('error', {
        title: 'BCR Not Available',
        message: timedOut ? 
          'The request to fetch the BCR timed out. Please try again later.' : 
          (!isDbConnected ? 
            'Database connection issue detected. Please try again when the database is available.' : 
            'The requested BCR was not found'),
        error: {},
        connectionIssue: !isDbConnected,
        timedOut: timedOut,
        user: req.user
      });
    }
    
    // Get all available phases and statuses for the dropdown
    console.log('Fetching phases and statuses...');
    let phases = [];
    let statuses = [];
    
    try {
      phases = await bcrModel.getAllPhases();
      console.log(`Retrieved ${phases.length} phases`);
    } catch (error) {
      console.error('Error fetching phases:', error);
    }
    
    try {
      statuses = await bcrModel.getAllStatuses();
      console.log(`Retrieved ${statuses.length} statuses`);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
    
    // Get the current phase and status
    const currentPhase = bcr.currentPhaseId;
    const currentStatus = bcr.currentStatusId;
    
    console.log('Current phase:', currentPhase ? currentPhase.name : 'None');
    console.log('Current status:', currentStatus ? currentStatus.name : 'None');
    
    // Create an array of available transitions based on the workflow rules
    let availableTransitions = [];
    
    // Get all available phases with their respective statuses
    phases.forEach(phase => {
      // For each phase, we need the statuses that can be transitioned to
      if (phase.statuses && phase.statuses.length > 0) {
        phase.statuses.forEach(statusId => {
          const status = statuses.find(s => s._id.toString() === statusId.toString());
          if (status) {
            // Only include the transition if it's different from the current state
            const isDifferentState = 
              !currentPhase || 
              !currentStatus || 
              phase._id.toString() !== currentPhase._id.toString() || 
              status._id.toString() !== currentStatus._id.toString();
            
            if (isDifferentState) {
              availableTransitions.push({
                id: `${phase._id}_${status._id}`,
                label: `${phase.name} - ${status.name}`,
                phaseId: phase._id,
                statusId: status._id,
                isPrimaryOption: phase.inProgressStatusId && status._id.toString() === phase.inProgressStatusId.toString()
              });
            }
          }
        });
      }
    });
    
    // Sort transitions by phase display order
    availableTransitions.sort((a, b) => {
      const phaseA = phases.find(p => p._id.toString() === a.phaseId.toString());
      const phaseB = phases.find(p => p._id.toString() === b.phaseId.toString());
      
      if (phaseA && phaseB) {
        return phaseA.displayOrder - phaseB.displayOrder;
      }
      return 0;
    });
    
    console.log(`Found ${availableTransitions.length} available transitions`);
    
    // Get any required checklist items for the current phase
    const checklistItems = currentPhase && currentPhase.checklistItems ? currentPhase.checklistItems : [];
    console.log(`Found ${checklistItems.length} checklist items for the current phase`);
    
    // Already completed checklist items
    const completedItems = bcr.completedChecklistItems || [];
    console.log(`BCR has ${completedItems.length} completed checklist items`);
    
    // Get the associated release if there is one
    let associatedRelease = null;
    if (bcr.associatedReleaseId) {
      try {
        console.log('Fetching associated release:', bcr.associatedReleaseId);
        associatedRelease = await releaseService.getById(bcr.associatedReleaseId);
      } catch (error) {
        console.error('Error fetching associated release:', error);
      }
    }
    
    // Render the workflow update form
    res.render('modules/bcr/update-workflow', {
      title: 'Update BCR Workflow',
      bcr,
      phases,
      statuses,
      currentPhase,
      currentStatus,
      availableTransitions,
      checklistItems,
      completedItems,
      associatedRelease,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in renderUpdateWorkflowForm controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the workflow update form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * Process the workflow update
 */
exports.processUpdateWorkflow = async (req, res) => {
  try {
    const bcrId = req.params.id;
    const { 
      updateChoice, 
      transitionId, 
      closureNotes, 
      associatedReleaseId 
    } = req.body;
    
    // Log the request body to help with debugging
    console.log('Processing workflow update with params:', {
      bcrId,
      updateChoice,
      transitionId,
      closureNotes: closureNotes ? '(present)' : '(not provided)',
      associatedReleaseId: associatedReleaseId || '(not provided)'
    });
    
    if (!updateChoice) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'No update choice specified',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // Verify the BCR exists
    const bcr = await bcrModel.getBcrById(bcrId);
    if (!bcr) {
      console.error(`BCR not found with ID: ${bcrId}`);
      return res.status(404).render('error', {
        title: 'Error',
        message: 'The BCR you are trying to update could not be found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    console.log(`Found BCR: ${bcr._id}, current status: ${bcr.status}`);
    
    // If user chose to complete current phase, automatically move to the next phase in sequence
    let phaseId, statusId;
    
    if (updateChoice === 'complete' || !transitionId || transitionId === 'auto') {
      // Get all phases in order
      const allPhases = await bcrModel.getAllPhases();
      allPhases.sort((a, b) => a.displayOrder - b.displayOrder);
      
      // Find the current phase
      const currentPhaseId = bcr.currentPhaseId ? bcr.currentPhaseId._id : null;
      const currentPhaseIndex = allPhases.findIndex(phase => 
        phase._id.toString() === (currentPhaseId ? currentPhaseId.toString() : ''));
      
      // Get the next phase in sequence
      const nextPhaseIndex = currentPhaseIndex + 1;
      if (nextPhaseIndex < allPhases.length) {
        const nextPhase = allPhases[nextPhaseIndex];
        phaseId = nextPhase._id;
        statusId = nextPhase.inProgressStatusId; // Corrected: removed ._id
        console.log(`Automatically moving to next phase: ${nextPhase.name}`);
      } else {
        // If we're at the last phase, stay there but update status to completed
        phaseId = currentPhaseId;
        statusId = bcr.currentPhaseId.completedStatusId; // Corrected: removed ._id
        console.log('Already at last phase, updating to completed status');
      }
    } else {
      // Parse the transition ID to get phaseId and statusId
      [phaseId, statusId] = transitionId.split('_');
      
      if (!phaseId || !statusId) {
        return res.status(400).render('error', {
          title: 'Error',
          message: 'Invalid transition selected',
          error: { status: 400 },
          user: req.user
        });
      }
    }
    
    // Handle checklist items if present in the form submission
    let completedItems = [];
    if (req.body['checklistItems[]']) {
      // Handle both array and single value cases
      if (Array.isArray(req.body['checklistItems[]'])) {
        completedItems = req.body['checklistItems[]'];
      } else {
        completedItems = [req.body['checklistItems[]']];
      }
    }
    
    // Get the current phase name
    const currentBcr = await bcrModel.getBcrById(bcrId);
    const fromPhaseName = currentBcr && currentBcr.currentPhaseId ? currentBcr.currentPhaseId.name : 'Initiation';
    
    // For phase completion, ensure required checklist items are completed
    if (updateChoice === 'complete') {
      // Get the next phase in sequence
      const allPhases = await bcrModel.getAllPhases();
      allPhases.sort((a, b) => a.displayOrder - b.displayOrder);
      
      const currentPhaseIndex = allPhases.findIndex(phase => 
        phase._id.toString() === (bcr.currentPhaseId ? bcr.currentPhaseId._id.toString() : ''));
        
      if (currentPhaseIndex !== -1 && currentPhaseIndex < allPhases.length - 1) {
        const nextPhase = allPhases[currentPhaseIndex + 1];
        const toPhaseName = nextPhase.name;
        
        // Validate the phase transition
        const validation = phaseRulesService.validatePhaseTransition(
          fromPhaseName, 
          toPhaseName, 
          completedItems
        );
        
        // If validation fails, show warning but still allow the update
        if (!validation.success) {
          console.log(`Warning: Missing required checklist items for transition to ${toPhaseName}:`, validation.missingItems);
        }
      }
    }
    
    // Update the BCR phase and status
    await workflowService.updateBcrPhaseStatus(bcrId, phaseId, statusId);
    
    // Get a fresh copy of the BCR with the updated phase and status
    const updatedBcr = await bcrModel.getBcrById(bcrId);
    if (!updatedBcr) {
      throw new Error(`Could not retrieve updated BCR with ID: ${bcrId}`);
    }
    
    // Store the completed checklist items with the BCR
    updatedBcr.completedChecklistItems = completedItems;
    
    // Store the associated release ID if provided
    if (associatedReleaseId) {
      console.log(`Associating BCR with Release ID: ${associatedReleaseId}`);
      updatedBcr.associatedReleaseId = associatedReleaseId;
    }
    
    // Add a workflow history entry
    const historyEntry = {
      date: new Date(),
      action: updateChoice === 'complete' ? 'Phase Completed' : 'Workflow Updated',
      userId: req.user ? req.user.id : null,
      details: closureNotes || `Status updated by ${req.user ? req.user.name || req.user.email : 'system'}`,
      phaseId,
      statusId,
      checklistItems: completedItems
    };
    
    // Update the BCR with the new history entry
    updatedBcr.workflowHistory = updatedBcr.workflowHistory || [];
    updatedBcr.workflowHistory.push(historyEntry);
    await updatedBcr.save();
    
    console.log(`BCR ${bcrId} workflow updated successfully`);
    
    // Redirect to the BCR details page
    res.redirect(`/bcr/business-change-requests/${bcrId}`);
  } catch (error) {
    console.error('Error in processUpdateWorkflow controller:', error);
    console.error('Error stack:', error.stack);
    
    // Check if this is a validation error
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
    }
    
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while updating the BCR workflow',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        details: error.errors || {}
      } : {},
      user: req.user
    });
  }
};

/**
 * Render the BCR update form
 */
exports.renderUpdateForm = async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let bcr = null;
    
    if (isDbConnected) {
      try {
        // Set a timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching BCR details'));
          }, 8000);
        });
        
        // Try to find the BCR
        console.log('Trying to find BCR with ID:', bcrId);
        bcr = await Promise.race([
          bcrModel.getBcrById(bcrId),
          timeoutPromise
        ]);
      } catch (queryError) {
        console.error('Error fetching BCR details:', queryError);
        // Don't rethrow, continue with bcr = null
      }
    }
    
    if (!bcr) {
      // If we couldn't find the BCR due to connection issues or timeout,
      // show a more helpful error page with connection status
      return res.status(404).render('error', {
        title: 'BCR Not Available',
        message: timedOut ? 
          'The request to fetch the BCR timed out. Please try again later.' : 
          (!isDbConnected ? 
            'Database connection issue detected. Please try again when the database is available.' : 
            'The requested BCR was not found'),
        error: {},
        connectionIssue: !isDbConnected,
        timedOut: timedOut,
        user: req.user
      });
    }
    
    // Get all available statuses for the dropdown
    let statuses = [];
    try {
      statuses = await bcrModel.getAllStatuses();
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
    
    // Filter statuses to only include those that are appropriate for the current phase
    let filteredStatuses = [];
    if (bcr.currentPhaseId && bcr.currentPhaseId.statuses) {
      filteredStatuses = statuses.filter(status => 
        bcr.currentPhaseId.statuses.some(s => s.toString() === status._id.toString())
      );
    }
    
    // If no statuses are available for the current phase, just show all statuses
    if (filteredStatuses.length === 0) {
      filteredStatuses = statuses;
    }
    
    // Get the associated release if there is one
    let associatedRelease = null;
    if (bcr.associatedReleaseId) {
      try {
        associatedRelease = await releaseService.getById(bcr.associatedReleaseId);
      } catch (error) {
        console.error('Error fetching associated release:', error);
      }
    }
    
    // Render the update form
    res.render('modules/bcr/update-status', {
      title: 'Update BCR Status',
      bcr,
      statuses: filteredStatuses,
      associatedRelease,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in renderUpdateForm controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the update form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

// Process the BCR status update
exports.processUpdate = async (req, res) => {
  try {
    const bcrId = req.params.id;
    const { statusId, notes } = req.body;
    
    if (!statusId) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'No status selected',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // Verify the BCR exists
    const bcr = await bcrModel.getBcrById(bcrId);
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'The BCR you are trying to update could not be found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    // Update the BCR status (keep the same phase)
    const phaseId = bcr.currentPhaseId ? bcr.currentPhaseId._id : null;
    await workflowService.updateBcrPhaseStatus(bcrId, phaseId, statusId);
    
    // Get a fresh copy of the BCR with the updated status
    const updatedBcr = await bcrModel.getBcrById(bcrId);
    if (!updatedBcr) {
      throw new Error(`Could not retrieve updated BCR with ID: ${bcrId}`);
    }
    
    // Add a status update history entry
    const historyEntry = {
      date: new Date(),
      action: 'Status Updated',
      userId: req.user ? req.user.id : null,
      details: notes || `Status updated by ${req.user ? req.user.name || req.user.email : 'system'}`,
      statusId
    };
    
    // Update the BCR with the new history entry
    updatedBcr.workflowHistory = updatedBcr.workflowHistory || [];
    updatedBcr.workflowHistory.push(historyEntry);
    await updatedBcr.save();
    
    // Redirect to the BCR details page
    res.redirect(`/bcr/business-change-requests/${bcrId}`);
  } catch (error) {
    console.error('Error in processUpdate controller:', error);
    
    // Check if this is a validation error
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
    }
    
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while updating the BCR status',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        details: error.errors || {}
      } : {},
      user: req.user
    });
  }
};
