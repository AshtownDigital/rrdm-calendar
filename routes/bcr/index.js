const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Import Prisma services
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');

// No middleware needed as we're using a custom base layout

// Helper function to reset all phases below the current phase
const resetLowerPhases = (submission, currentPhaseId, phases) => {
  // If there's no workflow history, nothing to reset
  if (!submission.workflowHistory) {
    return;
  }
  
  // Get all phase IDs higher than the current phase
  const higherPhaseIds = phases
    .filter(phase => phase.id > currentPhaseId)
    .map(phase => phase.id);
  
  // Mark all workflow history items for higher phases as 'not completed'
  submission.workflowHistory.forEach(item => {
    // Try to find which phase this history item belongs to
    const statusName = item.action.includes('Status Updated') ? 
      item.notes.replace('Changed status to ', '') : null;
    
    if (statusName) {
      // Find the phase ID for this status
      const phaseId = getPhaseIdForStatus(statusName, phases);
      
      // If this history item is for a higher phase, mark it as not completed
      if (phaseId && higherPhaseIds.includes(phaseId)) {
        item.completed = false;
      }
    }
  });
  
  // Add a note about resetting subsequent phases
  submission.history.push({
    date: new Date().toISOString(),
    action: 'Phases Reset',
    user: 'System',
    notes: `All phases after Phase ${currentPhaseId} have been reset to Not Completed`
  });
};

// Helper function to get phase ID for a status
const getPhaseIdForStatus = async (statusName) => {
  try {
    // Find the status in the database using the service
    const statuses = await bcrConfigService.getConfigsByType('status');
    const status = statuses.find(s => s.name === statusName);
    
    if (status) {
      return parseInt(status.value, 10);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting phase ID for status:', error);
    return null;
  }
};

// Helper function to generate a new BCR ID
async function generateBcrId() {
  // Use the service to generate a BCR number
  return await bcrService.generateBcrNumber();
}

// Main BCR management page
router.get('/', (req, res) => {
  res.render('modules/bcr/index', {
    title: 'BCR Management',
    user: req.user
  });
});

// Submissions list view
router.get('/submissions', async (req, res) => {
  try {
    // Get filter parameters from query string
    const status = req.query.status || 'all';
    const impactArea = req.query.impactArea || 'all';
    const submitter = req.query.submitter || 'all';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    
    // Get submissions from database using the service
    const submissions = await bcrService.getAllBcrs({
      status,
      impactArea,
      submitter,
      startDate,
      endDate
    });
    
    // Get configuration data for filters using the service
    const statuses = await bcrConfigService.getConfigsByType('status');
    const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
    
    // Get unique submitters for filter
    const allSubmissions = await bcrService.getAllBcrs();
    const submitters = [...new Set(
      allSubmissions
        .filter(s => s.Users_Bcrs_requestedByToUsers)
        .map(s => s.Users_Bcrs_requestedByToUsers.name)
    )].sort();
    
    // Render the template with data
    res.render('modules/bcr/submissions', {
      title: 'BCR Submissions',
      submissions,
      filters: {
        statuses: statuses.map(s => s.name),
        impactAreas: impactAreas.map(ia => ia.name),
        submitters
      },
      selectedFilters: {
        status,
        impactArea,
        submitter,
        startDate,
        endDate
      },
      user: req.user
    });
  } catch (error) {
    console.error('Error fetching BCR submissions:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR submissions',
      error,
      user: req.user
    });
  }
});

// New BCR submission form
router.get('/submit', async (req, res) => {
  try {
    // Get configuration data from database using services
    const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
    const urgencyLevels = await bcrConfigService.getConfigsByType('urgencyLevel');
    
    res.render('modules/bcr/submit', {
      title: 'Submit BCR',
      impactAreas,
      urgencyLevels,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading BCR submission form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR submission form',
      error,
      user: req.user
    });
  }
});

