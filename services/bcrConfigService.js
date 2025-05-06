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
const getConfigsByType = async (type) => {
  const configs = await prisma.bcrConfigs.findMany({
    where: { type },
    orderBy: { displayOrder: 'asc' }
  });
  
  return configs;
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
      description: configData.description,
      metadata: configData.metadata || {}
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
      description: configData.description,
      metadata: configData.metadata
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
const getPhasesWithStatuses = async () => {
  const phases = await getConfigsByType('phase');
  const statuses = await getConfigsByType('status');
  
  // Create a mapping of phase values to status names
  const phaseStatusMapping = {};
  
  for (const status of statuses) {
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
};

module.exports = {
  getConfigsByType,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
  getPhasesWithStatuses,
  // Export prisma for testing purposes
  _prisma: prisma
};
