/**
 * BCR Phase-Status Controller
 * Handles CRUD operations for BCR phase and status configurations
 */
const bcrConfigService = require('../../services/bcrConfigService');
const workflowPhaseService = require('../../services/workflowPhaseService');
const { v4: uuidv4 } = require('uuid');
const workflowUtils = require('../../utils/workflowUtils');
const { logger } = require('../../utils/logger');

/**
 * Display the phase-status mapping list page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listPhaseStatusMappings = async (req, res) => {
  try {
    // Get configuration data from database
    let phases = await workflowPhaseService.getAllPhases();
    // For statuses, flatten current/completed statuses from phases
    const statuses = phases.flatMap(phase => [
      { name: phase.currentStatus, type: 'current', phaseName: phase.name, phaseId: phase.id },
      { name: phase.completedStatus, type: 'completed', phaseName: phase.name, phaseId: phase.id },
    ].filter(s => s.name));
    // Trello mappings: if still needed, keep config-based for now
    const trelloMappings = await bcrConfigService.getConfigsByType('trello_list_mapping');
    
    // Debug logging
    console.log('Phases:', phases);
    console.log('Statuses:', statuses);
    
    // Sort phases by their value
    phases = phases.sort((a, b) => a.order - b.order);
    
    // Create a mapping of phases to statuses for the UI
    const phaseStatusMapping = {};
    
    // Create a mapping from phase value to phase id
    // Map by phase name for legacy compatibility, but prefer id/order
    const phaseNameToIdMap = {};
    phases.forEach(phase => {
      phaseNameToIdMap[phase.name] = phase.id;
    });
    
    // Initialize the mapping with empty arrays for each phase
    phases.forEach(phase => {
      phaseStatusMapping[phase.id] = [];
    });
    
    // Get phase description and status description entries
    // If needed, retain config-based descriptions, else remove if not used
    const phaseDescriptions = await bcrConfigService.getConfigsByType('phase_description');
    const statusDescriptions = await bcrConfigService.getConfigsByType('status_description');
    
    // Create a mapping of phase descriptions
    const phaseDescriptionMap = {};
    phaseDescriptions.forEach(desc => {
      const phaseValue = desc.name.replace('description:', '');
      phaseDescriptionMap[phaseValue] = desc.value;
    });
    
    // Create a mapping of status descriptions
    const statusDescriptionMap = {};
    statusDescriptions.forEach(desc => {
      const statusName = desc.name.replace('description:', '');
      statusDescriptionMap[statusName] = desc.value;
    });
    
    // Populate the mapping with statuses
    statuses.forEach(status => {
      // Map status to phase by phaseId
      const phaseId = status.phaseId;
      if (phaseId && phaseStatusMapping[phaseId]) {
        phaseStatusMapping[phaseId].push(status);
      }
    });
    
    // Create a mapping of phases to Trello lists
    const phaseTrelloMapping = {};
    trelloMappings.forEach(mapping => {
      phaseTrelloMapping[mapping.value] = mapping.name;
    });
    
    // Add nextPhase property to each phase for the workflow diagram
    phases.forEach((phase, index) => {
      // If not the last phase, set nextPhase to the next phase's id
      if (index < phases.length - 1) {
        phase.nextPhase = phases[index + 1].id;
      } else {
        phase.nextPhase = null;
      }
      // Add Trello list name if available
      phase.trelloList = phaseTrelloMapping[phase.name] || 'Not mapped';
    });
    
    // Render the template with data
    res.render('modules/bcr/phase-status-mapping/list.njk', {
      title: 'BCR Phase-Status Mapping',
      phases,
      statuses,
      phaseStatusMapping,
      phaseTrelloMapping,
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading BCR phase-status mapping:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR phase-status mapping',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Display the create phase form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCreatePhaseForm = async (req, res) => {
  try {
    // Get existing phases for reference
    const phases = await bcrConfigService.getConfigsByType('phase');
    
    // Calculate next available phase value and display order
    let nextValue = '1';
    let nextDisplayOrder = 10;
    
    if (phases.length > 0) {
      // Find the highest current value and display order
      const highestValue = Math.max(...phases.map(p => parseInt(p.value, 10)));
      const highestDisplayOrder = Math.max(...phases.map(p => p.displayOrder));
      
      nextValue = (highestValue + 1).toString();
      nextDisplayOrder = highestDisplayOrder + 10;
    }
    
    res.render('modules/bcr/phase-status-mapping/create-phase.njk', {
      title: 'Create New Phase',
      nextValue,
      nextDisplayOrder,
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading create phase form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load create phase form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process the create phase form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createPhase = async (req, res) => {
  try {
    const { name, order, currentStatus, completedStatus } = req.body;
    // Validate required fields
    if (!name) {
      return res.status(400).render('modules/bcr/phase-status-mapping/create-phase.njk', {
        title: 'Create New Phase with Statuses',
        error: 'Name is required',
        formData: req.body,
        user: req.user
      });
    }
    // Create the phase in the new model
    const phase = await workflowPhaseService.createPhase({
      name,
      order: order ? parseInt(order, 10) : 0,
      currentStatus: currentStatus || '',
      completedStatus: completedStatus || ''
    });
    // Redirect to the confirmation page
    res.redirect(`/bcr/phase-status-mapping/create-phase-confirmation?id=${phase.id}`);
  } catch (error) {
    logger.error('Error creating phase with statuses:', error);
    res.status(500).render('modules/bcr/phase-status-mapping/create-phase.njk', {
      title: 'Create New Phase with Statuses',
      error: 'Failed to create phase with statuses',
      formData: req.body,
      user: req.user
    });
  }
};

/**
 * Display the create phase confirmation page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCreatePhaseConfirmation = async (req, res) => {
  try {
    const { id } = req.query;
    // Get the newly created phase
    const phase = await workflowPhaseService.getPhaseById(id);
    if (!phase) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Phase not found',
        error: {},
        user: req.user
      });
    }
    res.render('modules/bcr/phase-status-mapping/create-phase-confirmation.njk', {
      title: 'Phase Created',
      phase,
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading create phase confirmation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load create phase confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Display the create status form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCreateStatusForm = async (req, res) => {
  try {
    // Get phases for the dropdown
    const phases = await workflowPhaseService.getAllPhases();
    // Get existing statuses for reference
    const statuses = await workflowPhaseService.getAllStatuses();
    // Calculate next available display order
    let nextDisplayOrder = 10;
    if (statuses.length > 0) {
      // Find the highest current display order
      const highestDisplayOrder = Math.max(...statuses.map(s => s.displayOrder));
      nextDisplayOrder = highestDisplayOrder + 10;
    }
    // Pre-select phase if provided in query (either by ID or value)
    let preSelectedPhase = null;
    const { phaseId, phaseValue } = req.query;
    if (phaseId) {
      preSelectedPhase = phaseId;
    } else if (phaseValue) {
      // Find the phase with the matching value
      const matchingPhase = phases.find(p => p.value === phaseValue);
      if (matchingPhase) {
        preSelectedPhase = matchingPhase.id;
      }
    }
    res.render('modules/bcr/phase-status-mapping/create-status.njk', {
      title: 'Create New Status',
      phases,
      nextDisplayOrder,
      preSelectedPhase,
      formData: { phaseValue },
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading create status form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load create status form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process the create status form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createStatus = async (req, res) => {
  try {
    const { name, phaseId, displayOrder } = req.body;
    // Validate required fields
    if (!name || !phaseId) {
      // Get phases for the dropdown
      const phases = await workflowPhaseService.getAllPhases();
      return res.status(400).render('modules/bcr/phase-status-mapping/create-status.njk', {
        title: 'Create New Status',
        error: 'Name and phase are required fields',
        phases,
        formData: req.body,
        user: req.user
      });
    }
    // Create the new status
    const status = await workflowPhaseService.createStatus({
      name,
      phaseId,
      displayOrder: parseInt(displayOrder, 10) || 0
    });
    // Redirect to the confirmation page
    res.redirect(`/bcr/phase-status-mapping/create-status-confirmation?id=${status.id}`);
  } catch (error) {
    logger.error('Error creating status:', error);
    // Get phases for the dropdown
    const phases = await workflowPhaseService.getAllPhases();
    res.status(500).render('modules/bcr/phase-status-mapping/create-status.njk', {
      title: 'Create New Status',
      error: 'Failed to create status',
      phases,
      formData: req.body,
      user: req.user
    });
  }
};

/**
 * Display the create status confirmation page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCreateStatusConfirmation = async (req, res) => {
  try {
    const { id } = req.query;
    // Get the newly created status
    const status = await workflowPhaseService.getStatusById(id);
    if (!status) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Status not found',
        error: {},
        user: req.user
      });
    }
    // Get the associated phase
    const phase = await workflowPhaseService.getPhaseById(status.phaseId);
    res.render('modules/bcr/phase-status-mapping/create-status-confirmation.njk', {
      title: 'Status Created',
      status,
      phase,
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading create status confirmation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load create status confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Display the phase detail view
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showPhaseDetail = async (req, res) => {
  try {
    const { id } = req.params;
    // Get the phase
    const phase = await workflowPhaseService.getPhaseById(id);
    if (!phase) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Phase not found',
        error: {},
        user: req.user
      });
    }
    // Get all statuses
    const statuses = await workflowPhaseService.getAllStatuses();
    // Filter statuses for this phase
    const phaseStatuses = statuses.filter(status => status.phaseId === id);
    res.render('modules/bcr/phase-status-mapping/phase-detail.njk', {
      title: `Phase: ${phase.name}`,
      phase,
      statuses: phaseStatuses,
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading phase detail view:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load phase detail view',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Display the edit phase form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditPhaseForm = async (req, res) => {
  try {
    const { id } = req.params;
    // Get the phase to edit
    const phase = await workflowPhaseService.getPhaseById(id);
    if (!phase) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Phase not found',
        error: {},
        user: req.user
      });
    }
    // Get all statuses
    const statuses = await workflowPhaseService.getAllStatuses();
    // Find the in progress and completed statuses for this phase
    const inProgressStatus = statuses.find(status => status.phaseId === phase.id && status.name === phase.currentStatus);
    const completedStatus = statuses.find(status => status.phaseId === phase.id && status.name === phase.completedStatus);
    res.render('modules/bcr/phase-status-mapping/edit-phase.njk', {
      title: 'Edit Phase',
      phase,
      inProgressStatus: inProgressStatus || { name: '' },
      completedStatus: completedStatus || { name: '' },
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading edit phase form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load edit phase form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process the edit phase form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePhase = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order, currentStatus, completedStatus } = req.body;
    // Validate required fields
    if (!name) {
      // Get the phase to edit
      const phase = await workflowPhaseService.getPhaseById(id);
      return res.status(400).render('modules/bcr/phase-status-mapping/edit-phase.njk', {
        title: 'Edit Phase',
        error: 'Name is required',
        phase: { ...phase, ...req.body },
        inProgressStatus: { name: req.body.inProgressStatus || '' },
        completedStatus: { name: req.body.completedStatus || '' },
        user: req.user
      });
    }
    // Update the phase
    const updatedPhase = await workflowPhaseService.updatePhase(id, {
      name,
      order: order ? parseInt(order, 10) : 0,
      currentStatus: currentStatus || '',
      completedStatus: completedStatus || ''
    });
    // Redirect to the confirmation page
    res.redirect(`/bcr/phase-status-mapping/edit-phase-confirmation?id=${updatedPhase.id}`);
  } catch (error) {
    logger.error('Error updating phase:', error);
    // Get the phase to edit
    const phase = await workflowPhaseService.getPhaseById(req.params.id);
    res.status(500).render('modules/bcr/phase-status-mapping/edit-phase.njk', {
      title: 'Edit Phase',
      error: 'Failed to update phase',
      phase: { ...phase, ...req.body },
      inProgressStatus: { name: req.body.inProgressStatus || '' },
      completedStatus: { name: req.body.completedStatus || '' },
      user: req.user
    });
  }
};

/**
 * Display the edit phase confirmation page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditPhaseConfirmation = async (req, res) => {
  try {
    const { id } = req.query;
    // Get the updated phase
    const phase = await workflowPhaseService.getPhaseById(id);
    if (!phase) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Phase not found',
        error: {},
        user: req.user
      });
    }
    res.render('modules/bcr/phase-status-mapping/edit-phase-confirmation.njk', {
      title: 'Phase Updated',
      phase,
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading edit phase confirmation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load edit phase confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Display the edit status form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditStatusForm = async (req, res) => {
  try {
    const { id } = req.params;
    // Get the status to edit
    const status = await workflowPhaseService.getStatusById(id);
    if (!status) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Status not found',
        error: {},
        user: req.user
      });
    }
    // Get phases for the dropdown
    const phases = await workflowPhaseService.getAllPhases();
    res.render('modules/bcr/phase-status-mapping/edit-status.njk', {
      title: 'Edit Status',
      status,
      phases,
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading edit status form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load edit status form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process the edit status form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    // Validate required fields
    if (!name) {
      // Get the status to edit
      const status = await workflowPhaseService.getStatusById(id);
      // Get phases for the dropdown
      const phases = await workflowPhaseService.getAllPhases();
      res.status(400).render('modules/bcr/phase-status-mapping/edit-status.njk', {
        title: 'Edit Status',
        error: 'Name is required',
        status: { ...status, ...req.body },
        phases,
        user: req.user
      });
      return;
    }
    // Update the status
    const updatedStatus = await workflowPhaseService.updateStatus(id, { name });
    res.redirect(`/bcr/phase-status-mapping/edit-status-confirmation?id=${id}`);
  } catch (error) {
    logger.error('Error updating status:', error);
    // Get the status to edit
    const status = await workflowPhaseService.getStatusById(req.params.id);
    // Get phases for the dropdown
    const phases = await workflowPhaseService.getAllPhases();
    res.status(500).render('modules/bcr/phase-status-mapping/edit-status.njk', {
      title: 'Edit Status',
      error: 'Failed to update status',
      status: { ...status, ...req.body },
      phases,
      user: req.user
    });
  }
};

/**
 * Display the edit status confirmation page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditStatusConfirmation = async (req, res) => {
  try {
    const { id } = req.query;
    
    // Get the updated status
    const status = await bcrConfigService.getConfigById(id);
    
    if (!status) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Status not found',
        error: {},
        user: req.user
      });
    }
    
    // Get the associated phase
    const phase = await bcrConfigService.getConfigById(status.value);
    
    res.render('modules/bcr/phase-status-mapping/edit-status-confirmation.njk', {
      title: 'Status Updated',
      status,
      phase,
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading edit status confirmation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load edit status confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Display the delete phase warning page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showDeletePhaseWarning = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the phase to delete
    const phase = await bcrConfigService.getConfigById(id);
    
    if (!phase) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Phase not found',
        error: {},
        user: req.user
      });
    }
    
    // Get associated statuses
    const statuses = await bcrConfigService.getConfigsByType('status');
    const associatedStatuses = statuses.filter(s => s.value === phase.id);
    
    res.render('modules/bcr/phase-status-mapping/delete-phase-warning.njk', {
      title: 'Delete Phase',
      phase,
      associatedStatuses,
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading delete phase warning:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load delete phase warning',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process the delete phase request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deletePhase = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the phase to delete
    const phase = await bcrConfigService.getConfigById(id);
    
    if (!phase) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Phase not found',
        error: {},
        user: req.user
      });
    }
    
    // Get associated statuses
    const statuses = await bcrConfigService.getConfigsByType('status');
    const associatedStatuses = statuses.filter(s => s.value === phase.id);
    
    // Delete associated statuses first
    for (const status of associatedStatuses) {
      await bcrConfigService.deleteConfig(status.id);
    }
    
    // Delete the phase
    await bcrConfigService.deleteConfig(id);
    
    // Redirect to the confirmation page
    res.redirect('/bcr/phase-status-mapping/delete-phase-confirmation');
  } catch (error) {
    logger.error('Error deleting phase:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to delete phase',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Display the delete phase confirmation page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showDeletePhaseConfirmation = async (req, res) => {
  try {
    res.render('modules/bcr/phase-status-mapping/delete-phase-confirmation.njk', {
      title: 'Phase Deleted',
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading delete phase confirmation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load delete phase confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Display the delete status warning page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showDeleteStatusWarning = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the status to delete
    const status = await bcrConfigService.getConfigById(id);
    
    if (!status) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Status not found',
        error: {},
        user: req.user
      });
    }
    
    // Get the associated phase
    const phase = await bcrConfigService.getConfigById(status.value);
    
    res.render('modules/bcr/phase-status-mapping/delete-status-warning.njk', {
      title: 'Delete Status',
      status,
      phase,
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading delete status warning:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load delete status warning',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process the delete status request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    // Get the status to delete
    const status = await workflowPhaseService.getStatusById(id);
    if (!status) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Status not found',
        error: {},
        user: req.user
      });
    }
    // Delete the status
    await workflowPhaseService.deleteStatus(id);
    // Redirect to the confirmation page
    res.redirect('/bcr/phase-status-mapping/delete-status-confirmation');
  } catch (error) {
    logger.error('Error deleting status:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to delete status',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Display the delete status confirmation page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showDeleteStatusConfirmation = async (req, res) => {
  try {
    res.render('modules/bcr/phase-status-mapping/delete-status-confirmation.njk', {
      title: 'Status Deleted',
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading delete status confirmation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load delete status confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

module.exports = {
  listPhaseStatusMappings,
  showCreatePhaseForm,
  createPhase,
  showCreatePhaseConfirmation,
  showCreateStatusForm,
  createStatus,
  showCreateStatusConfirmation,
  showPhaseDetail,
  showEditPhaseForm,
  updatePhase,
  showEditPhaseConfirmation,
  showEditStatusForm,
  updateStatus,
  showEditStatusConfirmation,
  showDeletePhaseWarning,
  deletePhase,
  showDeletePhaseConfirmation,
  showDeleteStatusWarning,
  deleteStatus,
  showDeleteStatusConfirmation
};