// Process new BCR submission
router.post('/submit', async (req, res) => {
  try {
    // Process impact areas (handle both array and single value)
    let impactAreas = req.body.impactAreas;
    if (!Array.isArray(impactAreas)) {
      impactAreas = impactAreas ? [impactAreas] : [];
    }
    
    // Create impact string from array
    const impactString = impactAreas.join(', ');
    
    // Create BCR data object
    const bcrData = {
      title: req.body.title,
      description: req.body.description,
      status: 'submitted', // Set initial status to submitted
      priority: req.body.urgency || 'medium', // Map urgency to priority
      impact: impactString,
      requestedBy: req.user.id, // Use the logged-in user's ID
      assignedTo: null,
      notes: `Justification: ${req.body.justification || ''}

Policy Details: ${req.body.policyDetails || ''}

Technical Dependencies: ${req.body.technicalDependencies || ''}

Submitter Email: ${req.body.submitterEmail || ''}

Submitter Organization: ${req.body.submitterOrganisation || ''}`
    };
    
    // Create a new BCR in the database using the service
    const newBcr = await bcrService.createBcr(bcrData);
    
    // Redirect to the confirmation page
    res.redirect(`/bcr/${newBcr.id}`);
  } catch (error) {
    console.error('Error in BCR submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to save submission: ' + error.message,
      user: req.user
    });
  }
});

// Redirect old submission confirmation URLs to the BCR view page
router.get('/submission-confirmation/:id', (req, res) => {
  res.redirect(`/bcr/${req.params.id}`);
});

// BCR update confirmation page
router.get('/update-confirmation/:id', async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Find the BCR in the database using the service
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'BCR not found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    // Get configuration data using the service
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    res.render('modules/bcr/update-confirmation', {
      title: 'BCR Updated',
      bcr,
      statusColors: {
        'draft': 'govuk-tag govuk-tag--grey',
        'submitted': 'govuk-tag govuk-tag--blue',
        'under_review': 'govuk-tag govuk-tag--light-blue',
        'approved': 'govuk-tag govuk-tag--green',
        'rejected': 'govuk-tag govuk-tag--red',
        'implemented': 'govuk-tag govuk-tag--purple'
      },
      statuses,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading BCR update confirmation:', error);
    return res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR update confirmation',
      error,
      user: req.user
    });
  }
});

// View BCR submission details
router.get('/submissions/:id', async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Find the BCR in the database with associated users using the service
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'BCR submission not found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    // Get configuration data using the services
    const phases = await bcrConfigService.getConfigsByType('phase');
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    // Determine allowed actions based on current status
    const allowedActions = {
      canEdit: true, // Allow editing for all statuses for now
      canUpdateStatus: true // Allow status updates for all statuses for now
    };
    
    res.render('modules/bcr/submission-detail', {
      title: `BCR: ${bcr.bcrNumber || bcr.id}`,
      submission: bcr,
      allowedActions: allowedActions,
      phases: phases,
      statuses: statuses,
      user: req.user
    });
  } catch (error) {
    console.error('Error viewing BCR submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR submission',
      error,
      user: req.user
    });
  }
});

// Update BCR status
router.post('/update-status/:id', async (req, res) => {
  try {
    const bcrId = req.params.id;
    const { status, phase, comment, assignee } = req.body;
    
    // Find the BCR using the service
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).json({ success: false, message: 'BCR not found' });
    }
    
    // Validate comment
    if (!comment) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'A comment is required when updating the status',
        user: req.user
      });
    }
    
    // Get configuration data using services
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    // Determine current phase
    const currentPhaseId = await getPhaseIdForStatus(bcr.status);
    
    // Create update data object
    const updateData = {};
    
    // Update status if provided
    if (status) {
      updateData.status = status;
    }
    
    // Update phase if provided
    if (phase) {
      // Reset lower phases if moving to a higher phase
      const newPhaseId = parseInt(phase, 10);
      if (newPhaseId > currentPhaseId) {
        updateData.phase = newPhaseId;
      }
    }
    
    // Update notes with the comment
    const currentNotes = bcr.notes || '';
    updateData.notes = `${currentNotes}\n\n${new Date().toISOString()} - ${req.user.name}: ${comment}`;
    
    // Update the assignee if provided
    if (assignee) {
      updateData.assignedTo = assignee;
    }
    
    // Update the BCR using the service
    await bcrService.updateBcr(bcrId, updateData);
    
    // Redirect to confirmation page
    res.redirect(`/bcr/update-confirmation/${bcrId}`);
  } catch (error) {
    console.error('Error updating BCR status:', error);
    res.status(500).json({ success: false, message: 'Failed to update BCR status' });
  }
});

