/**
 * DFE Reference Data Module
 * 
 * This module provides access to DFE Reference Data lists in a way that's
 * compatible with the RRDM application. It serves as an isolated adapter
 * between the DFE Reference Data and the application.
 */

const referenceData = require('./lib/reference-data');
const dataLists = require('./lib/data-lists');
const dataAccess = require('./lib/data-access');
const utils = require('./lib/utils');

module.exports = {
  // Main reference data functionality
  getReferenceList: referenceData.getReferenceList,
  getAllReferenceLists: referenceData.getAllReferenceLists,
  
  // Data access methods
  getListById: dataAccess.getListById,
  getItemById: dataAccess.getItemById,
  getItemsByFilter: dataAccess.getItemsByFilter,
  
  // Available reference lists
  lists: dataLists,
  
  // Utility functions
  utils: utils
};
