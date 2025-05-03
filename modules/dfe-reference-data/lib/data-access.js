/**
 * Data Access
 * 
 * This module provides methods for accessing and querying reference data lists.
 * It implements a similar interface to the original DFE Reference Data gem but adapted
 * for JavaScript and the RRDM application.
 */

const referenceData = require('./reference-data');

/**
 * Get a reference list by its ID
 * 
 * @param {string} listId - The ID of the reference list to retrieve
 * @param {Object} options - Options for retrieving the list
 * @returns {Promise<Object>} - The reference list data
 */
async function getListById(listId, options = {}) {
  return referenceData.getReferenceList(listId, options);
}

/**
 * Get an item from a reference list by its ID
 * 
 * @param {string} listId - The ID of the reference list
 * @param {string} itemId - The ID of the item to retrieve
 * @param {Object} options - Options for retrieving the list
 * @returns {Promise<Object>} - The item data
 */
async function getItemById(listId, itemId, options = {}) {
  try {
    const list = await referenceData.getReferenceList(listId, options);
    
    // Find the item by ID
    const item = list.find(item => item.id === itemId);
    
    if (!item) {
      throw new Error(`Item '${itemId}' not found in reference list '${listId}'`);
    }
    
    return item;
  } catch (error) {
    console.error(`Error retrieving item '${itemId}' from reference list '${listId}':`, error);
    throw error;
  }
}

/**
 * Get items from a reference list that match a filter
 * 
 * @param {string} listId - The ID of the reference list
 * @param {Object} filter - The filter to apply to the list
 * @param {Object} options - Options for retrieving the list
 * @returns {Promise<Array<Object>>} - The filtered items
 */
async function getItemsByFilter(listId, filter = {}, options = {}) {
  try {
    const list = await referenceData.getReferenceList(listId, options);
    
    // If no filter is provided, return all items
    if (Object.keys(filter).length === 0) {
      return list;
    }
    
    // Filter the items
    return list.filter(item => {
      return Object.entries(filter).every(([key, value]) => {
        return item[key] === value;
      });
    });
  } catch (error) {
    console.error(`Error filtering reference list '${listId}':`, error);
    throw error;
  }
}

/**
 * Group items from a reference list by a field
 * 
 * @param {string} listId - The ID of the reference list
 * @param {string} field - The field to group by
 * @param {Object} filter - The filter to apply to the list
 * @param {Object} options - Options for retrieving the list
 * @returns {Promise<Object>} - The grouped items
 */
async function getItemsGroupedByField(listId, field, filter = {}, options = {}) {
  try {
    const items = await getItemsByFilter(listId, filter, options);
    
    // Group the items by the specified field
    return items.reduce((groups, item) => {
      const fieldValue = item[field];
      
      if (!groups[fieldValue]) {
        groups[fieldValue] = [];
      }
      
      groups[fieldValue].push(item);
      
      return groups;
    }, {});
  } catch (error) {
    console.error(`Error grouping reference list '${listId}' by field '${field}':`, error);
    throw error;
  }
}

/**
 * Convert a reference list to a hash map using a specified field as the key
 * 
 * @param {string} listId - The ID of the reference list
 * @param {string} keyField - The field to use as the key (defaults to 'id')
 * @param {Object} options - Options for retrieving the list
 * @returns {Promise<Object>} - The hash map
 */
async function getListAsHashMap(listId, keyField = 'id', options = {}) {
  try {
    const list = await referenceData.getReferenceList(listId, options);
    
    // Convert the list to a hash map
    return list.reduce((hashMap, item) => {
      const key = item[keyField];
      
      if (key !== undefined) {
        hashMap[key] = item;
      }
      
      return hashMap;
    }, {});
  } catch (error) {
    console.error(`Error converting reference list '${listId}' to hash map:`, error);
    throw error;
  }
}

module.exports = {
  getListById,
  getItemById,
  getItemsByFilter,
  getItemsGroupedByField,
  getListAsHashMap
};