// Phase update confirmation page
router.get('/submissions/:id/phase-update-confirmation', async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Find the BCR in the database using the service
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'BCR submission could not be found',
        error: { status: 404 },
        user: req.user
      });
    }
    
    // Get query parameters
    const userName = req.query.user || 'System';
    const comment = req.query.comment || '';
    const time = req.query.time || new Date().toISOString();
    
    res.render('modules/bcr/phase-update-confirmation', {
      title: 'Phase Update Confirmation',
      bcrId: bcr.id,
      bcrTitle: bcr.title,
      user: req.user,
      userName,
      comment,
      time
    });
  } catch (error) {
    console.error('Error loading phase update confirmation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load phase update confirmation',
      error,
      user: req.user
    });
  }
});

// BCR workflow management page
router.get('/workflow', async (req, res) => {
  try {
    // Get configuration data from database using services
    const phases = await bcrConfigService.getConfigsByType('phase');
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    res.render('modules/bcr/workflow', {
      title: 'BCR Workflow Management',
      phases,
      statuses,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading BCR workflow management:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR workflow management',
      error,
      user: req.user
    });
  }
});

// BCR phase-status mapping page
router.get('/phase-status-mapping', async (req, res) => {
  try {
    // Get configuration data from database using services
    const phases = await bcrConfigService.getConfigsByType('phase');
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    res.render('modules/bcr/phase-status-mapping', {
      title: 'BCR Phase-Status Mapping',
      phases,
      statuses,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading BCR phase-status mapping:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR phase-status mapping',
      error,
      user: req.user
    });
  }
});

// Edit BCR submission form
router.get('/submissions/:id/edit', async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Find the BCR in the database
    const bcr = await Bcr.findByPk(bcrId, {
      include: [
        { model: User, as: 'requester' },
        { model: User, as: 'assignee' }
      ]
    });
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Submission not found',
        user: req.user
      });
    }
    
    // Get configuration data
    const impactAreas = await BcrConfig.findAll({ where: { type: 'impactArea' }, order: [['displayOrder', 'ASC']] });
    const urgencyLevels = await BcrConfig.findAll({ where: { type: 'urgencyLevel' }, order: [['displayOrder', 'ASC']] });
    
    res.render('modules/bcr/edit-submission', {
      title: `Edit BCR: ${bcr.id}`,
      submission: bcr,
      impactAreas: impactAreas.map(ia => ia.name),
      urgencyLevels: urgencyLevels.map(ul => ul.name),
      user: req.user
    });
  } catch (error) {
    console.error('Error loading BCR edit form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR edit form',
      error,
      user: req.user
    });
  }
});

