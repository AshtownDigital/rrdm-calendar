/**
 * Utility functions for working with reference data
 * 
 * This module provides helper functions for working with reference data lists.
 */

/**
 * Convert a reference list to a format suitable for use in a select dropdown
 * 
 * @param {Array<Object>} list - The reference list
 * @param {Object} options - Options for formatting the list
 * @param {string} options.valueField - The field to use for option values (default: 'id')
 * @param {string} options.textField - The field to use for option text (default: 'name')
 * @param {boolean} options.includeEmpty - Whether to include an empty option (default: false)
 * @param {string} options.emptyText - Text for the empty option (default: 'Please select')
 * @returns {Array<Object>} - The formatted list for use in a select dropdown
 */
function formatForSelect(list, options = {}) {
  const {
    valueField = 'id',
    textField = 'name',
    includeEmpty = false,
    emptyText = 'Please select'
  } = options;
  
  // Create the options array
  const selectOptions = list.map(item => ({
    value: item[valueField],
    text: item[textField] || item.text || item.label || item.title || item[valueField]
  }));
  
  // Sort by text if not already sorted
  selectOptions.sort((a, b) => a.text.localeCompare(b.text));
  
  // Add empty option if requested
  if (includeEmpty) {
    selectOptions.unshift({
      value: '',
      text: emptyText
    });
  }
  
  return selectOptions;
}

/**
 * Find items in a reference list that match a search term
 * 
 * @param {Array<Object>} list - The reference list
 * @param {string} searchTerm - The search term
 * @param {Array<string>} searchFields - The fields to search in (default: ['name', 'text', 'label', 'title', 'id'])
 * @returns {Array<Object>} - The matching items
 */
function search(list, searchTerm, searchFields = ['name', 'text', 'label', 'title', 'id']) {
  if (!searchTerm || searchTerm.trim() === '') {
    return list;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  return list.filter(item => {
    return searchFields.some(field => {
      const value = item[field];
      
      if (value === undefined || value === null) {
        return false;
      }
      
      return String(value).toLowerCase().includes(term);
    });
  });
}

/**
 * Merge multiple reference lists into a single list
 * 
 * @param {Array<Array<Object>>} lists - The reference lists to merge
 * @param {Object} options - Options for merging the lists
 * @param {string} options.idField - The field to use as the ID (default: 'id')
 * @param {boolean} options.overwrite - Whether to overwrite existing items (default: true)
 * @returns {Array<Object>} - The merged list
 */
function mergeLists(lists, options = {}) {
  const {
    idField = 'id',
    overwrite = true
  } = options;
  
  // Create a map to store the merged items
  const mergedMap = new Map();
  
  // Process each list
  lists.forEach(list => {
    if (!Array.isArray(list)) {
      return;
    }
    
    list.forEach(item => {
      const id = item[idField];
      
      if (id === undefined) {
        return;
      }
      
      if (!mergedMap.has(id) || overwrite) {
        mergedMap.set(id, { ...item });
      } else {
        // Merge with existing item if not overwriting
        const existingItem = mergedMap.get(id);
        mergedMap.set(id, { ...existingItem, ...item });
      }
    });
  });
  
  // Convert the map back to an array
  return Array.from(mergedMap.values());
}

/**
 * Create a tweaked version of a reference list with modifications
 * 
 * @param {Array<Object>} list - The original reference list
 * @param {Object} modifications - The modifications to apply
 * @param {string} idField - The field to use as the ID (default: 'id')
 * @returns {Array<Object>} - The tweaked list
 */
function tweakList(list, modifications, idField = 'id') {
  if (!modifications || Object.keys(modifications).length === 0) {
    return [...list];
  }
  
  // Create a map of the original items
  const itemMap = new Map(list.map(item => [item[idField], { ...item }]));
  
  // Apply modifications
  Object.entries(modifications).forEach(([id, modification]) => {
    if (modification === null) {
      // Delete the item
      itemMap.delete(id);
    } else if (itemMap.has(id)) {
      // Modify an existing item
      const item = itemMap.get(id);
      itemMap.set(id, { ...item, ...modification });
    } else {
      // Add a new item
      itemMap.set(id, { [idField]: id, ...modification });
    }
  });
  
  // Convert the map back to an array
  return Array.from(itemMap.values());
}

module.exports = {
  formatForSelect,
  search,
  mergeLists,
  tweakList
};
