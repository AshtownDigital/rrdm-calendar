/**
 * BCR Workflow Controller
 * Handles BCR workflow management
 */
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');

/**
 * Display the BCR workflow management page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showWorkflow = async (req, res) => {
  try {
    // Get configuration data from database using services
    const phases = await bcrConfigService.getConfigsByType('phase');
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    // Create a mapping of phases to statuses for the UI
    const phaseStatusMapping = {};
    
    // Initialize the mapping with empty arrays for each phase
    phases.forEach(phase => {
      phaseStatusMapping[phase.id] = [];
    });
    
    // Populate the mapping with statuses
    statuses.forEach(status => {
      const phaseId = status.value;
      if (phaseStatusMapping[phaseId]) {
        phaseStatusMapping[phaseId].push(status);
      }
    });
    
    // Render the template with data
    res.render('modules/bcr/workflow', {
      title: 'BCR Workflow Management',
      phases,
      statuses,
      phaseStatusMapping,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading BCR workflow:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR phase-status mapping',
      error,
      user: req.user
    });
  }
};

/**
 * Update the BCR workflow configuration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateWorkflow = async (req, res) => {
  try {
    const { phases, statuses } = req.body;
    
    // Update phases
    if (phases && Array.isArray(phases)) {
      for (const phase of phases) {
        await bcrConfigService.updateConfig(phase.id, {
          name: phase.name,
          value: phase.value,
          type: 'phase'
        });
      }
    }
    
    // Update statuses
    if (statuses && Array.isArray(statuses)) {
      for (const status of statuses) {
        await bcrConfigService.updateConfig(status.id, {
          name: status.name,
          value: status.phaseId, // Link status to phase
          type: 'status'
        });
      }
    }
    
    // Redirect back to the workflow page
    res.redirect('/bcr/workflow');
  } catch (error) {
    console.error('Error updating BCR workflow:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to update BCR workflow configuration',
      error,
      user: req.user
    });
  }
};

module.exports = {
  showWorkflow,
  updateWorkflow
};