// Process edit BCR submission
router.post('/submissions/:id/edit', async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Find the BCR in the database
    const bcr = await Bcr.findByPk(bcrId);
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Submission not found',
        user: req.user
      });
    }
    
    // Process impact areas (handle both array and single value)
    let impactAreas = req.body.impactAreas;
    if (!Array.isArray(impactAreas)) {
      impactAreas = impactAreas ? [impactAreas] : [];
    }
    
    // Create impact string from array
    const impactString = impactAreas.join(', ');
    
    // Update BCR with form data
    bcr.title = req.body.title || req.body.description.substring(0, 100); // Use description as title if no separate title field
    
    // Update BCR fields
    bcr.description = req.body.description;
    bcr.impact = impactString;
    bcr.priority = req.body.urgency || 'medium'; // Map urgency to priority
    
    // Update notes with additional information
    let additionalNotes = '';
    if (req.body.justification) additionalNotes += `\nJustification: ${req.body.justification}`;
    if (req.body.policyDetails) additionalNotes += `\nPolicy Details: ${req.body.policyDetails}`;
    if (req.body.technicalDependencies) additionalNotes += `\nTechnical Dependencies: ${req.body.technicalDependencies}`;
    
    if (additionalNotes) {
      // Append to existing notes if there are any
      if (bcr.notes) {
        bcr.notes += `\n\n${new Date().toISOString()} - Update: ${additionalNotes}`;
      } else {
        bcr.notes = additionalNotes;
      }
    }
    
    // Save the updated BCR
    await bcr.save();
    
    // Redirect to the BCR view page
    res.redirect(`/bcr/submissions/${bcrId}`);
  } catch (error) {
    console.error('Error updating BCR submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to update submission: ' + error.message,
      user: req.user
    });
  }
});

// Archive a submission (soft delete)
router.post('/submissions/:id/archive', (req, res) => {
  try {
    const id = req.params.id;
    const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
    const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
    
    const submissionIndex = submissionsData.submissions.findIndex(s => s.id === id);
    if (submissionIndex === -1) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Submission not found'
      });
    }
    
    const submission = submissionsData.submissions[submissionIndex];
    
    // Soft delete by setting archived flag
    submission.archived = true;
    submission.archivedDate = new Date().toISOString();
    
    // Add to history
    if (!submission.history) {
      submission.history = [];
    }
    
    submission.history.push({
      date: new Date().toISOString(),
      action: 'Archived',
      user: req.body.user || 'System',
      notes: req.body.comment || 'Submission archived'
    });
    
    // Save the updated data
    if (writeJsonFile(submissionsPath, submissionsData)) {
      // Redirect to archive confirmation page
      res.redirect(`/bcr/submissions/${id}/archive-confirmation`);
    } else {
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to archive submission'
      });
    }
  } catch (error) {
    console.error('Error in BCR archive:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to archive submission: ' + error.message
    });
  }
});

// Archive confirmation page
router.get('/submissions/:id/archive-confirmation', (req, res) => {
  const id = req.params.id;
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  
  const submission = submissionsData.submissions.find(s => s.id === id);
  
  if (!submission) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested BCR submission could not be found'
    });
  }
  
  res.render('modules/bcr/archive-confirmation', {
    title: 'Archive Confirmation',
    submission: submission
  });
});

