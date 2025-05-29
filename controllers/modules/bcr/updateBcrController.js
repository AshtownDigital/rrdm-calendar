/**
 * BCR Update Controller
 * Handles updating BCR workflow status and phases
 */

console.log('Loading updateBcrController.js...');
const mongoose = require('mongoose');
const bcrModel = require('../../../models/modules/bcr/model');
const workflowService = require('../../../services/modules/bcr/workflowService');

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
    
    // Format BCR for display
    const formattedBcr = {
      id: bcr._id || bcr.id,
      bcrNumber: bcr.bcrNumber || 'N/A',
      submissionCode: bcr.submissionId ? bcr.submissionId.submissionCode : 'N/A',
      briefDescription: bcr.title || (bcr.submissionId ? bcr.submissionId.briefDescription : 'No description provided'),
      currentPhase: bcr.currentPhaseId ? bcr.currentPhaseId.name : 'Unknown Phase',
      currentPhaseId: bcr.currentPhaseId ? bcr.currentPhaseId._id : null,
      currentStatusId: bcr.currentStatusId ? bcr.currentStatusId._id : null,
      displayStatus: bcr.status || 'Unknown Status',
      statusClass: bcr.currentStatusId && bcr.currentStatusId.color ? 
        `govuk-tag govuk-tag--${bcr.currentStatusId.color}` : 'govuk-tag',
      workflowHistory: bcr.workflowHistory || []
    };
    
    // Render the update workflow form
    console.log('Attempting to render update-workflow template...');
    console.log('Template path: modules/bcr/bcrs/update-workflow');
    console.log('BCR data:', formattedBcr);
    
    try {
      res.render('modules/bcr/bcrs/update-workflow', {
        title: `Update Workflow for BCR ${formattedBcr.bcrNumber}`,
        bcr: formattedBcr,
        phases: phases,
        statuses: statuses,
        csrfToken: req.csrfToken ? req.csrfToken() : '',
        user: req.user
      });
      console.log('Template rendered successfully');
    } catch (renderError) {
      console.error('Error rendering template:', renderError);
      // Fall back to a simple response
      res.send(`
        <html>
          <head><title>BCR Update Workflow</title></head>
          <body>
            <h1>BCR Update Workflow</h1>
            <p>BCR ID: ${bcrId}</p>
            <p>BCR Number: ${formattedBcr.bcrNumber}</p>
            <p>There was an error rendering the update workflow form.</p>
            <a href="/bcr/bcr-view/${bcrId}">Back to BCR View</a>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error in renderUpdateWorkflowForm controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the update workflow form',
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
    console.log('Processing workflow update with body:', JSON.stringify(req.body));
    const bcrId = req.params.id;
    const { phaseId, statusId, comments } = req.body;
    
    console.log(`Update data: bcrId=${bcrId}, phaseId=${phaseId}, statusId=${statusId}, comments=${comments}`);
    
    // Check if the BCR exists before trying to update it
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
    
    if (!phaseId || !statusId) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'Please select both a phase and a status',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // Update the BCR phase and status
    await bcrModel.updateBcrPhaseStatus(bcrId, phaseId, statusId);
    
    // Add a workflow history entry
    const historyEntry = {
      date: new Date(),
      action: 'Workflow Updated',
      userId: req.user ? req.user.id : null,
      details: comments || 'No comments provided',
      phaseId,
      statusId
    };
    
    // Update the BCR with the new history entry
    bcr.workflowHistory = bcr.workflowHistory || [];
    bcr.workflowHistory.push(historyEntry);
    await bcr.save();
    
    console.log(`BCR ${bcrId} workflow updated successfully`);
    
    // Redirect to the BCR detailed view
    res.redirect(`/bcr/bcr-view/${bcrId}`);
  } catch (error) {
    console.error('Error in processUpdateWorkflow controller:', error);
    console.error('Error stack:', error.stack);
    
    // Check if this is a validation error
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
    }
    
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while updating the workflow',
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
  console.log('renderUpdateForm called with params:', req.params);
  try {
    const bcrId = req.params.id;
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let bcr = null;
    let availableTransitions = [];
    
    if (isDbConnected) {
      try {
        // Set a timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching BCR details'));
          }, 8000);
        });
        
        // Race the query against the timeout
        bcr = await Promise.race([
          bcrModel.getBcrById(bcrId),
          timeoutPromise
        ]);
        
        // Get available workflow transitions for this BCR
        if (bcr) {
          availableTransitions = await workflowService.getAvailableTransitions(bcrId);
          
          // Add unique IDs to transitions for form handling
          availableTransitions = availableTransitions.map((transition, index) => ({
            ...transition,
            id: `${transition.phaseId}_${transition.statusId}`
          }));
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
    
    // Format BCR for display
    const formattedBcr = {
      id: bcr._id || bcr.id,
      bcrNumber: bcr.bcrNumber || 'N/A',
      submissionCode: bcr.submissionId ? bcr.submissionId.submissionCode : 'N/A',
      briefDescription: bcr.title || (bcr.submissionId ? bcr.submissionId.briefDescription : 'No description provided'),
      currentPhase: bcr.currentPhaseId ? bcr.currentPhaseId.name : 'Unknown Phase',
      displayStatus: bcr.status || 'Unknown Status',
      statusClass: bcr.currentStatusId && bcr.currentStatusId.color ? 
        `govuk-tag govuk-tag--${bcr.currentStatusId.color}` : 'govuk-tag',
      workflowHistory: bcr.workflowHistory || []
    };
    
    // For debugging, let's try a simpler response first
    console.log('About to render update template');
    
    // Try rendering a simple response first to test if the route works
    return res.send(`
      <html>
        <head><title>BCR Update Test</title></head>
        <body>
          <h1>BCR Update Test</h1>
          <p>BCR ID: ${bcrId}</p>
          <p>This is a test page for the BCR update functionality.</p>
          <form action="/bcr/business-change-requests/${bcrId}/update" method="post">
            <input type="hidden" name="_csrf" value="${req.csrfToken ? req.csrfToken() : ''}">
            <button type="submit">Test Update</button>
          </form>
        </body>
      </html>
    `);
    
    /* Commented out for debugging
    res.render('modules/bcr/bcrs/update', {
      title: `Update BCR ${bcr.bcrNumber}`,
      bcr: formattedBcr,
      availableTransitions,
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
    */
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

/**
 * Process the BCR workflow update
 */
exports.processUpdate = async (req, res) => {
  try {
    console.log('Processing BCR workflow update with body:', JSON.stringify(req.body));
    const bcrId = req.params.id;
    const { transitionId, comments } = req.body;
    
    console.log(`Update data: bcrId=${bcrId}, transitionId=${transitionId}, comments=${comments}`);
    
    // Check if the BCR exists before trying to update it
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
    
    // Parse the transition ID to get phaseId and statusId
    const [phaseId, statusId] = transitionId.split('_');
    
    if (!phaseId || !statusId) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'Invalid transition selected',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // Update the BCR phase and status
    await workflowService.updateBcrPhaseStatus(bcrId, phaseId, statusId);
    
    // Add a workflow history entry
    const historyEntry = {
      date: new Date(),
      action: 'Workflow Updated',
      userId: req.user ? req.user.id : null,
      details: comments || 'No comments provided',
      phaseId,
      statusId
    };
    
    // Update the BCR with the new history entry
    bcr.workflowHistory = bcr.workflowHistory || [];
    bcr.workflowHistory.push(historyEntry);
    await bcr.save();
    
    console.log(`BCR ${bcrId} workflow updated successfully`);
    
    // Redirect to the BCR details page
    res.redirect(`/bcr/business-change-requests/${bcrId}`);
  } catch (error) {
    console.error('Error in processUpdate controller:', error);
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
