/**
 * BCR Configuration Service for MongoDB
 * Handles database operations for BCR configurations
 */
const { BcrConfig } = require('../models');

/**
 * Get all BCR configurations
 * @returns {Promise<Array>} Array of BCR configurations
 */
const getAllConfigs = async () => {
  try {
    return await BcrConfig.find().sort({ type: 1, displayOrder: 1 });
  } catch (error) {
    console.error('Error fetching BCR configs:', error);
    throw error;
  }
};

/**
 * Get BCR configurations by type
 * @param {string} type - Configuration type
 * @returns {Promise<Array>} Array of BCR configurations of the specified type
 */
const getConfigsByType = async (type) => {
  try {
    return await BcrConfig.find({ type }).sort({ displayOrder: 1 });
  } catch (error) {
    console.error(`Error fetching BCR configs of type ${type}:`, error);
    throw error;
  }
};

/**
 * Get BCR configuration by ID
 * @param {string} id - Configuration ID
 * @returns {Promise<Object|null>} BCR configuration or null if not found
 */
const getConfigById = async (id) => {
  try {
    return await BcrConfig.findById(id);
  } catch (error) {
    console.error(`Error fetching BCR config with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new BCR configuration
 * @param {Object} configData - Configuration data
 * @returns {Promise<Object>} Created BCR configuration
 */
const createConfig = async (configData) => {
  try {
    const config = new BcrConfig(configData);
    return await config.save();
  } catch (error) {
    console.error('Error creating BCR config:', error);
    throw error;
  }
};

/**
 * Update BCR configuration
 * @param {string} id - Configuration ID
 * @param {Object} configData - Updated configuration data
 * @returns {Promise<Object|null>} Updated BCR configuration or null if not found
 */
const updateConfig = async (id, configData) => {
  try {
    return await BcrConfig.findByIdAndUpdate(
      id,
      {
        ...configData,
        updatedAt: new Date()
      },
      { new: true } // Return the updated document
    );
  } catch (error) {
    console.error(`Error updating BCR config with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete BCR configuration
 * @param {string} id - Configuration ID
 * @returns {Promise<boolean>} Success status
 */
const deleteConfig = async (id) => {
  try {
    const result = await BcrConfig.findByIdAndDelete(id);
    return !!result;
  } catch (error) {
    console.error(`Error deleting BCR config with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Migrate BCR configurations from JSON to database
 * @param {Array} configs - Array of configuration objects from JSON
 * @param {boolean} overwrite - Whether to overwrite existing configurations
 * @returns {Promise<boolean>} Success status
 */
const migrateConfigsFromJson = async (configs, overwrite = false) => {
  try {
    for (const configData of configs) {
      // Check if config already exists
      const existingConfig = await BcrConfig.findOne({
        type: configData.type,
        name: configData.name
      });
      
      if (existingConfig && !overwrite) {
        console.log(`Skipping existing config: ${configData.type} - ${configData.name}`);
        continue;
      }
      
      if (existingConfig && overwrite) {
        console.log(`Updating existing config: ${configData.type} - ${configData.name}`);
        await BcrConfig.findByIdAndUpdate(existingConfig._id, {
          ...configData,
          updatedAt: new Date()
        });
      } else {
        console.log(`Creating new config: ${configData.type} - ${configData.name}`);
        const config = new BcrConfig({
          ...configData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await config.save();
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error migrating BCR configs:', error);
    return false;
  }
};

module.exports = {
  getAllConfigs,
  getConfigsByType,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
  migrateConfigsFromJson
};