// Reset workflow to Submission Received
router.post('/submissions/:id/reset-workflow', (req, res) => {
  const id = req.params.id;
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const configPath = path.join(__dirname, '../../data/bcr/config.json');
  
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  const configData = readJsonFile(configPath) || { phases: [], statuses: [] };
  
  const submissionIndex = submissionsData.submissions.findIndex(s => s.id === id);
  if (submissionIndex === -1) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested BCR submission could not be found'
    });
  }
  
  const submission = submissionsData.submissions[submissionIndex];
  
  // Check if a comment is provided - it's required for resetting workflow
  if (!req.body.comment || req.body.comment.trim() === '') {
    return res.status(400).render('error', {
      title: 'Error',
      message: 'A comment is required when resetting the workflow'
    });
  }
  
  // Get the Submission Received status object
  const receivedStatusObj = configData.statuses.find(s => s.name === 'Submission Received');
  if (!receivedStatusObj) {
    return res.status(500).render('error', {
      title: 'Error',
      message: 'Could not find Submission Received status in configuration'
    });
  }
  
  // Get the Phase 1 object
  const phase1Obj = configData.phases.find(p => p.id === 1);
  if (!phase1Obj) {
    return res.status(500).render('error', {
      title: 'Error',
      message: 'Could not find Phase 1 in configuration'
    });
  }
  
  // Update status and phase
  submission.status = 'Submission Received';
  submission.currentPhase = phase1Obj.name;
  submission.currentPhaseId = 1;
  submission.lastUpdated = new Date().toISOString();
  
  // Clear any assigned reviewer if present
  if (submission.assignedReviewer) {
    submission.assignedReviewer = '';  
  }
  
  // Reset workflow history
  if (submission.workflowHistory) {
    // First, mark all existing workflow history items as not completed for phases > 1
    submission.workflowHistory.forEach(item => {
      // For any status update or phase change, mark as not completed if it's beyond phase 1
      if (item.action === 'Status Updated' || item.action === 'Phase Changed') {
        const statusName = item.notes.includes('Changed status to ') ? 
          item.notes.replace('Changed status to ', '') : null;
        
        if (statusName) {
          // Find the phase ID for this status
          const phaseId = getPhaseIdForStatus(statusName, configData.phases);
          
          // If this history item is for a phase > 1, mark it as not completed
          if (phaseId && phaseId > 1) {
            item.completed = false;
          }
        }
      }
    });
  } else {
    // Create workflow history array if it doesn't exist
    submission.workflowHistory = [];
  }
  
  // Add to history
  if (!submission.history) {
    submission.history = [];
  }
  submission.history.push({
    date: new Date().toISOString(),
    action: 'Workflow Reset',
    user: req.body.user || 'System',
    notes: req.body.comment
  });
  
  // Create timestamp for all history entries
  const resetTimestamp = new Date().toISOString();
  
  // Add the reset action to the workflow history
  submission.workflowHistory.push({
    date: resetTimestamp,
    action: 'Workflow Reset',
    user: req.body.user || 'System',
    notes: req.body.comment,
    completed: true
  });
  
  // Also add a new entry for the Submission Received status
  submission.workflowHistory.push({
    date: resetTimestamp,
    action: 'Status Updated',
    user: req.body.user || 'System',
    notes: 'Changed status to Submission Received',
    completed: true
  });
  
  // Make sure the allowedActions are updated to match Phase 1
  if (phase1Obj && phase1Obj.allowedActions) {
    submission.allowedActions = [...phase1Obj.allowedActions];
  }
  
  // Save the updated submissions
  writeJsonFile(submissionsPath, submissionsData);
  
  // Prepare data for the confirmation page
  const user = req.body.user || 'System';
  const comment = req.body.comment;
  
  // Encode the parameters for the URL
  const queryParams = new URLSearchParams({
    user: user,
    comment: comment,
    resetDate: resetTimestamp
  }).toString();
  
  // Redirect to the confirmation page with query parameters
  res.redirect(`/bcr/submissions/${id}/reset-workflow/confirmation?${queryParams}`);
});

// Reset workflow confirmation page
router.get('/submissions/:id/reset-workflow/confirmation', (req, res) => {
  const id = req.params.id;
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  const submission = submissionsData.submissions.find(s => s.id === id);
  
  if (!submission) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested BCR submission could not be found'
    });
  }
  
  // Get data from query parameters
  const user = req.query.user || 'System';
  const comment = req.query.comment || 'Workflow has been reset to Submission Received status';
  const resetDate = req.query.resetDate || new Date().toISOString();
  
  res.render('modules/bcr/reset-workflow-confirmation', {
    title: 'Reset Workflow Confirmation',
    submission: submission,
    user: user,
    comment: comment,
    resetDate: resetDate
  });
});

