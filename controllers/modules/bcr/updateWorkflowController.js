/**
 * BCR Update Workflow Controller
 * Handles updating BCR workflow status and phases
 */

const mongoose = require('mongoose');
const bcrModel = require('../../../models/modules/bcr/model');
const workflowService = require('../../../services/modules/bcr/workflowService');

/**
 * Render the update workflow form
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
    
    // If we found a submission but no BCR, create a temporary BCR object from the submission data
    if (!bcr && submission) {
      console.log('Creating temporary BCR object from submission data');
      bcr = {
        _id: submission._id,
        id: submission._id,
        bcrNumber: submission.bcrNumber || 'BCR-Unknown',
        title: submission.briefDescription || 'No title available',
        description: submission.justification || 'No description available',
        status: submission.status || 'Approved',
        submissionId: submission._id,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        workflowHistory: []
      };
    }
    
    // If we still don't have a BCR, show an error page
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'BCR Not Available',
        message: timedOut ? 
          'The request to fetch the BCR timed out. Please try again later.' : 
          (!isDbConnected ? 
            'Database connection issue detected. Please try again when the database is available.' : 
            'The requested BCR or submission was not found'),
        error: {},
        connectionIssue: !isDbConnected,
        timedOut: timedOut,
        user: req.user
      });
    }
    
    // Get all available phases and statuses for the dropdown using the workflowService
    console.log('Fetching phases and statuses from workflowService...');
    let phases = [];
    let statuses = [];
    
    // Get the current phase and status information
    let currentPhase = null;
    let currentStatus = null;
    
    if (bcr.currentPhaseId) {
      try {
        currentPhase = await workflowService.getPhaseById(bcr.currentPhaseId);
        console.log('Current phase:', currentPhase ? currentPhase.name : 'Not found');
      } catch (error) {
        console.error('Error fetching current phase:', error);
      }
    }
    
    if (bcr.currentStatusId) {
      try {
        currentStatus = await workflowService.getStatusById(bcr.currentStatusId);
        console.log('Current status:', currentStatus ? currentStatus.name : 'Not found');
      } catch (error) {
        console.error('Error fetching current status:', error);
      }
    }
    
    try {
      phases = await workflowService.getAllPhases();
      console.log(`Retrieved ${phases.length} phases from workflowService`);
      statuses = await workflowService.getAllStatuses();
      console.log(`Retrieved ${statuses.length} statuses from workflowService`);
      
      // Filter out completed phases if we have a current phase
      if (currentPhase) {
        // Get the current phase's display order
        const currentDisplayOrder = currentPhase.displayOrder;
        
        // Filter phases to only show uncompleted ones (phases with displayOrder >= current phase's displayOrder)
        phases = phases.filter(phase => phase.displayOrder >= currentDisplayOrder);
        console.log(`Filtered to ${phases.length} uncompleted phases`);
        
        // Get the next phase (the one after the current phase)
        const nextPhase = await workflowService.getNextPhase(currentPhase._id);
        if (nextPhase) {
          console.log(`Next phase identified: ${nextPhase.name}`);
          // Mark the next phase for indentation in the UI
          nextPhase.isNextPhase = true;
        }
      }
    } catch (serviceError) {
      console.error('Error fetching phases and statuses:', serviceError);
      // Continue with empty arrays
    }
    
    // Prepare display values for the current phase and status
    const currentPhaseDisplay = currentPhase ? currentPhase.name : 'Not set';
    const currentStatusDisplay = currentStatus ? currentStatus.name : 'Not set';
    
    // Get status tag class for styling
    const statusTag = workflowService.getStatusTag(currentStatus || { name: 'Not set' });
    
    // Format BCR for display
    const formattedBcr = {
      id: bcr._id || bcr.id,
      bcrNumber: bcr.bcrNumber || 'N/A',
      submissionCode: bcr.submissionId ? bcr.submissionId.submissionCode : 'N/A',
      briefDescription: bcr.title || (bcr.submissionId ? bcr.submissionId.briefDescription : 'No description provided'),
      currentPhase: currentPhaseDisplay,
      currentPhaseId: bcr.currentPhaseId,
      currentStatusId: bcr.currentStatusId,
      displayStatus: currentStatusDisplay,
      statusClass: statusTag.class,
      workflowHistory: bcr.workflowHistory || []
    };
    
    // Render the update workflow form
    console.log('Attempting to render update-workflow template...');
    console.log('Template path: modules/bcr/bcrs/update-workflow');
    console.log('BCR data:', formattedBcr);
    
    // Create a mapping of phase IDs to their associated statuses for client-side use
    const phaseStatusMapping = {};
    const phaseOrderMapping = {};
    const currentPhaseOrder = currentPhase ? currentPhase.displayOrder : 0;
    
    phases.forEach(phase => {
      if (phase.inProgressStatusId) {
        const status = statuses.find(s => s._id.toString() === phase.inProgressStatusId.toString());
        if (status) {
          phaseStatusMapping[phase._id] = {
            id: status._id,
            name: status.name,
            color: status.color || 'blue'
          };
          
          // Add display order information for client-side validation
          phaseOrderMapping[phase._id] = {
            order: phase.displayOrder,
            name: phase.name,
            isNextPhase: phase.isNextPhase || false,
            requiresCompletion: phase.displayOrder > currentPhaseOrder + 1 // Requires completion of intermediate phases
          };
        }
      }
    });

    // For testing, use a simple HTML response first
    res.send(`
      <html>
        <head>
          <title>Update Workflow for BCR ${formattedBcr.bcrNumber}</title>
          <link rel="stylesheet" href="/stylesheets/govuk-frontend.min.css">
          <script src="/scripts/govuk-frontend.min.js"></script>
          <style>
            .status-mapping-info {
              background-color: #f3f2f1;
              padding: 15px;
              margin-bottom: 20px;
              border-left: 5px solid #1d70b8;
            }
            .status-preview {
              display: none;
              margin-top: 15px;
              padding: 15px;
              background-color: #f8f8f8;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .status-preview.visible, .warning-preview.visible {
              display: block;
            }
            .warning-preview {
              display: none;
              margin-top: 15px;
              padding: 15px;
              background-color: #fff4f4;
              border-left: 5px solid #d4351c;
              border-radius: 4px;
            }
          </style>
        </head>
        <body class="govuk-template__body">
          <div class="govuk-width-container">
            <main class="govuk-main-wrapper" id="main-content">
              <h1 class="govuk-heading-xl">Update Workflow for BCR ${formattedBcr.bcrNumber}</h1>
              
              <div class="govuk-grid-row">
                <div class="govuk-grid-column-full">
                  <p class="govuk-body">${formattedBcr.briefDescription}</p>
                  
                  <div class="govuk-inset-text">
                    <h2 class="govuk-heading-m">Current Workflow Phase</h2>
                    <p class="govuk-body">
                      <strong class="govuk-tag govuk-tag--blue">${formattedBcr.currentPhase}</strong>
                    </p>
                  </div>
                  
                  <div class="govuk-inset-text">
                    <h2 class="govuk-heading-m">Current Workflow Status</h2>
                    <p class="govuk-body">
                      <strong class="${formattedBcr.statusClass}">${formattedBcr.displayStatus}</strong>
                    </p>
                  </div>
                  
                  <div class="status-mapping-info">
                    <h2 class="govuk-heading-s">Automatic Status Mapping</h2>
                    <p class="govuk-body">When you select a workflow phase, the corresponding status will be automatically assigned.</p>
                  </div>
                  
                  <form action="/bcr/business-change-requests/${formattedBcr.id}/update-workflow" method="post" class="govuk-form-group">
                    <input type="hidden" name="_csrf" value="${req.csrfToken ? req.csrfToken() : ''}">
                    <div class="govuk-form-group">
                      <label class="govuk-label" for="phase">
                        Select Workflow Phase
                      </label>
                      <select class="govuk-select" id="phase" name="phaseId" onchange="updateStatusPreview(this.value)">
                        <option value="">Please select a phase</option>
                        ${phases.map(phase => `<option value="${phase._id}">${phase.isNextPhase ? '→ ' : ''}${phase.name}</option>`).join('')}
                      </select>
                    </div>
                    
                    <!-- Status preview section -->
                    <div id="status-preview" class="status-preview">
                      <h3 class="govuk-heading-s">This will update the status to:</h3>
                      <p class="govuk-body">
                        <strong id="status-tag" class="govuk-tag"></strong>
                      </p>
                    </div>
                    
                    <!-- Warning preview section -->
                    <div id="warning-preview" class="warning-preview">
                      <div class="govuk-warning-text">
                        <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
                        <strong class="govuk-warning-text__text">
                          <span class="govuk-warning-text__assistive">Warning</span>
                          The following phases will be automatically completed:
                        </strong>
                      </div>
                      <ul class="govuk-list govuk-list--bullet" id="phases-to-complete"></ul>
                      <p class="govuk-body">Each phase will be marked as completed with an automatic comment.</p>
                    </div>
                    
                    <div class="govuk-form-group">
                      <label class="govuk-label" for="comments">
                        Comments
                      </label>
                      <textarea class="govuk-textarea" id="comments" name="comments" rows="5" placeholder="Add any comments about this workflow update"></textarea>
                    </div>
                    
                    <div class="govuk-button-group">
                      <button type="submit" class="govuk-button">Save Changes</button>
                      <a href="/bcr/bcr-view/${formattedBcr.id}" class="govuk-button govuk-button--secondary">Cancel</a>
                    </div>
                  </form>
                  
                  <script>
                    // Phase to status mapping data from the server
                    const phaseStatusMapping = ${JSON.stringify(phaseStatusMapping)};
                    // Phase order mapping for validation
                    const phaseOrderMapping = ${JSON.stringify(phaseOrderMapping)};
                    // Current phase information
                    const currentPhaseId = "${bcr.currentPhaseId || ''}";
                    
                    // Function to update the status preview when a phase is selected
                    function updateStatusPreview(phaseId) {
                      const statusPreview = document.getElementById('status-preview');
                      const warningPreview = document.getElementById('warning-preview');
                      const statusTag = document.getElementById('status-tag');
                      const phasesList = document.getElementById('phases-to-complete');
                      
                      if (phaseId && phaseStatusMapping[phaseId]) {
                        const status = phaseStatusMapping[phaseId];
                        statusTag.textContent = status.name;
                        statusTag.className = 'govuk-tag govuk-tag--' + status.color;
                        statusPreview.classList.add('visible');
                        
                        // Check if this is a non-sequential phase selection
                        if (phaseOrderMapping[phaseId] && phaseOrderMapping[phaseId].requiresCompletion) {
                          // Find all phases that would be auto-completed
                          const phasesToComplete = [];
                          for (const id in phaseOrderMapping) {
                            if (phaseOrderMapping[id].order > phaseOrderMapping[currentPhaseId].order && 
                                phaseOrderMapping[id].order < phaseOrderMapping[phaseId].order) {
                              phasesToComplete.push(phaseOrderMapping[id].name);
                            }
                          }
                          
                          if (phasesToComplete.length > 0) {
                            // Show warning about auto-completing phases
                            phasesList.innerHTML = phasesToComplete.map(name => '<li>' + name + '</li>').join('');
                            warningPreview.classList.add('visible');
                            
                            // Add a hidden input to indicate auto-completion
                            const form = document.querySelector('form');
                            let autoCompleteInput = document.getElementById('auto-complete-phases');
                            if (!autoCompleteInput) {
                              autoCompleteInput = document.createElement('input');
                              autoCompleteInput.type = 'hidden';
                              autoCompleteInput.name = 'autoCompletePhases';
                              autoCompleteInput.id = 'auto-complete-phases';
                              form.appendChild(autoCompleteInput);
                            }
                            autoCompleteInput.value = 'true';
                          } else {
                            warningPreview.classList.remove('visible');
                          }
                        } else {
                          warningPreview.classList.remove('visible');
                        }
                      } else {
                        statusPreview.classList.remove('visible');
                        warningPreview.classList.remove('visible');
                      }
                    }
                    
                    // Initialize the GOV.UK frontend
                    window.GOVUKFrontend.initAll();
                  </script>
                </div>
              </div>
            </main>
          </div>
        </body>
      </html>
    `);
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
    const { phaseId, comments, autoCompletePhases } = req.body;
    
    console.log(`Update data: bcrId=${bcrId}, phaseId=${phaseId}, comments=${comments}, autoCompletePhases=${autoCompletePhases}`);
    
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
    
    if (!phaseId) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'Please select a workflow phase',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // Get the phase to determine the appropriate status
    const phase = await workflowService.getPhaseById(phaseId);
    if (!phase) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'The selected phase could not be found',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // Check if we need to auto-complete phases
    if (autoCompletePhases === 'true' && bcr.currentPhaseId) {
      // Get current phase to determine which phases need to be auto-completed
      const currentPhase = await workflowService.getPhaseById(bcr.currentPhaseId);
      if (currentPhase && phase.displayOrder > currentPhase.displayOrder + 1) {
        console.log('Auto-completing intermediate phases');
        
        // Get all phases in order
        const allPhases = await workflowService.getAllPhases();
        
        // Find phases that need to be auto-completed (between current and selected)
        const phasesToComplete = allPhases.filter(p => 
          p.displayOrder > currentPhase.displayOrder && 
          p.displayOrder < phase.displayOrder
        );
        
        console.log(`Found ${phasesToComplete.length} phases to auto-complete`);
        
        // Auto-complete each intermediate phase
        for (const phaseToComplete of phasesToComplete) {
          console.log(`Auto-completing phase: ${phaseToComplete.name}`);
          
          // Create history entries for both in-progress and completed statuses
          const inProgressHistoryEntry = {
            date: new Date(),
            action: `Auto-started ${phaseToComplete.name}`,
            userId: req.user ? req.user.id : null,
            details: `This phase was automatically started because ${phase.name} was selected.`,
            phaseId: phaseToComplete._id,
            statusId: phaseToComplete.inProgressStatusId
          };
          
          const completedHistoryEntry = {
            date: new Date(),
            action: `Auto-completed ${phaseToComplete.name}`,
            userId: req.user ? req.user.id : null,
            details: `This phase was automatically completed because ${phase.name} was selected.`,
            phaseId: phaseToComplete._id,
            statusId: phaseToComplete.completedStatusId
          };
          
          // Add to BCR history
          bcr.workflowHistory = bcr.workflowHistory || [];
          bcr.workflowHistory.push(inProgressHistoryEntry);
          bcr.workflowHistory.push(completedHistoryEntry);
        }
        
        // Save the updated history
        await bcr.save();
      }
    }
    
    // Use the phase's inProgressStatusId as the status
    const statusId = phase.inProgressStatusId;
    
    // Get the status name for the workflowStatus field
    const status = await workflowService.getStatusById(statusId);
    const statusName = status ? status.name : 'Unknown';
    
    // Update the BCR phase and status using the workflowService
    await workflowService.updateBcrPhaseStatus(bcrId, phaseId, statusId);
    
    // Also update the workflowStatus field directly
    const bcrRecord = await bcrModel.getBcrById(bcrId);
    if (bcrRecord) {
      bcrRecord.workflowStatus = statusName;
      
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
      bcrRecord.workflowHistory = bcrRecord.workflowHistory || [];
      bcrRecord.workflowHistory.push(historyEntry);
      await bcrRecord.save();
    }
    
    console.log(`BCR ${bcrId} workflow updated successfully`);
    
    // Get the phase name for the confirmation message
    const phaseName = phase ? phase.name : 'new phase';
    
    // Create a success message
    let successMessage = `The BCR workflow has been updated to the ${phaseName} phase.`;
    
    // If phases were auto-completed, add that to the message
    if (autoCompletePhases === 'true' && bcr.currentPhaseId) {
      const currentPhase = await workflowService.getPhaseById(bcr.currentPhaseId);
      if (currentPhase && phase.displayOrder > currentPhase.displayOrder + 1) {
        successMessage += ` Intermediate phases were automatically completed.`;
      }
    }
    
    // Redirect to the confirmation page with the success message
    res.redirect(`/bcr/${bcrId}/confirm?message=${encodeURIComponent(successMessage)}&action=workflow-update`);
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
