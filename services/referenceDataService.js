/**
 * Reference Data Service
 * 
 * Handles all database operations for reference data using Prisma
 * Implements caching for frequently accessed data
 */
// Using centralized Prisma client
const { prisma } = require('../config/prisma');
const { mediumCache } = require('../utils/cache');

// Prisma client is imported from centralized config

/**
 * Get all reference data
 * @returns {Promise<Array>} Array of reference data items
 */
async function getAllReferenceData() {
  const cacheKey = 'all_reference_data';
  
  return mediumCache.getOrSet(cacheKey, async () => {
    return prisma.referenceData.findMany({
      orderBy: {
        category: 'asc'
      }
    });
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
    return prisma.referenceData.findMany({
      where: {
        category: category
      },
      orderBy: {
        value: 'asc'
      }
    });
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
    return prisma.referenceData.findUnique({
      where: {
        id: id
      }
    });
  });
}

/**
 * Create a new reference data item
 * @param {Object} data - The reference data to create
 * @returns {Promise<Object>} The created reference data item
 */
async function createReferenceData(data) {
  const result = await prisma.referenceData.create({
    data: data
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
  const currentData = await prisma.referenceData.findUnique({
    where: {
      id: id
    }
  });
  
  const result = await prisma.referenceData.update({
    where: {
      id: id
    },
    data: data
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
  const dataToDelete = await prisma.referenceData.findUnique({
    where: {
      id: id
    }
  });
  
  const result = await prisma.referenceData.delete({
    where: {
      id: id
    }
  });
  
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
