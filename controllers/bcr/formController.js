/**
 * BCR Form Controller
 * Handles BCR submission forms and processing
 */
const { v4: uuidv4 } = require('uuid');
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');
const trelloService = require('../../services/trelloService');

// Import MongoDB models
const Bcr = require('../../models/Bcr');
const Submission = require('../../models/Submission');
const BcrWorkflowActivity = require('../../models/BcrWorkflowActivity');
const AuditLog = require('../../models/AuditLog');

// --- Helpers ---
/**
 * Render an error page with the given status, title, message, and error.
 * @param {import('express').Response} res - Express response object
 * @param {Object} options - Options for rendering the error page
 * @param {number} [options.status=500] - HTTP status code
 * @param {string} [options.title='Error'] - Page title
 * @param {string} [options.message='An error occurred'] - Error message
 * @param {Object} [options.error={}] - Error object
 * @param {Object} [options.user=null] - User object
 */
function renderError(res, { status = 500, title = 'Error', message = 'An error occurred', error = {}, user = null }) {
  return res.status(status).render('error', {
    title,
    message,
    error: process.env.NODE_ENV === 'development' ? error : {},
    user
  });
}

/**
 * Validate the BCR submission data following GOV.UK Design System validation patterns.
 * @param {Object} data - BCR submission data
 * @returns {Object} Validation result with field-specific errors
 */
function validateBcrData(data) {
  const errors = {};

  // Description validation
  if (data.description && data.description.length > 2000) {
    errors.description = {
      text: 'Description must be 2000 characters or less',
      href: '#description'
    };
  }

  // Impact areas validation
  // Handle both single selection (string) and multiple selections (array)
  const impactAreasArray = data.impactAreas 
    ? (Array.isArray(data.impactAreas) ? data.impactAreas : [data.impactAreas]) 
    : [];
  
  if (impactAreasArray.length === 0) {
    errors.impactAreas = {
      text: 'Select at least one impact area',
      href: '#impactAreas'
    };
  }

  // Urgency validation
  if (!data.urgency) {
    errors.urgency = {
      text: 'Select an urgency level',
      href: '#urgency'
    };
  }

  // Justification validation
  if (!data.justification) {
    errors.justification = {
      text: 'Enter a justification for this change',
      href: '#justification'
    };
  }

  // Declaration validation
  if (!data.declaration) {
    errors.declaration = {
      text: 'You must confirm that the information provided is accurate and complete',
      href: '#declaration'
    };
  }

  return errors;
}

