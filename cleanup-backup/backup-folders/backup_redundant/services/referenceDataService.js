/**
 * Reference Data Service
 * 
 * Handles all database operations for reference data using Mongoose
 * Implements caching for frequently accessed data
 */
const { ReferenceData } = require('../models');
require('../config/database.mongo');
const { mediumCache } = require('../utils/cache');

/**
 * Get all reference data
 * @returns {Promise<Array>} Array of reference data items
 */
async function getAllReferenceData() {
  const cacheKey = 'all_reference_data';
  
  return mediumCache.getOrSet(cacheKey, async () => {
    return ReferenceData.find().sort({ category: 1, name: 1 });
  });
}

/**
 * Get reference data by category
 * @param {string} category - The reference data category
 * @returns {Promise<Array>} Array of reference data items in the category
 */
async function getReferenceDataByCategory(category) {
  const cacheKey = `reference_data_category_${category}`;
  
  return mediumCache.getOrSet(cacheKey, async () => {
    return ReferenceData.find({ category }).sort({ name: 1 });
  });
}

/**
 * Get reference data by ID
 * @param {string} id - The reference data ID
 * @returns {Promise<Object|null>} The reference data item or null if not found
 */
async function getReferenceDataById(id) {
  const cacheKey = `reference_data_id_${id}`;
  
  return mediumCache.getOrSet(cacheKey, async () => {
    return ReferenceData.findById(id);
  });
}

/**
 * Create a new reference data item
 * @param {Object} data - The reference data to create
 * @returns {Promise<Object>} The created reference data item
 */
async function createReferenceData(data) {
  const result = await ReferenceData.create({
    category: data.category,
    name: data.name,
    value: data.value,
    description: data.description,
    metadata: data.metadata
  });
  
  // Invalidate caches
  mediumCache.delete('all_reference_data');
  mediumCache.delete(`reference_data_category_${data.category}`);
  
  return result;
}

/**
 * Update a reference data item
 * @param {string} id - The reference data ID
 * @param {Object} data - The updated reference data
 * @returns {Promise<Object>} The updated reference data item
 */
async function updateReferenceData(id, data) {
  const currentData = await ReferenceData.findById(id);
  
  const result = await ReferenceData.findByIdAndUpdate(id, {
    category: data.category,
    name: data.name,
    value: data.value,
    description: data.description,
    metadata: data.metadata
  });
  
  // Invalidate caches
  mediumCache.delete('all_reference_data');
  mediumCache.delete(`reference_data_id_${id}`);
  
  // If category changed, invalidate both old and new category caches
  if (currentData && currentData.category !== data.category) {
    mediumCache.delete(`reference_data_category_${currentData.category}`);
    mediumCache.delete(`reference_data_category_${data.category}`);
  } else if (currentData) {
    mediumCache.delete(`reference_data_category_${currentData.category}`);
  }
  
  return result;
}

/**
 * Delete a reference data item
 * @param {string} id - The reference data ID
 * @returns {Promise<Object>} The deleted reference data item
 */
async function deleteReferenceData(id) {
  const dataToDelete = await ReferenceData.findById(id);
  
  const result = await ReferenceData.findByIdAndDelete(id);
  
  // Invalidate caches
  mediumCache.delete('all_reference_data');
  mediumCache.delete(`reference_data_id_${id}`);
  
  if (dataToDelete) {
    mediumCache.delete(`reference_data_category_${dataToDelete.category}`);
  }
  
  return result;
}

module.exports = {
  getAllReferenceData,
  getReferenceDataByCategory,
  getReferenceDataById,
  createReferenceData,
  updateReferenceData,
  deleteReferenceData
};
