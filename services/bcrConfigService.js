/**
 * BCR Config Service
 * Handles all database operations for BCR configurations using MongoDB
 */
const { v4: uuidv4 } = require('uuid');

// Import MongoDB models
const BcrConfig = require('../models/BcrConfig');
const WorkflowPhase = require('../models/WorkflowPhase');

/**
 * Get all BCR configurations by type
 * @param {string} type - Configuration type (phase, status, impactArea, etc.)
 * @returns {Promise<Array>} - Array of configurations
 */
// Only use this for impactArea, urgencyLevel, and other non-phase/status config types
const getConfigsByType = async (type) => {
  try {
    const configs = await BcrConfig.find({ type })
      .sort({ displayOrder: 1 });
    
    return configs;
  } catch (error) {
    console.error(`Error fetching configs of type ${type}:`, error);
    return [];
  }
};

/**
 * Get a BCR configuration by ID
 * @param {string} id - Configuration ID
 * @returns {Promise<Object>} - Configuration object
 */
const getConfigById = async (id) => {
  try {
    const config = await BcrConfig.findById(id);
    return config;
  } catch (error) {
    console.error(`Error fetching config with ID ${id}:`, error);
    return null;
  }
};

/**
 * Create a new BCR configuration
 * @param {Object} configData - Configuration data
 * @returns {Promise<Object>} - Created configuration
 */
const createConfig = async (configData) => {
  try {
    const newConfig = new BcrConfig({
      type: configData.type,
      name: configData.name,
      value: configData.value,
      displayOrder: configData.displayOrder || 0,
      color: configData.color || null,
      phaseValue: configData.phaseValue || null,
      statusType: configData.statusType || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newConfig.save();
    return newConfig;
  } catch (error) {
    console.error('Error creating config:', error);
    throw error;
  }
};

/**
 * Update a BCR configuration
 * @param {string} id - Configuration ID
 * @param {Object} configData - Updated configuration data
 * @returns {Promise<Object>} - Updated configuration
 */
const updateConfig = async (id, configData) => {
  try {
    const config = await BcrConfig.findById(id);
    
    if (!config) {
      throw new Error(`Config with ID ${id} not found`);
    }
    
    // Update fields
    if (configData.type) config.type = configData.type;
    if (configData.name) config.name = configData.name;
    if (configData.value) config.value = configData.value;
    if (configData.displayOrder !== undefined) config.displayOrder = configData.displayOrder;
    if (configData.color) config.color = configData.color;
    if (configData.phaseValue) config.phaseValue = configData.phaseValue;
    if (configData.statusType) config.statusType = configData.statusType;
    
    config.updatedAt = new Date();
    
    await config.save();
    return config;
  } catch (error) {
    console.error(`Error updating config with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a BCR configuration
 * @param {string} id - Configuration ID
 * @returns {Promise<Object>} - Deleted configuration
 */
const deleteConfig = async (id) => {
  try {
    const config = await BcrConfig.findById(id);
    
    if (!config) {
      throw new Error(`Config with ID ${id} not found`);
    }
    
    await BcrConfig.deleteOne({ _id: id });
    return config;
  } catch (error) {
    console.error(`Error deleting config with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Get all phases with their associated statuses
 * @returns {Promise<Object>} - Object with phases and phase-status mapping
 */
const getPhasesWithStatuses = async () => {
  try {
    // Get phases from WorkflowPhase model
    const phases = await WorkflowPhase.find({}).sort({ order: 1 });
    
    // Get statuses from BcrConfig
    const statuses = await BcrConfig.find({ type: 'status' }).sort({ displayOrder: 1 });
    
    // If no phases exist, create virtual phases based on statuses
    if (!phases || phases.length === 0) {
      console.log('No phases found, using statuses as phases');
      const virtualPhases = statuses.map(status => ({
        _id: status._id,
        type: 'phase',
        name: status.name,
        value: status.value,
        order: status.displayOrder
      }));
      
      // Create a mapping of phase values to status names
      const phaseStatusMapping = {};
      
      for (const status of statuses) {
        // Use status value as phase value if no specific mapping exists
        const phaseValue = status.value;
        if (!phaseStatusMapping[phaseValue]) {
          phaseStatusMapping[phaseValue] = [];
        }
        phaseStatusMapping[phaseValue].push(status.name);
      }
      
      return {
        phases: virtualPhases,
        phaseStatusMapping
      };
    }
    
    // Create a mapping of phase values to status names
    const phaseStatusMapping = {};
    
    for (const phase of phases) {
      // Find statuses associated with this phase
      const phaseStatuses = statuses.filter(status => status.phaseValue === phase.value);
      
      if (phaseStatuses.length > 0) {
        phaseStatusMapping[phase.value] = phaseStatuses.map(status => status.name);
      } else {
        phaseStatusMapping[phase.value] = [];
      }
    }
    
    return {
      phases,
      phaseStatusMapping
    };
  } catch (error) {
    console.error('Error in getPhasesWithStatuses:', error);
    return {
      phases: [],
      phaseStatusMapping: {}
    };
  }
};

/**
 * Get phase-status mappings
 * @returns {Promise<Array>} - Array of phase-status mappings
 */
const getPhaseStatusMappings = async () => {
  try {
    // Get all phases
    const phases = await WorkflowPhase.find({}).sort({ order: 1 });
    
    // Get all statuses
    const statuses = await BcrConfig.find({ type: 'status' }).sort({ displayOrder: 1 });
    
    // Create mappings based on phaseValue in statuses
    const mappings = [];
    
    for (const phase of phases) {
      // Find statuses for this phase
      const phaseStatuses = statuses.filter(status => status.phaseValue === phase.value);
      
      for (const status of phaseStatuses) {
        mappings.push({
          id: `${phase._id}_${status._id}`,
          type: 'phaseStatusMapping',
          name: `${phase.name} - ${status.name}`,
          value: JSON.stringify({
            phaseId: phase._id,
            phaseValue: phase.value,
            statusId: status._id,
            statusValue: status.value
          }),
          displayOrder: phase.order * 100 + status.displayOrder
        });
      }
    }
    
    return mappings;
  } catch (error) {
    console.error('Error fetching phase-status mappings:', error);
    return [];
  }
};

module.exports = {
  getConfigsByType,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
  getPhasesWithStatuses,
  getPhaseStatusMappings
};
