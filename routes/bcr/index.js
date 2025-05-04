const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// No middleware needed as we're using a custom base layout

// Helper function to read JSON data files
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return null;
  }
};

// Helper function to write JSON data files
const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err);
    return false;
  }
};

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

// Helper function to get the phase ID for a given status name
const getPhaseIdForStatus = (statusName, phases) => {
  // This is a simplified implementation - in a real system, you'd look up the status in your config
  // and get its associated phase ID
  
  // Map status names to phase IDs based on the config.json structure
  const statusToPhaseMap = {
    'Submission Received': 1,
    'Collation and Categorisation': 2,
    'Technical and Business Impact Review': 3,
    'Internal Governance Review': 4,
    'Stakeholder Feedback': 5,
    'Draft Implementation Planning': 6,
    'Final Approval': 7,
    'Implementation': 8,
    'Testing': 9,
    'Go Live': 10,
    'Post-Implementation Review': 11,
    'Completed': 12,
    'Rejected': null
  };
  
  return statusToPhaseMap[statusName] || null;
};

// Helper function to generate a new BCR ID
function generateBcrId() {
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  
  const currentYear = new Date().getFullYear();
  const yearSubmissions = submissionsData.submissions.filter(s => s.id.includes(`BCR-${currentYear}`));
  
  let nextNumber = 1;
  if (yearSubmissions.length > 0) {
    // Extract the numeric part of the last ID and increment
    const lastId = yearSubmissions.sort((a, b) => b.id.localeCompare(a.id))[0].id;
    const lastNumber = parseInt(lastId.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }
  
  // Format with leading zeros (4 digits)
  return `BCR-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
}

// Main BCR management page
router.get('/', (req, res) => {
  res.render('modules/bcr/index', {
    title: 'BCR Management'
  });
});

// Submissions list view
router.get('/submissions', (req, res) => {
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const configPath = path.join(__dirname, '../../data/bcr/config.json');
  
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  const configData = readJsonFile(configPath) || { phases: [], statuses: [], impactAreas: [], urgencyLevels: [] };
  
  // Get filter parameters from query string
  const status = req.query.status || 'all';
  const impactArea = req.query.impactArea || 'all';
  const submitter = req.query.submitter || 'all';
  const dfeAffiliation = req.query.dfeAffiliation || 'all';
  const startDate = req.query.startDate || '';
  const endDate = req.query.endDate || '';
  
  // Apply filters
  let filteredSubmissions = submissionsData.submissions;
  
  if (status !== 'all') {
    filteredSubmissions = filteredSubmissions.filter(s => s.status === status);
  }
  
  if (impactArea !== 'all') {
    filteredSubmissions = filteredSubmissions.filter(s => s.impactAreas.includes(impactArea));
  }
  
  if (dfeAffiliation !== 'all') {
    filteredSubmissions = filteredSubmissions.filter(s => {
      if (dfeAffiliation === 'internal') {
        return s.employmentType === 'yes';
      } else if (dfeAffiliation === 'external') {
        return s.employmentType === 'no';
      } else if (dfeAffiliation === 'other') {
        return s.employmentType !== 'yes' && s.employmentType !== 'no';
      }
      return false;
    });
  }
  
  if (submitter !== 'all') {
    filteredSubmissions = filteredSubmissions.filter(s => {
      // Handle both old and new data structure
      const submitterName = s.submitterName || (s.submitter && s.submitter.name) || 'Unknown';
      return submitterName === submitter;
    });
  }
  
  if (startDate) {
    const startDateObj = new Date(startDate);
    filteredSubmissions = filteredSubmissions.filter(s => new Date(s.dateSubmitted) >= startDateObj);
  }
  
  if (endDate) {
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999); // End of the day
    filteredSubmissions = filteredSubmissions.filter(s => new Date(s.dateSubmitted) <= endDateObj);
  }
  
  // Extract unique values for filter dropdowns
  const statuses = configData.statuses.map(s => s.name);
  const impactAreas = configData.impactAreas;
  const submitters = [...new Set(submissionsData.submissions.map(s => s.submitterName || (s.submitter && s.submitter.name) || 'Unknown'))];
  
  res.render('modules/bcr/submissions', {
    title: 'BCR Submissions',
    submissions: filteredSubmissions,
    filters: {
      statuses,
      impactAreas,
      submitters
    },
    selectedFilters: {
      status,
      impactArea,
      dfeAffiliation,
      submitter,
      startDate,
      endDate
    }
  });
});

// New BCR submission form
router.get('/submit', (req, res) => {
  const configPath = path.join(__dirname, '../../data/bcr/config.json');
  const configData = readJsonFile(configPath) || { impactAreas: [], urgencyLevels: [] };
  
  res.render('modules/bcr/submit', {
    title: 'Submit New BCR',
    impactAreas: configData.impactAreas,
    urgencyLevels: configData.urgencyLevels
  });
});

// Process new BCR submission
router.post('/submit', (req, res) => {
  try {
    const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
    const configPath = path.join(__dirname, '../../data/bcr/config.json');
    
    const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
    const configData = readJsonFile(configPath) || { phases: [], statuses: [] };
    
    // Generate a new BCR ID
    const bcrId = generateBcrId();
    
    // Get the initial status and phase
    const initialStatus = configData.statuses.find(s => s.phase === 1);
    const initialPhase = configData.phases.find(p => p.id === 1);
    
    // Process impact areas (handle both array and single value)
    let impactAreas = req.body.impactAreas;
    if (!Array.isArray(impactAreas)) {
      impactAreas = impactAreas ? [impactAreas] : [];
    }
    
    // Process change types (handle both array and single value)
    let changeType = req.body.changeType;
    if (!Array.isArray(changeType)) {
      changeType = changeType ? [changeType] : [];
    }
    
    // Create new submission object
    const newSubmission = {
      id: bcrId,
      dateSubmitted: new Date().toISOString(),
      submitter: {
        name: req.body.submitterName,
        organisation: req.body.submitterOrganisation,
        email: req.body.submitterEmail
      },
      employmentType: req.body.employmentType || '',
      title: req.body.description.substring(0, 100), // Use description as title if no separate title field
      description: req.body.description,
      justification: req.body.justification,
      policyLinked: req.body.policyLinked === 'yes',
      policyDetails: req.body.policyDetails || '',
      impactAreas: impactAreas,
      changeType: changeType,
      affectedRefDataArea: req.body.affectedRefDataArea || '',
      technicalDependencies: req.body.technicalDependencies || '',
      urgency: req.body.urgency,
      relatedDocuments: req.body.relatedDocuments ? req.body.relatedDocuments.split(',').map(doc => doc.trim()) : [],
      hasAttachments: req.body.hasAttachments === 'yes',
      status: initialStatus ? initialStatus.name : 'Submission Received',
      currentPhase: initialPhase ? initialPhase.name : 'Phase 1: Submission Window Opens',
      currentPhaseId: 1,
      assignedReviewer: '',
      history: [
        {
          date: new Date().toISOString(),
          action: 'Submission Created',
          user: req.body.submitterName,
          notes: 'Initial submission'
        }
      ]
    };
    
    // Add to submissions
    submissionsData.submissions.push(newSubmission);
    
    // Save updated submissions data
    if (writeJsonFile(submissionsPath, submissionsData)) {
      // Redirect to the confirmation page
      res.redirect(`/bcr/submission-confirmation/${bcrId}`);
    } else {
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to save submission'
      });
    }
  } catch (error) {
    console.error('Error in BCR submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to save submission: ' + error.message
    });
  }
});

// BCR submission confirmation page
router.get('/submission-confirmation/:id', (req, res) => {
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  
  const bcrId = req.params.id;
  const submission = submissionsData.submissions.find(s => s.id === bcrId);
  
  if (!submission) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested BCR submission could not be found'
    });
  }
  
  res.render('modules/bcr/submission-confirmation', {
    title: 'BCR Submission Confirmation',
    bcrId: submission.id,
    bcrTitle: submission.title,
    submitterName: submission.submitter.name,
    submitterEmail: submission.submitter.email,
    urgency: submission.urgency
  });
});

// BCR update confirmation page
router.get('/update-confirmation/:id', (req, res) => {
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  
  const bcrId = req.params.id;
  const submission = submissionsData.submissions.find(s => s.id === bcrId);
  
  if (!submission) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested BCR submission could not be found'
    });
  }
  
  res.render('modules/bcr/update-confirmation', {
    title: 'BCR Update Confirmation',
    bcrId: submission.id,
    bcrTitle: submission.title,
    lastUpdated: submission.lastUpdated || new Date().toISOString(),
    urgency: submission.urgency
  });
});

// View BCR submission details
router.get('/submissions/:id', (req, res) => {
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const configPath = path.join(__dirname, '../../data/bcr/config.json');
  const prioritisationPath = path.join(__dirname, '../../data/bcr/prioritisation.json');
  
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  const configData = readJsonFile(configPath) || { phases: [], statuses: [] };
  const prioritisationData = readJsonFile(prioritisationPath) || { prioritisations: [] };
  
  const bcrId = req.params.id;
  const submission = submissionsData.submissions.find(s => s.id === bcrId);
  
  if (!submission) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested BCR submission could not be found'
    });
  }
  
  // Find the current phase object
  const currentPhaseId = configData.statuses.find(s => s.name === submission.status)?.phase;
  const currentPhase = configData.phases.find(p => p.id === currentPhaseId);
  
  // Get allowed actions for the current phase
  const allowedActions = currentPhase ? currentPhase.allowedActions : [];
  
  res.render('modules/bcr/submission-detail', {
    title: `BCR: ${submission.id}`,
    submission: submission,
    allowedActions: allowedActions,
    phases: configData.phases,
    statuses: configData.statuses,
    prioritisations: prioritisationData.prioritisations
  });
});

// Update BCR submission status
router.post('/submissions/:id/update', (req, res) => {
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const configPath = path.join(__dirname, '../../data/bcr/config.json');
  
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  const configData = readJsonFile(configPath) || { phases: [], statuses: [] };
  
  const bcrId = req.params.id;
  const submissionIndex = submissionsData.submissions.findIndex(s => s.id === bcrId);
  
  if (submissionIndex === -1) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested BCR submission could not be found'
    });
  }
  
  const submission = submissionsData.submissions[submissionIndex];
  
  // Check if a comment is provided - it's required for status updates
  if (!req.body.comment || req.body.comment.trim() === '') {
    return res.status(400).render('error', {
      title: 'Error',
      message: 'A comment is required when updating the status'
    });
  }

  // Track if we need to update the workflow history
  let workflowUpdated = false;
  
  // Update phase if provided
  if (req.body.phaseId) {
    const phaseId = parseInt(req.body.phaseId, 10);
    const phaseObj = configData.phases.find(p => p.id === phaseId);
    const currentPhaseId = submission.currentPhaseId || 1;
    
    // Check if the requested phase follows the sequential workflow
    const isValidPhaseProgression = (
      // Allow moving to the next phase in sequence
      phaseId === currentPhaseId + 1 ||
      // Allow staying in the current phase
      phaseId === currentPhaseId ||
      // Allow moving to any previous phase (for corrections)
      phaseId < currentPhaseId ||
      // Special case: Allow moving to Rejected phase from any phase
      phaseId === configData.phases.find(p => p.name.includes('Rejected'))?.id
    );
    
    if (!isValidPhaseProgression) {
      return res.status(400).render('error', {
        title: 'Invalid Workflow Progression',
        message: `Cannot skip directly from Phase ${currentPhaseId} to Phase ${phaseId}. You must follow the sequential workflow.`
      });
    }
    
    if (phaseObj) {
      // Update the current phase
      submission.currentPhase = phaseObj.name;
      submission.currentPhaseId = phaseId;
      submission.lastUpdated = new Date().toISOString();
      workflowUpdated = true;
      
      // Find the corresponding status for this phase
      const phaseStatus = configData.statuses.find(s => s.phase === phaseId);
      if (phaseStatus) {
        submission.status = phaseStatus.name;
      }
      
      // Add to history
      if (!submission.history) {
        submission.history = [];
      }
      submission.history.push({
        date: new Date().toISOString(),
        action: 'Phase Updated',
        user: req.body.user || 'System',
        notes: `Updated to Phase ${phaseId}: ${phaseObj.name}`
      });
      
      // Mark the phase as completed if checkbox is checked
      const phaseCompleted = req.body.phaseCompleted === 'true';
      
      // Add to workflow history
      if (!submission.workflowHistory) {
        submission.workflowHistory = [];
      }
      
      // Find any existing entries for this phase and update them
      let phaseEntryExists = false;
      for (let i = 0; i < submission.workflowHistory.length; i++) {
        const entry = submission.workflowHistory[i];
        if (entry.action === 'Phase Updated' && entry.notes.includes(`Phase ${phaseId}`)) {
          entry.date = new Date().toISOString();
          entry.user = req.body.user || 'System';
          entry.notes = `Updated to Phase ${phaseId}: ${phaseObj.name}`;
          entry.completed = phaseCompleted;
          phaseEntryExists = true;
          break;
        }
      }
      
      // If no entry exists for this phase, add a new one
      if (!phaseEntryExists) {
        submission.workflowHistory.push({
          date: new Date().toISOString(),
          action: 'Phase Updated',
          user: req.body.user || 'System',
          notes: `Updated to Phase ${phaseId}: ${phaseObj.name}`,
          completed: phaseCompleted
        });
      }
      
      // If phase is marked as completed, automatically advance to the next phase
      if (phaseCompleted && phaseObj.nextPhase) {
        const nextPhaseId = phaseObj.nextPhase;
        const nextPhaseObj = configData.phases.find(p => p.id === nextPhaseId);
        
        if (nextPhaseObj) {
          // Update to the next phase
          submission.currentPhase = nextPhaseObj.name;
          submission.currentPhaseId = nextPhaseId;
          
          // Find the default status for the next phase
          const nextPhaseDefaultStatus = configData.statuses.find(s => s.phase === nextPhaseId && s.default === true);
          if (nextPhaseDefaultStatus) {
            submission.status = nextPhaseDefaultStatus.name;
          }
          
          // Add to history
          submission.history.push({
            date: new Date().toISOString(),
            action: 'Phase Advanced',
            user: req.body.user || 'System',
            notes: `Automatically advanced to Phase ${nextPhaseId}: ${nextPhaseObj.name} after completing previous phase`
          });
          
          // Add to workflow history
          submission.workflowHistory.push({
            date: new Date().toISOString(),
            action: 'Phase Updated',
            user: req.body.user || 'System',
            notes: `Advanced to Phase ${nextPhaseId}: ${nextPhaseObj.name}`,
            completed: false
          });
        }
      }
    }
  }
  
  // Update status based on the selected phase
  if (req.body.phaseId) {
    const phaseId = parseInt(req.body.phaseId, 10);
    const phaseObj = configData.phases.find(p => p.id === phaseId);
    
    if (phaseObj) {
      // Find the default status for this phase
      const defaultStatus = configData.statuses.find(s => s.phase === phaseId && s.default === true);
      const newStatus = defaultStatus ? defaultStatus.name : submission.status;
      
      // Special case: Allow skipping to Completed or Rejected status with a comment
      const isClosingBCR = newStatus === 'Completed' || newStatus === 'Rejected';
      
      // Update the status
      submission.status = newStatus;
      submission.lastUpdated = new Date().toISOString();
      
      // Add closure date for tracking if applicable
      if (newStatus === 'Completed') {
        submission.completedDate = new Date().toISOString();
      } else if (newStatus === 'Rejected') {
        submission.rejectedDate = new Date().toISOString();
      }
      
      // Add to history
      if (!submission.history) {
        submission.history = [];
      }
      submission.history.push({
        date: new Date().toISOString(),
        action: 'Status Updated',
        user: req.body.user || 'System',
        notes: `Changed status to ${newStatus}`
      });

      // Add to workflow history with the user's comment if not already updated by phase change
      if (!submission.workflowHistory) {
        submission.workflowHistory = [];
      }
      
      if (!workflowUpdated) {
        const phaseCompleted = req.body.phaseCompleted === 'true';
        submission.workflowHistory.push({
          date: new Date().toISOString(),
          action: 'Status Updated',
          user: req.body.user || 'System',
          notes: req.body.comment,
          completed: phaseCompleted
        });
      }
    }
  }
  
  // Update assigned reviewer if provided
  if (req.body.assignedReviewer !== undefined) {
    submission.assignedReviewer = req.body.assignedReviewer;
    
    // Add to history if reviewer changed
    if (submission.assignedReviewer !== req.body.assignedReviewer) {
      submission.history.push({
        date: new Date().toISOString(),
        action: 'Reviewer Assigned',
        user: req.body.user || 'System',
        notes: `Assigned to ${req.body.assignedReviewer}`
      });
    }
  }
  
  // Add comment to history if provided
  if (req.body.comment) {
    submission.history.push({
      date: new Date().toISOString(),
      action: 'Comment Added',
      user: req.body.user || 'System',
      notes: req.body.comment
    });
  }
  
  // Save updated submissions data
  if (writeJsonFile(submissionsPath, submissionsData)) {
    // Check if this was a phase update
    if (req.body.phaseId) {
      // Redirect to confirmation page with relevant information
      res.redirect(`/bcr/submissions/${bcrId}/phase-update-confirmation?user=${encodeURIComponent(req.body.user || 'System')}&comment=${encodeURIComponent(req.body.comment)}&time=${encodeURIComponent(new Date().toISOString())}`);
    } else {
      // Regular redirect for other updates
      res.redirect(`/bcr/submissions/${bcrId}`);
    }
  } else {
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to update submission'
    });
  }
});

// Phase update confirmation page
router.get('/submissions/:id/phase-update-confirmation', (req, res) => {
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  
  const bcrId = req.params.id;
  const submission = submissionsData.submissions.find(s => s.id === bcrId);
  
  if (!submission) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested BCR submission could not be found'
    });
  }
  
  // Get the query parameters
  const updatedBy = req.query.user || 'System';
  const comment = req.query.comment || '';
  const updateTime = req.query.time || new Date().toISOString();
  
  res.render('modules/bcr/phase-update-confirmation', {
    title: 'Phase Update Confirmation',
    submission: submission,
    updatedBy: updatedBy,
    comment: comment,
    updateTime: updateTime
  });
});

// BCR workflow management page
router.get('/workflow', (req, res) => {
  const configPath = path.join(__dirname, '../../data/bcr/config.json');
  const configData = readJsonFile(configPath) || { phases: [], statuses: [] };
  
  res.render('modules/bcr/workflow', {
    title: 'BCR Workflow Management',
    phases: configData.phases,
    statuses: configData.statuses
  });
});

// BCR phase-status mapping page
router.get('/phase-status-mapping', (req, res) => {
  const configPath = path.join(__dirname, '../../data/bcr/config.json');
  const configData = readJsonFile(configPath) || { phases: [], statuses: [] };
  
  res.render('modules/bcr/phase-status-mapping', {
    title: 'BCR Phase-Status Mapping',
    phases: configData.phases,
    statuses: configData.statuses
  });
});

// Edit BCR submission form
router.get('/submissions/:id/edit', (req, res) => {
  const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
  const configPath = path.join(__dirname, '../../data/bcr/config.json');
  
  const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
  const configData = readJsonFile(configPath) || { impactAreas: [], urgencyLevels: [] };
  
  const submission = submissionsData.submissions.find(s => s.id === req.params.id);
  
  if (!submission) {
    return res.status(404).render('error', {
      title: 'Error',
      message: 'Submission not found'
    });
  }
  
  res.render('modules/bcr/edit-submission', {
    title: `Edit BCR: ${submission.id}`,
    submission: submission,
    impactAreas: configData.impactAreas,
    urgencyLevels: configData.urgencyLevels
  });
});

// Process edit BCR submission
router.post('/submissions/:id/edit', (req, res) => {
  try {
    const submissionsPath = path.join(__dirname, '../../data/bcr/submissions.json');
    const submissionsData = readJsonFile(submissionsPath) || { submissions: [] };
    
    const submissionIndex = submissionsData.submissions.findIndex(s => s.id === req.params.id);
    
    if (submissionIndex === -1) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Submission not found'
      });
    }
    
    const submission = submissionsData.submissions[submissionIndex];
    
    // Process impact areas (handle both array and single value)
    let impactAreas = req.body.impactAreas;
    if (!Array.isArray(impactAreas)) {
      impactAreas = impactAreas ? [impactAreas] : [];
    }

    // Process change types (handle both array and single value)
    let changeType = req.body.changeType;
    if (!Array.isArray(changeType)) {
      changeType = changeType ? [changeType] : [];
    }
    
    // Update submission with form data
    // Use description as title if no separate title field
    submission.title = req.body.description.substring(0, 100);
    
    // Always update description
    submission.description = req.body.description;
    submission.justification = req.body.justification;
    submission.impactAreas = impactAreas;
    submission.changeType = changeType;
    submission.urgency = req.body.urgency;
    submission.affectedRefDataArea = req.body.affectedRefDataArea || '';
    submission.technicalDependencies = req.body.technicalDependencies || '';
    
    // Process related documents (convert from newline-separated text to array)
    submission.relatedDocuments = req.body.relatedDocuments ? 
      req.body.relatedDocuments.split('\n').map(doc => doc.trim()).filter(doc => doc) : [];
    
    // Update submitter information
    if (!submission.submitter) {
      submission.submitter = {};
    }
    submission.submitter.name = req.body.submitterName;
    submission.submitter.email = req.body.submitterEmail;
    submission.submitter.organisation = req.body.submitterOrganisation || '';
    submission.employmentType = req.body.employmentType;
    
    // Add history entry for the update
    if (!submission.history) {
      submission.history = [];
    }
    
    submission.history.push({
      date: new Date().toISOString(),
      action: 'Submission Updated',
      user: req.body.submitterName,
      notes: 'BCR details updated'
    });
    
    submission.lastUpdated = new Date().toISOString();
    
    // Save updated submissions data
    if (writeJsonFile(submissionsPath, submissionsData)) {
      // Redirect to the update confirmation page
      res.redirect(`/bcr/update-confirmation/${req.params.id}`);
    } else {
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to save submission'
      });
    }
  } catch (error) {
    console.error('Error in BCR edit submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to save submission: ' + error.message
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