// Add impact areas to a submission
router.post('/submissions/:id/impact-areas/add', (req, res) => {
  const id = req.params.id;
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const submissions = readJsonFile(submissionsPath) || [];
  
  const submissionIndex = submissions.findIndex(s => s.id === id);
  if (submissionIndex === -1) {
    return res.status(404).send('Submission not found');
  }
  
  const submission = submissions[submissionIndex];
  
  // Get the selected impact areas from the form
  let impactAreas = req.body['impactAreas[]'] || [];
  
  // Convert to array if it's a single value
  if (!Array.isArray(impactAreas)) {
    impactAreas = [impactAreas];
  }
  
  // Handle 'Other' option with custom text
  if (impactAreas.includes('Other') && req.body.otherImpactArea) {
    // Replace 'Other' with the specific value
    const otherIndex = impactAreas.indexOf('Other');
    impactAreas[otherIndex] = req.body.otherImpactArea;
  }
  
  // Get the impact details and severity
  const impactDetails = req.body.impactDetails || '';
  const severity = req.body.severity || '';
  
  // Update the submission with the new impact areas
  if (!submission.impactAreas) {
    submission.impactAreas = [];
  }
  
  // Add the new impact areas to the existing ones (avoid duplicates)
  impactAreas.forEach(area => {
    if (!submission.impactAreas.includes(area)) {
      submission.impactAreas.push(area);
    }
  });
  
  // Add to history
  if (!submission.history) {
    submission.history = [];
  }
  
  submission.history.push({
    date: new Date().toISOString(),
    action: 'Impact Areas Updated',
    user: 'System',
    notes: `Added impact areas: ${impactAreas.join(', ')}`
  });
  
  // Save the updated submissions
  writeJsonFile(submissionsPath, submissions);
  
  // Redirect back to the submission detail page
  res.redirect(`/bcr/submissions/${id}#impact-areas`);
});

// Export submissions to CSV
router.get('/export', (req, res) => {
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };

  // Generate CSV content
  let csv = 'BCR ID,Title,Submitter,Date Submitted,Status\n';

  submissionsData.submissions.forEach(submission => {
    csv += `${submission.id},"${submission.title}","${submission.submitter.name}",${new Date(submission.dateSubmitted).toLocaleDateString()},${submission.status}\n`;
  });

  // Set headers for file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=bcr_submissions.csv');

  res.send(csv);
});

// Prioritisation routes

// Prioritisation list view
router.get('/prioritisation', (req, res) => {
  const prioritisationPath = path.join(__dirname, '../../data/bcr/prioritisation.json');
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');

  const prioritisationData = readJsonFile(prioritisationPath) || { prioritisations: [], prioritisationFlags: [] };
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };

  // Get filter parameters
  const flag = req.query.flag || '';
  const status = req.query.status || '';

  // Apply filters
  let filteredPrioritisations = prioritisationData.prioritisations;

  if (flag) {
    filteredPrioritisations = filteredPrioritisations.filter(p => p.prioritisationFlag === flag);
  }

  if (status) {
    filteredPrioritisations = filteredPrioritisations.filter(p => p.currentStatus === status);
  }

  // Get unique statuses for filter dropdown
  const statuses = [...new Set(prioritisationData.prioritisations.map(p => p.currentStatus))];

  res.render('modules/bcr/prioritisation', {
    title: 'BCR Prioritisation',
    prioritisations: filteredPrioritisations,
    prioritisationFlags: prioritisationData.prioritisationFlags,
    statuses: statuses,
    selectedFilters: {
      flag,
      status
    },
    submissions: submissionsData.submissions
  });
});

// Prioritisation form view (new or edit)
router.get('/prioritisation/new', (req, res) => {
  const prioritisationPath = path.join(__dirname, '../../data/bcr/prioritisation.json');
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');

  const prioritisationData = readJsonFile(prioritisationPath) || { prioritisations: [], prioritisationFlags: [] };
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };

  res.render('modules/bcr/prioritisation-form', {
    title: 'Add Prioritisation',
    prioritisationFlags: prioritisationData.prioritisationFlags,
    submissions: submissionsData.submissions,
    prioritisation: {}
  });
});

