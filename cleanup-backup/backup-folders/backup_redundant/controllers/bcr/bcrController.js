/**
 * BCR Controller
 * Handles BCR viewing and updating
 */
const { validate: isUuid } = require('uuid');
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');
const slaService = require('../../services/slaService');

/**
 * Helper to validate if a string is a UUID or BCR number
 * @param {string} id
 * @returns {boolean}
 */
function isValidBcrId(id) {
  if (!id) return false;
  const isBcrNumber = /^BCR-\d{4}-\d{4}$/.test(id);
  return isBcrNumber || isUuid(id);
}

/**
 * Render an error page with consistent formatting
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
 * View BCR details
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function viewBCR(req, res) {
  try {
    const bcrId = req.params.id;
    
    if (!isValidBcrId(bcrId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        error: { details: `Expected a UUID or BCR number, got: ${bcrId}` },
        user: req.user
      });
    }

    // Get the BCR using the service
    const bcr = await bcrService.getBcrById(bcrId);

    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }

    // Ensure the BCR has the expected structure for the template
    if (!bcr.history) bcr.history = [];
    if (!bcr.workflowHistory) bcr.workflowHistory = [];
    
    // Get all the data needed for the template
    const [statuses, phases, phaseStatusMappings] = await Promise.all([
      bcrConfigService.getConfigsByType('status'),
      bcrConfigService.getConfigsByType('phase'),
      bcrConfigService.getPhaseStatusMappings()
    ]);

    // Get SLA status for the BCR
    const slaStatus = await slaService.getSlaStatus(bcr.id);
    
    // Enhance BCR object with current phase information
    const currentPhase = phases.find(phase => phase.value === bcr.currentPhaseId);
    if (currentPhase) {
      bcr.currentPhaseName = currentPhase.name;
    } else {
      bcr.currentPhaseName = 'Unknown Phase';
    }
    
    // Get the status display name based on the database status value
    let statusDisplay = bcr.status;
    if (bcr.status) {
      // Convert snake_case to Title Case for display
      statusDisplay = bcr.status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    bcr.statusDisplay = statusDisplay;
    
    // Render the template with data
    res.render('modules/bcr/bcr-details.njk', {
      title: `BCR ${bcr.bcrNumber} - ${bcr.title}`,
      bcr,
      phases,
      statuses,
      phaseStatusMappings,
      slaStatus,
      user: req.user
    });
  } catch (error) {
    console.error('Error in viewBCR:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: `Failed to load BCR: ${error.message}`,
      error,
      user: req.user
    });
  }
}

/**
 * Display the BCR update form
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function updateBCRForm(req, res) {
  try {
    const bcrId = req.params.id;
    
    if (!isValidBcrId(bcrId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        user: req.user
      });
    }

    // Get the BCR using the service
    const bcr = await bcrService.getBcrById(bcrId);

    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }

    // Get all the data needed for the form
    const [impactAreas, urgencyLevels, users, phases, statuses] = await Promise.all([
      bcrConfigService.getConfigsByType('impact_area'),
      bcrConfigService.getConfigsByType('urgencyLevel'),
      prisma.users.findMany({ orderBy: { name: 'asc' } }),
      bcrConfigService.getConfigsByType('phase'),
      bcrConfigService.getConfigsByType('status')
    ]);
    
    // Render the update form
    res.render('modules/bcr/update-bcr.njk', {
      title: `Update BCR ${bcr.bcrNumber}`,
      bcr,
      impactAreas,
      urgencyLevels,
      users,
      phases,
      statuses,
      user: req.user
    });
  } catch (error) {
    console.error('Error in updateBCRForm:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: `Failed to load BCR update form: ${error.message}`,
      error,
      user: req.user
    });
  }
}

/**
 * Process a BCR update
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function submitBCRUpdate(req, res) {
  try {
    const bcrId = req.params.id;
    
    if (!isValidBcrId(bcrId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        user: req.user
      });
    }

    // Extract form data
    const {
      title,
      description,
      impactArea,
      urgencyLevel,
      status,
      currentPhaseId,
      assignedTo,
      notes
    } = req.body;
    
    // Update the BCR
    const updatedBcr = await bcrService.updateBcr(bcrId, {
      title,
      description,
      impactArea,
      urgencyLevel,
      status,
      currentPhaseId,
      assignedTo,
      notes: notes ? `${notes}\n\nUpdated by: ${req.user.name} on ${new Date().toISOString()}` : undefined,
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    
    // Redirect to the confirmation page
    res.redirect(`/bcr/bcr/${bcrId}/confirm?action=update`);
  } catch (error) {
    console.error('Error in submitBCRUpdate:', error);
    req.flash('error', `Failed to update BCR: ${error.message}`);
    res.redirect(`/bcr/bcr/${req.params.id}/update`);
  }
}

/**
 * Display a confirmation page after a BCR action
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function confirmationPage(req, res) {
  try {
    const bcrId = req.params.id;
    const action = req.query.action || 'update';
    
    if (!isValidBcrId(bcrId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        user: req.user
      });
    }

    // Get the BCR using the service
    const bcr = await bcrService.getBcrById(bcrId);

    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }
    
    // Set confirmation message based on action
    let confirmationMessage = '';
    let confirmationTitle = '';
    
    switch (action) {
      case 'update':
        confirmationTitle = 'BCR Updated';
        confirmationMessage = `BCR ${bcr.bcrNumber} has been successfully updated.`;
        break;
      case 'review':
        confirmationTitle = 'BCR Reviewed';
        confirmationMessage = `BCR ${bcr.bcrNumber} has been successfully reviewed.`;
        break;
      case 'phase':
        confirmationTitle = 'Phase Updated';
        confirmationMessage = `The phase for BCR ${bcr.bcrNumber} has been successfully updated.`;
        break;
      default:
        confirmationTitle = 'Action Completed';
        confirmationMessage = `Action on BCR ${bcr.bcrNumber} has been completed successfully.`;
    }
    
    // Render the confirmation page
    res.render('modules/bcr/confirmation.njk', {
      title: confirmationTitle,
      message: confirmationMessage,
      bcr,
      user: req.user
    });
  } catch (error) {
    console.error('Error in confirmationPage:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: `Failed to load confirmation page: ${error.message}`,
      error,
      user: req.user
    });
  }
}

/**
 * Display a warning page for restricted actions
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function restrictedActionPage(req, res) {
  try {
    const bcrId = req.params.id;
    const action = req.query.action || 'delete';
    
    if (!isValidBcrId(bcrId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        user: req.user
      });
    }

    // Get the BCR using the service
    const bcr = await bcrService.getBcrById(bcrId);

    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }
    
    // Set warning message based on action
    let warningMessage = '';
    let warningTitle = '';
    
    switch (action) {
      case 'delete':
        warningTitle = 'Delete BCR';
        warningMessage = `Are you sure you want to delete BCR ${bcr.bcrNumber}? This action cannot be undone.`;
        break;
      case 'phase-rollback':
        warningTitle = 'Phase Rollback';
        warningMessage = `Are you sure you want to roll back the phase for BCR ${bcr.bcrNumber}? This may affect workflow history.`;
        break;
      default:
        warningTitle = 'Warning';
        warningMessage = `You are about to perform a restricted action on BCR ${bcr.bcrNumber}. Please confirm.`;
    }
    
    // Render the warning page
    res.render('modules/bcr/warning.njk', {
      title: warningTitle,
      message: warningMessage,
      bcr,
      action,
      user: req.user
    });
  } catch (error) {
    console.error('Error in restrictedActionPage:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: `Failed to load warning page: ${error.message}`,
      error,
      user: req.user
    });
  }
}

module.exports = {
  viewBCR,
  updateBCRForm,
  submitBCRUpdate,
  confirmationPage,
  restrictedActionPage
};
