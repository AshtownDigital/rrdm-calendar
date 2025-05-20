/**
 * BCR Form Controller
 * Handles BCR submission forms and processing
 */
const { v4: uuidv4 } = require('uuid');
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');
const trelloService = require('../../services/trelloService');
const { prisma } = require('../../config/database');

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

  // Title validation removed: BCRs no longer have a title field.

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
      user: req.user
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
    const errors = validateBcrData(req.body);
    if (Object.keys(errors).length > 0) {
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
      
      // Map urgency level names for display
      const formattedUrgencyLevels = urgencyLevels.map(level => {
        return level.name;
      });
      
      // Render the form again with validation errors
      return res.status(400).render('modules/bcr/submit.njk', {
        title: 'Submit BCR',
        impactAreas: impactAreasWithDescriptions,
        urgencyLevels: formattedUrgencyLevels,
        errors,
        formData: req.body, // Pass the form data back to pre-populate fields
        user: req.user
      });
    }

    // Handle both single selection (string) and multiple selections (array)
    const impactAreasArray = req.body.impactAreas 
      ? (Array.isArray(req.body.impactAreas) ? req.body.impactAreas : [req.body.impactAreas]) 
      : [];
      
    // Process the form data
    const submissionData = {

      description: req.body.description,
      submitterName: req.body.submitterName,
      submitterEmail: req.body.submitterEmail,
      submitterOrganisation: req.body.submitterOrganisation,
      employmentType: req.body.employmentType,
      impact: impactAreasArray.join(', '),
      urgency: req.body.urgency,
      justification: req.body.justification,
      targetDate: req.body.targetDate ? new Date(req.body.targetDate) : null,
      technicalDependencies: req.body.technicalDependencies || '',
      relatedDocuments: req.body.relatedDocuments ? req.body.relatedDocuments.split('\n').filter(url => url.trim()) : [],
      status: 'submitted',
      // Use default admin user ID if req.user is not available
      submitterId: (req.user && req.user.id) ? req.user.id : '00000000-0000-0000-0000-000000000001',
      // Explicitly set the requestedBy field to ensure it's passed correctly
      requestedBy: (req.user && req.user.id) ? req.user.id : '00000000-0000-0000-0000-000000000001',
      notes: `${new Date().toISOString()} - ${(req.user && req.user.name) ? req.user.name : 'Admin User'}: BCR submitted`
    };

    // Create the BCR in the database
    const newBcr = await bcrService.createBcr(submissionData);
    
    // Create a Trello card for the BCR
    try {
      const trelloDescription = `
**Description:** ${submissionData.description}

**Priority:** ${submissionData.priority}
**Impact Areas:** ${submissionData.impact}
**Requested By:** ${req.user.name}
**Target Date:** ${submissionData.targetDate ? new Date(submissionData.targetDate).toLocaleDateString() : 'Not specified'}
**Target Date:** ${bcrData.targetDate ? new Date(bcrData.targetDate).toLocaleDateString() : 'Not specified'}

**Link:** ${req.protocol}://${req.get('host')}/bcr/${newBcr.id}
      `;
      
      const trelloCard = await trelloService.createCard(
        newBcr.bcrNumber,
        trelloDescription,
        newBcr.bcrNumber
      );
      
      if (trelloCard && trelloCard.id) {
        // Store the Trello card ID in the BCR record for future reference
        await bcrService.updateBcr(newBcr.id, {
          notes: newBcr.notes + `\nTrello Card created: ${trelloCard.shortUrl}`
        });
      }
    } catch (trelloError) {
      console.error('Error creating Trello card:', trelloError);
      // Continue with the process even if Trello integration fails
    }
    
    res.redirect(`/bcr/update-confirmation/${newBcr.id}`);
  } catch (error) {
    console.error('Error in BCR submission:', error);
    try {
      const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
      return renderError(res, {
        status: 500,
        title: 'Error',
        message: 'Failed to save submission: ' + error.message,
        error,
        user: req.user
      });
    } catch (innerError) {
      return renderError(res, {
        status: 500,
        title: 'Error',
        message: 'Failed to save submission: ' + error.message,
        user: req.user
      });
    }
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
      title: 'BCR Update Confirmation',
      bcr,
      user: req.user
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
    
    const selectedImpactAreas = bcr.impact ? bcr.impact.split(', ') : [];
    
    // Get urgency levels for the form
    const urgencyLevels = await bcrConfigService.getConfigsByType('urgencyLevel');
    urgencyLevels.sort((a, b) => a.displayOrder - b.displayOrder);

    // Get user information if available
    const userService = require('../../services/userService');
    let submitterInfo = null;
    try {
      submitterInfo = await userService.getUserById(bcr.requestedBy);
    } catch (error) {
      console.warn(`Could not find user with ID ${bcr.requestedBy}, using default values`);
    }

    // Parse related documents if they exist
    let relatedDocs = [];
    try {
      if (bcr.relatedDocuments) {
        if (typeof bcr.relatedDocuments === 'string') {
          relatedDocs = bcr.relatedDocuments.split(',').map(doc => doc.trim());
        } else if (Array.isArray(bcr.relatedDocuments)) {
          relatedDocs = bcr.relatedDocuments;
        }
      }
    } catch (error) {
      console.warn('Error parsing related documents:', error);
    }

    // Map BCR data to submission format expected by the template
    const submission = {
      id: bcr.id,
      bcrId: bcr.id,
      bcrCode: bcr.bcrNumber,
      description: bcr.description || '',
      priority: bcr.priority || 'medium',
      impact: bcr.impact || '',
      requestedBy: bcr.requestedBy,
      submitterId: bcr.requestedBy,
      createdAt: bcr.createdAt,
      updatedAt: bcr.updatedAt,
      dateSubmitted: bcr.createdAt,
      lastUpdated: bcr.updatedAt,
      submitterName: submitterInfo ? submitterInfo.name : (bcr.submitterName || 'Admin User'),
      submitterEmail: submitterInfo ? submitterInfo.email : (bcr.submitterEmail || 'admin@example.com'),
      submitterOrganisation: bcr.submitterOrganisation || 'Register Team',
      employmentType: bcr.employmentType || 'Internal',
      justification: bcr.justification || bcr.notes || '',
      technicalDependencies: bcr.technicalDependencies || '',
      relatedDocuments: relatedDocs,
      targetDate: bcr.targetDate ? new Date(bcr.targetDate) : null,
      implementationDate: bcr.implementationDate ? new Date(bcr.implementationDate) : null,
      statusDisplay: bcr.status ? bcr.status.replace(/_/g, ' ').toUpperCase() : 'NEW SUBMISSION',
      impactAreas: selectedImpactAreas,
      changeType: selectedImpactAreas,
      urgency: bcr.priority ? bcr.priority.charAt(0).toUpperCase() + bcr.priority.slice(1) : 'Medium',
      currentPhaseName: 'Current Status',
      currentPhaseId: 'new_submission',
      status: 'new_submission'
    };

    res.render('modules/bcr/edit-submission.njk', {
      title: `Edit BCR: ${bcr.bcrNumber || bcr.id}`,
      bcr,
      submission, // Add the mapped submission object
      impactAreas: impactAreasWithDescriptions,
      selectedImpactAreas,
      urgencyLevels,
      user: req.user
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
    const existingBcr = await bcrService.getBcrById(bcrId);

    if (!existingBcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }

    const errors = validateBcrData(req.body);
    if (Object.keys(errors).length > 0) {
      // Get impact areas and their descriptions for the form
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
      
      // Get selected impact areas from form data or existing BCR
      const selectedImpactAreas = req.body.impactAreas ? 
        (Array.isArray(req.body.impactAreas) ? req.body.impactAreas : [req.body.impactAreas]) : 
        (existingBcr.impact ? existingBcr.impact.split(', ') : []);
      
      // Render the form again with validation errors
      return res.status(400).render('modules/bcr/edit-submission.njk', {
        title: `Edit BCR: ${existingBcr.bcrNumber}`,
        bcr: {
          ...existingBcr,
          ...req.body // Override with form data
        },
        impactAreas: impactAreasWithDescriptions,
        selectedImpactAreas,
        errors,
        formData: req.body, // Pass the form data back to pre-populate fields
        user: req.user
      });
    }

    // Get the current phase for this BCR based on its status
    const { getPhaseIdForStatus } = require('../../utils/workflowUtils');
    const currentPhaseId = await getPhaseIdForStatus(existingBcr.status);
    const { WORKFLOW_PHASES } = require('../../utils/workflowUtils');
    
    // Handle both single selection (string) and multiple selections (array)
    const impactAreasArray = req.body.impactAreas 
      ? (Array.isArray(req.body.impactAreas) ? req.body.impactAreas : [req.body.impactAreas]) 
      : [];
    
    // Prepare the BCR data for update
    const bcrData = {

      description: req.body.description || '',
      priority: req.body.priority || existingBcr.priority || 'medium',
      impact: impactAreasArray.join(', '),
      notes: existingBcr.notes + `\n${new Date().toISOString()} - ${req.user.name}: Updated BCR details`,
      targetDate: req.body.targetDate ? new Date(req.body.targetDate) : existingBcr.targetDate
    };
    
    // If the BCR is in the Submission phase, ensure it maintains the 'submitted' status
    if (currentPhaseId === WORKFLOW_PHASES.SUBMISSION) {
      bcrData.status = 'submitted';
    }

    const updatedBcr = await bcrService.updateBcr(bcrId, bcrData);
    res.redirect(`/bcr/update-confirmation/${updatedBcr.id}`);
  } catch (error) {
    console.error('Error updating BCR:', error);
    try {
      const bcrId = req.params.id;
      const bcr = await bcrService.getBcrById(bcrId);
      const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
      const selectedImpactAreas = req.body.impactAreas ? 
        (Array.isArray(req.body.impactAreas) ? req.body.impactAreas : [req.body.impactAreas]) : 
        (bcr && bcr.impact ? bcr.impact.split(', ') : []);

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
      title: `Delete BCR: ${bcr.bcrNumber}`,
      bcr,
      user: req.user
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
    
    // Use transactions to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // First check if the BCR exists
      const existingBcr = await tx.bcrs.findUnique({
        where: { id: bcrId }
      });
      
      if (!existingBcr) {
        // Return null to indicate BCR not found
        return null;
      }
      
      // Delete related submissions
      await tx.submission.deleteMany({
        where: { bcrId: bcrId }
      });
      
      // Delete related workflow activities
      await tx.bcrWorkflowActivity.deleteMany({
        where: { bcrId: bcrId }
      });
      
      // Delete the BCR
      await tx.bcrs.delete({
        where: { id: bcrId }
      });
      
      // Return the deleted BCR info for the success message
      return {
        id: existingBcr.id,
        bcrNumber: existingBcr.bcrNumber
      };
    });
    
    // Check if the BCR was found and deleted
    if (!result) {
      req.session.flashMessage = {
        type: 'error',
        text: `Business Change Request with ID ${bcrId} not found.`
      };
      return res.redirect('/bcr/submissions');
    }
    
    // Set success message
    req.session.flashMessage = {
      type: 'success',
      text: `Business Change Request ${result.bcrNumber || result.id} has been deleted successfully.`
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