// Edit prioritisation form
router.get('/prioritisation/:bcrId/edit', (req, res) => {
  const bcrId = req.params.bcrId;
  const prioritisationPath = path.join(__dirname, '../../data/bcr/prioritisation.json');
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');

  const prioritisationData = readJsonFile(prioritisationPath) || { prioritisations: [], prioritisationFlags: [] };
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };

  const prioritisation = prioritisationData.prioritisations.find(p => p.bcrId === bcrId);

  if (!prioritisation) {
    return res.redirect('/bcr/prioritisation');
  }

  res.render('modules/bcr/prioritisation-form', {
    title: 'Edit Prioritisation',
    prioritisationFlags: prioritisationData.prioritisationFlags,
    submissions: submissionsData.submissions,
    prioritisation: prioritisation,
    isEdit: true
  });
});

// Save prioritisation (create or update)
router.post('/prioritisation/save', (req, res) => {
  const prioritisationPath = path.join(__dirname, '../../data/bcr/prioritisation.json');
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const prioritisationData = readJsonFile(prioritisationPath) || { prioritisations: [], prioritisationFlags: [] };
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };

  const { bcrId, trelloTicketId, description, prioritisationFlag, prioritisationNarrative, currentStatus } = req.body;

  // Check if this is an update or a new entry
  const existingIndex = prioritisationData.prioritisations.findIndex(p => p.bcrId === bcrId);
  const isUpdate = existingIndex >= 0;

  const prioritisationEntry = {
    bcrId,
    trelloTicketId,
    description,
    prioritisationFlag,
    prioritisationNarrative,
    currentStatus,
    lastUpdated: new Date().toISOString()
  };

  if (isUpdate) {
    // Update existing entry
    prioritisationData.prioritisations[existingIndex] = prioritisationEntry;
  } else {
    // Add new entry
    prioritisationData.prioritisations.push(prioritisationEntry);
  }

  // Save the updated data
  if (writeJsonFile(prioritisationPath, prioritisationData)) {
    // Find the BCR submission to include in the confirmation
    const submission = submissionsData.submissions.find(s => s.id === bcrId);
    const bcrTitle = submission ? submission.title : bcrId;
    
    // Redirect to confirmation page with relevant information
    res.redirect(`/bcr/prioritisation/confirmation?bcrId=${encodeURIComponent(bcrId)}&title=${encodeURIComponent(bcrTitle)}&action=${isUpdate ? 'updated' : 'created'}`);
  } else {
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to save prioritisation'
    });
  }
});

// Delete prioritisation
router.post('/prioritisation/:bcrId/delete', (req, res) => {
  const bcrId = req.params.bcrId;
  const prioritisationPath = path.join(__dirname, '../../data/bcr/prioritisation.json');
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');

  const prioritisationData = readJsonFile(prioritisationPath) || { prioritisations: [], prioritisationFlags: [] };
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };

  // Find the BCR submission to include in the confirmation
  const submission = submissionsData.submissions.find(s => s.id === bcrId);
  const bcrTitle = submission ? submission.title : bcrId;

  // Filter out the entry to delete
  prioritisationData.prioritisations = prioritisationData.prioritisations.filter(p => p.bcrId !== bcrId);

  // Save the updated data
  if (writeJsonFile(prioritisationPath, prioritisationData)) {
    // Redirect to confirmation page with relevant information
    res.redirect(`/bcr/prioritisation/confirmation?bcrId=${encodeURIComponent(bcrId)}&title=${encodeURIComponent(bcrTitle)}&action=deleted`);
  } else {
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to delete prioritisation'
    });
  }
});

// Prioritisation confirmation page
router.get('/prioritisation/confirmation', (req, res) => {
  const { bcrId, title, action } = req.query;
  
  if (!bcrId || !action) {
    return res.redirect('/bcr/prioritisation');
  }
  
  res.render('modules/bcr/prioritisation-confirmation', {
    title: 'Prioritisation Confirmation',
    bcrId: bcrId,
    bcrTitle: title || bcrId,
    action: action
  });
});

module.exports = router;
