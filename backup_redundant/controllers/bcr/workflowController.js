/**
 * BCR Workflow Controller
 * Handles BCR workflow management based on BPMN process
 */
const bcrService = require('../../services/bcrService');
const workflowPhaseService = require('../../services/workflowPhaseService');
const bcrWorkflowService = require('../../services/bcrWorkflowService');
const bcrConfigService = require('../../services/bcrConfigService');
const { logger } = require('../../utils/logger');

/**
 * Display the BCR workflow management page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showWorkflow = async (req, res) => {
  try {
    // Get configuration data from database using services
    const phaseConfigs = await bcrConfigService.getConfigsByType('phase');
    const statusConfigs = await bcrConfigService.getConfigsByType('status');
    const phaseStatusMappings = await bcrConfigService.getConfigsByType('phase_inProgressStatus');
    const phaseCompletedStatusMappings = await bcrConfigService.getConfigsByType('phase_completedStatus');
    const phaseTransitions = await bcrConfigService.getConfigsByType('phase_transition');
    
    // Process phases for the BPMN diagram
    const phases = phaseConfigs.map(config => {
      try {
        const phaseData = JSON.parse(config.value);
        return {
          id: phaseData.id.toString(),
          name: config.name,
          displayName: phaseData.displayName || config.name,
          swimlane: phaseData.swimlane || 'default',
          order: phaseData.order || 0,
          description: phaseData.description || ''
        };
      } catch (e) {
        return {
          id: config.value,
          name: config.name,
          displayName: config.name,
          swimlane: 'default',
          order: 0,
          description: ''
        };
      }
    }).sort((a, b) => a.order - b.order);
    
    // Process statuses
    const statuses = statusConfigs.map(config => {
      return {
        id: config.id,
        name: config.name,
        displayName: config.name.replace(/_/g, ' ')
      };
    });
    
    // Create a mapping of phases to statuses for the UI
    const phaseStatusMapping = {};
    
    // Initialize the mapping with empty arrays for each phase
    phases.forEach(phase => {
      phaseStatusMapping[phase.id] = [];
    });
    
    // Populate the mapping with in-progress statuses
    phaseStatusMappings.forEach(mapping => {
      const phaseIdMatch = mapping.name.match(/phase(\d+)_inProgressStatus/);
      if (phaseIdMatch) {
        const phaseId = phaseIdMatch[1];
        const statusName = mapping.value;
        const status = statuses.find(s => s.name === statusName);
        
        if (status && phaseStatusMapping[phaseId]) {
          phaseStatusMapping[phaseId].push({
            ...status,
            type: 'in-progress'
          });
        }
      }
    });
    
    // Populate the mapping with completed statuses
    phaseCompletedStatusMappings.forEach(mapping => {
      const phaseIdMatch = mapping.name.match(/phase(\d+)_completedStatus/);
      if (phaseIdMatch) {
        const phaseId = phaseIdMatch[1];
        const statusName = mapping.value;
        const status = statuses.find(s => s.name === statusName);
        
        if (status && phaseStatusMapping[phaseId]) {
          phaseStatusMapping[phaseId].push({
            ...status,
            type: 'completed'
          });
        }
      }
    });
    
    // Process transitions for the BPMN diagram
    const transitions = phaseTransitions.map(config => {
      try {
        const transitionData = JSON.parse(config.value);
        return {
          id: config.id,
          name: config.name,
          fromPhaseId: transitionData.fromPhaseId.toString(),
          toPhaseId: transitionData.toPhaseId.toString(),
          condition: transitionData.condition || null,
          isDefault: transitionData.isDefault || false
        };
      } catch (e) {
        return null;
      }
    }).filter(t => t !== null);
    
    // Group phases by swimlane for the BPMN diagram
    const swimlanes = {};
    phases.forEach(phase => {
      if (!swimlanes[phase.swimlane]) {
        swimlanes[phase.swimlane] = [];
      }
      swimlanes[phase.swimlane].push(phase);
    });
    
    // Sort swimlanes
    const swimlaneOrder = ['Assessment', 'Analysis', 'Planning', 'Implementation'];
    const sortedSwimlanes = {};
    swimlaneOrder.forEach(lane => {
      if (swimlanes[lane]) {
        sortedSwimlanes[lane] = swimlanes[lane].sort((a, b) => a.order - b.order);
      }
    });
    
    // Add any remaining swimlanes
    Object.keys(swimlanes).forEach(lane => {
      if (!swimlaneOrder.includes(lane)) {
        sortedSwimlanes[lane] = swimlanes[lane].sort((a, b) => a.order - b.order);
      }
    });
    
    // Determine which template to render based on the route
    const path = req.originalUrl || req.path;
    logger.info('Current path:', path);
    
    let template = 'modules/bcr/workflow.njk';
    let title = 'BCR Workflow Management';
    
    // Check if this is the phase-status-mapping route
    if (path.includes('phase-status-mapping')) {
      logger.info('Rendering phase-status-mapping template');
      template = 'modules/bcr/phase-status-mapping.njk';
      title = 'BCR Phase-Status Mapping';
    }
    
    // Render the template with data
    res.render(template, {
      title,
      phases,
      statuses,
      phaseStatusMapping,
      transitions,
      swimlanes: sortedSwimlanes,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    logger.error('Error loading BCR workflow:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR workflow diagram',
      error: process.env.NODE_ENV === 'development' ? error : {},
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
    const { phases, statuses, transitions } = req.body;
    
    // Update phases
    if (phases && Array.isArray(phases)) {
      for (const phase of phases) {
        const phaseConfig = await bcrConfigService.getConfigById(phase.id);
        if (phaseConfig) {
          try {
            const phaseData = JSON.parse(phaseConfig.value);
            phaseData.displayName = phase.displayName || phase.name;
            phaseData.swimlane = phase.swimlane || phaseData.swimlane;
            phaseData.order = parseInt(phase.order) || phaseData.order;
            phaseData.description = phase.description || phaseData.description;
            
            await bcrConfigService.updateConfig(phase.id, {
              name: phase.name,
              value: JSON.stringify(phaseData)
            });
          } catch (e) {
            logger.error('Error parsing phase data:', e);
          }
        }
      }
    }
    
    // Update statuses
    if (statuses && Array.isArray(statuses)) {
      for (const status of statuses) {
        await bcrConfigService.updateConfig(status.id, {
          name: status.name
        });
      }
    }
    
    // Update transitions
    if (transitions && Array.isArray(transitions)) {
      for (const transition of transitions) {
        const transitionConfig = await bcrConfigService.getConfigById(transition.id);
        if (transitionConfig) {
          try {
            const transitionData = JSON.parse(transitionConfig.value);
            transitionData.condition = transition.condition || transitionData.condition;
            transitionData.isDefault = transition.isDefault || transitionData.isDefault;
            
            await bcrConfigService.updateConfig(transition.id, {
              name: transition.name,
              value: JSON.stringify(transitionData)
            });
          } catch (e) {
            logger.error('Error parsing transition data:', e);
          }
        }
      }
    }
    
    // Redirect back to the workflow page
    res.redirect('/bcr/workflow');
  } catch (error) {
    logger.error('Error updating BCR workflow:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to update BCR workflow configuration',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};
/**
 * Get the workflow history for a BCR
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getWorkflowHistory = async (req, res) => {
  try {
    const bcrId = req.params.id;
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).json({
        success: false,
        message: 'BCR not found'
      });
    }
    
    const history = await bcrWorkflowService.getWorkflowHistory(bcrId);
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    logger.error('Error getting workflow history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workflow history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

/**
 * Get available transitions for a BCR
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAvailableTransitions = async (req, res) => {
  try {
    const bcrId = req.params.id;
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).json({
        success: false,
        message: 'BCR not found'
      });
    }
    
    const transitions = await bcrWorkflowService.getAvailableTransitions(bcrId);
    
    res.json({
      success: true,
      transitions
    });
  } catch (error) {
    logger.error('Error getting available transitions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available transitions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

module.exports = {
  showWorkflow,
  updateWorkflow,
  getWorkflowHistory,
  getAvailableTransitions
};
