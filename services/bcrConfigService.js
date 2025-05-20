/**
 * BCR Config Service
 * Handles all database operations for BCR configurations using Prisma
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

/**
 * Get all BCR configurations by type
 * @param {string} type - Configuration type (phase, status, impactArea, etc.)
 * @returns {Promise<Array>} - Array of configurations
 */
// DEPRECATED: Phase and status logic now handled by workflowPhaseService/WorkflowPhase model
// Only use this for impactArea, urgencyLevel, and other non-phase/status config types
const getConfigsByType = async (type) => {
  try {
    const configs = await prisma.bcrConfigs.findMany({
      where: { type },
      orderBy: { displayOrder: 'asc' }
    });
    
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
  const config = await prisma.bcrConfigs.findUnique({
    where: { id }
  });
  
  return config;
};

/**
 * Create a new BCR configuration
 * @param {Object} configData - Configuration data
 * @returns {Promise<Object>} - Created configuration
 */
const createConfig = async (configData) => {
  const newConfig = await prisma.bcrConfigs.create({
    data: {
      id: uuidv4(),
      type: configData.type,
      name: configData.name,
      value: configData.value,
      displayOrder: configData.displayOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  
  return newConfig;
};

/**
 * Update a BCR configuration
 * @param {string} id - Configuration ID
 * @param {Object} configData - Updated configuration data
 * @returns {Promise<Object>} - Updated configuration
 */
const updateConfig = async (id, configData) => {
  const updatedConfig = await prisma.bcrConfigs.update({
    where: { id },
    data: {
      type: configData.type,
      name: configData.name,
      value: configData.value,
      displayOrder: configData.displayOrder,
      updatedAt: new Date() // Update the timestamp
    }
  });
  
  return updatedConfig;
};

/**
 * Delete a BCR configuration
 * @param {string} id - Configuration ID
 * @returns {Promise<Object>} - Deleted configuration
 */
const deleteConfig = async (id) => {
  const deletedConfig = await prisma.bcrConfigs.delete({
    where: { id }
  });
  
  return deletedConfig;
};

/**
 * Get all phases with their associated statuses
 * @returns {Promise<Object>} - Object with phases and phase-status mapping
 */
// DEPRECATED: Use workflowPhaseService for all phase/status logic
const getPhasesWithStatuses = async () => {
  try {
    // Get phases if they exist, otherwise use statuses as phases
    let phases = await getConfigsByType('phase');
    const statuses = await getConfigsByType('status');
    
    // If no phases exist, create virtual phases based on statuses
    if (!phases || phases.length === 0) {
      console.log('No phases found, using statuses as phases');
      phases = statuses.map(status => ({
        id: status.id,
        type: 'phase',
        name: status.name,
        value: status.value,
        displayOrder: status.displayOrder
      }));
    }
    
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
// DEPRECATED: Use workflowPhaseService for all phase/status logic
const getPhaseStatusMappings = async () => {
  try {
    // Query the database for phase-status mappings
    const mappings = await prisma.bcrConfigs.findMany({
      where: {
        type: 'phaseStatusMapping'
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });
    
    if (!mappings || mappings.length === 0) {
      // If no mappings exist, get phases and statuses and create default mappings
      const phases = await getConfigsByType('phase');
      const statuses = await getConfigsByType('status');
      
      // Create a simple mapping based on phases and statuses
      const defaultMappings = [];
      
      for (const phase of phases) {
        // Find statuses that might be related to this phase
        const relatedStatuses = statuses.filter(status => {
          // Simple logic: if status value contains phase value or vice versa
          return status.value.includes(phase.value) || 
                 phase.value.includes(status.value) ||
                 status.name.toLowerCase().includes(phase.name.toLowerCase()) ||
                 phase.name.toLowerCase().includes(status.name.toLowerCase());
        });
        
        if (relatedStatuses.length > 0) {
          for (const status of relatedStatuses) {
            defaultMappings.push({
              id: `${phase.id}_${status.id}`,
              type: 'phaseStatusMapping',
              name: `${phase.name} - ${status.name}`,
              value: JSON.stringify({
                phaseId: phase.id,
                phaseValue: phase.value,
                statusId: status.id,
                statusValue: status.value
              }),
              displayOrder: phase.displayOrder * 100 + status.displayOrder
            });
          }
        }
      }
      
      return defaultMappings;
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
  getPhaseStatusMappings,
  // Export prisma for testing purposes
  _prisma: prisma
};