// --- Controllers ---
/**
 * Display the new BCR submission form
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
async function showSubmitForm(req, res) {
  try {
    // Get impact areas and their descriptions
    const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
    const impactAreaDescriptions = await bcrConfigService.getConfigsByType('impactArea_description');
    
    // Sort impact areas by display order
    impactAreas.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Attach descriptions to impact areas
    const impactAreasWithDescriptions = impactAreas.map(area => {
      const descriptionConfig = impactAreaDescriptions.find(desc => 
        desc.name === `description:${area.name}`
      );
      return {
        ...area,
        description: descriptionConfig ? descriptionConfig.value : ''
      };
    });
    
    // Get urgency levels
    const urgencyLevels = await bcrConfigService.getConfigsByType('urgencyLevel');
    
    // Sort urgency levels by display order
    urgencyLevels.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Map urgency level names to title case for display
    const formattedUrgencyLevels = urgencyLevels.map(level => {
      return level.name;
    });
    
    res.render('modules/bcr/submit.njk', {
      title: 'Submit BCR',
      impactAreas: impactAreasWithDescriptions,
      urgencyLevels: formattedUrgencyLevels,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  } catch (error) {
    console.error('Error loading BCR submission form:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: 'Failed to load BCR submission form',
      error,
      user: req.user
    });
  }
}

/**
 * Process a new BCR submission
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
async function processSubmission(req, res) {
  try {
    // Extract form data
    const {
      description,
      impactAreas,
      urgency,
      justification,
      declaration
    } = req.body;
    
    // Validate the submission data
    const errors = validateBcrData({
      description,
      impactAreas,
      urgency,
      justification,
      declaration: declaration === 'on' || declaration === true
    });
    
    // If there are validation errors, re-render the form with errors
    if (Object.keys(errors).length > 0) {
      // Get impact areas and urgency levels for the form
      const impactAreasData = await bcrConfigService.getConfigsByType('impactArea');
      const urgencyLevelsData = await bcrConfigService.getConfigsByType('urgencyLevel');
      
      return res.render('modules/bcr/submit.njk', {
        title: 'Submit BCR',
        errors,
        errorSummary: Object.values(errors),
        values: req.body,
        impactAreas: impactAreasData,
        urgencyLevels: urgencyLevelsData.map(level => level.name),
        user: req.user,
        csrfToken: req.csrfToken ? req.csrfToken() : null
      });
    }
    
    // Create a new submission
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    const yearCode = `${String(currentYear).slice(2)}/${String(nextYear).slice(2)}`;
    
    // Get the next submission number
    const lastSubmission = await Submission.findOne({}, {}, { sort: { 'submissionNumber': -1 } });
    const submissionNumber = lastSubmission ? lastSubmission.submissionNumber + 1 : 1;
    
    // Format the submission code
    const submissionCode = `SUB-${yearCode}-${String(submissionNumber).padStart(3, '0')}`;
    
    // Create the submission
    const submission = new Submission({
      submissionNumber,
      submissionCode,
      fullName: req.user.name,
      emailAddress: req.user.email,
      briefDescription: description,
      detailedDescription: description,
      businessJustification: justification,
      submissionSource: 'Internal',
      urgencyLevel: urgency,
      impactAreas: Array.isArray(impactAreas) ? impactAreas : [impactAreas],
      declaration: declaration === 'on' || declaration === true,
      createdAt: now,
      updatedAt: now,
      submittedById: req.user._id
    });
    
    // Save the submission
    await submission.save();
    
    // Create a BCR record linked to this submission
    const bcr = await bcrService.createBcr(submission._id, {
      currentPhase: 'Initial Assessment',
      status: 'Submitted'
    });
    
    // Create an audit log entry
    const auditLog = new AuditLog({
      action: 'CREATE_BCR',
      userId: req.user._id,
      resourceType: 'BCR',
      resourceId: bcr.id,
      details: {
        submissionId: submission._id,
        submissionCode,
        bcrCode: bcr.bcrCode,
        timestamp: now.toISOString()
      },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: now
    });
    
    await auditLog.save();
    
    // Redirect to the BCR view page
    res.redirect(`/bcr/bcr/${bcr.id}`);
  } catch (error) {
    console.error('Error processing BCR submission:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: 'Failed to process BCR submission',
      error,
      user: req.user
    });
  }
}

/**
 * Display the BCR update confirmation page
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
async function showUpdateConfirmation(req, res) {
  try {
    const bcrId = req.params.id;
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }
    
    res.render('modules/bcr/update-confirmation.njk', {
      title: `Update BCR: ${bcr.bcrCode}`,
      bcr,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  } catch (error) {
    console.error('Error loading BCR update confirmation:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: 'Failed to load BCR update confirmation',
      error,
      user: req.user
    });
  }
}

/**
 * Display the edit BCR form
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
async function showEditForm(req, res) {
  try {
    const bcrId = req.params.id;
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }
    
    // Get impact areas and urgency levels for the form
    const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
    const urgencyLevels = await bcrConfigService.getConfigsByType('urgencyLevel');
    
    // Sort impact areas and urgency levels by display order
    impactAreas.sort((a, b) => a.displayOrder - b.displayOrder);
    urgencyLevels.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Get phases and statuses for the form
    const phases = await bcrConfigService.getConfigsByType('phase');
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    // Sort phases and statuses by display order
    phases.sort((a, b) => a.displayOrder - b.displayOrder);
    statuses.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Get all users for the assignee dropdown
    const users = await User.find({}).sort({ name: 1 });
    
    // Prepare the form data
    const formData = {
      id: bcr.id,
      bcrCode: bcr.bcrCode,
      description: bcr.submission ? bcr.submission.briefDescription : '',
      impactAreas: bcr.impactedAreas || [],
      urgency: bcr.urgencyLevel,
      justification: bcr.submission ? bcr.submission.businessJustification : '',
      currentPhase: bcr.currentPhase,
      status: bcr.status,
      assignedTo: bcr.assignedTo,
      notes: ''
    };
    
    res.render('modules/bcr/edit.njk', {
      title: `Edit BCR: ${bcr.bcrCode}`,
      bcr: formData,
      impactAreas,
      urgencyLevels: urgencyLevels.map(level => level.name),
      phases: phases.map(phase => ({
        id: phase._id,
        value: phase.value,
        name: phase.name
      })),
      statuses: statuses.map(status => ({
        id: status._id,
        value: status.value,
        name: status.name,
        phaseValue: status.phaseValue
      })),
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      })),
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  } catch (error) {
    console.error('Error loading BCR edit form:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: 'Failed to load BCR edit form',
      error,
      user: req.user
    });
  }
}

/**
 * Process BCR edit form submission
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
async function processEditSubmission(req, res) {
  try {
    const bcrId = req.params.id;
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }
    
    // Extract form data
    const {
      description,
      impactAreas,
      urgency,
      justification,
      currentPhase,
      status,
      assignedTo,
      notes
    } = req.body;
    
    // Update the BCR
    const updatedBcr = await bcrService.updateBcr(bcrId, {
      currentPhase,
      status,
      urgencyLevel: urgency,
      impactedAreas: Array.isArray(impactAreas) ? impactAreas : [impactAreas],
      notes,
      userId: req.user._id
    });
    
    // Update the submission if it exists
    if (bcr.submissionId) {
      const submission = await Submission.findById(bcr.submissionId);
      
      if (submission) {
        submission.briefDescription = description;
        submission.detailedDescription = description;
        submission.businessJustification = justification;
        submission.urgencyLevel = urgency;
        submission.impactAreas = Array.isArray(impactAreas) ? impactAreas : [impactAreas];
        submission.updatedAt = new Date();
        
        await submission.save();
      }
    }
    
    // Add a workflow activity
    await bcrService.addWorkflowActivity(bcrId, {
      phase: currentPhase,
      status,
      action: 'Update',
      performedById: req.user._id,
      notes,
      updateBcr: false // Already updated above
    });
    
    // Create an audit log entry
    const auditLog = new AuditLog({
      action: 'UPDATE_BCR',
      userId: req.user._id,
      resourceType: 'BCR',
      resourceId: bcrId,
      details: {
        bcrCode: bcr.bcrCode,
        changes: {
          currentPhase,
          status,
          urgencyLevel: urgency,
          impactedAreas: Array.isArray(impactAreas) ? impactAreas : [impactAreas],
          notes
        },
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date()
    });
    
    await auditLog.save();
    
    // Redirect to the BCR view page
    res.redirect(`/bcr/bcr/${bcrId}`);
  } catch (error) {
    console.error('Error processing BCR edit submission:', error);
    
    try {
      // Get impact areas and urgency levels for re-rendering the form
      const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
      const urgencyLevels = await bcrConfigService.getConfigsByType('urgencyLevel');
      const phases = await bcrConfigService.getConfigsByType('phase');
      const statuses = await bcrConfigService.getConfigsByType('status');
      const users = await User.find({}).sort({ name: 1 });
      
      // Get the selected impact areas from the form
      const selectedImpactAreas = req.body.impactAreas ? 
        (Array.isArray(req.body.impactAreas) ? req.body.impactAreas : [req.body.impactAreas]) : 
        [];

      return renderError(res, {
        status: 500,
        title: 'Error',
        message: 'Failed to update BCR: ' + error.message,
        error,
        user: req.user
      });
    } catch (innerError) {
      return renderError(res, {
        status: 500,
        title: 'Error',
        message: 'Failed to update BCR: ' + error.message,
        user: req.user
      });
    }
  }
}

/**
 * Display the BCR delete confirmation page
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
async function showDeleteConfirmation(req, res) {
  try {
    const bcrId = req.params.id;
    const bcr = await bcrService.getBcrById(bcrId);

    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }

    res.render('modules/bcr/delete-confirmation.njk', {
      title: `Delete BCR: ${bcr.bcrCode}`,
      bcr,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  } catch (error) {
    console.error('Error loading BCR delete confirmation:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: 'Failed to load BCR delete confirmation',
      error,
      user: req.user
    });
  }
}

/**
 * Process BCR deletion
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
async function deleteBcr(req, res) {
  try {
    const bcrId = req.params.id;
    
    // Check if the user confirmed the deletion
    if (!req.body.confirmDelete) {
      return res.redirect(`/bcr/submissions/${bcrId}/delete-confirmation?error=Please confirm deletion`);
    }
    
    // Log the deletion action
    console.log(`Attempting to delete BCR ${bcrId} by user ${req.user ? req.user.email : 'unknown'}`);
    
    // Get the BCR before deleting it
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      req.session.flashMessage = {
        type: 'error',
        text: `Business Change Request with ID ${bcrId} not found.`
      };
      return res.redirect('/bcr/submissions');
    }
    
    // Delete the BCR
    await bcrService.deleteBcr(bcrId);
    
    // Create an audit log entry
    const auditLog = new AuditLog({
      action: 'DELETE_BCR',
      userId: req.user._id,
      resourceType: 'BCR',
      resourceId: bcrId,
      details: {
        bcrCode: bcr.bcrCode,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date()
    });
    
    await auditLog.save();
    
    // Set success message
    req.session.flashMessage = {
      type: 'success',
      text: `Business Change Request ${bcr.bcrCode} has been deleted successfully.`
    };
    
    // Redirect to the BCR list page
    return res.redirect('/bcr/submissions');
  } catch (error) {
    console.error('Error deleting BCR:', error);
    
    // Set error message in session
    req.session.flashMessage = {
      type: 'error',
      text: `Failed to delete BCR: ${error.message}`
    };
    
    return res.redirect('/bcr/submissions');
  }
}

module.exports = {
  showSubmitForm,
  processSubmission,
  showUpdateConfirmation,
  showEditForm,
  processEditSubmission,
  showDeleteConfirmation,
  deleteBcr
};
