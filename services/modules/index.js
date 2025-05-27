/**
 * Modules Service Index
 * Provides a unified entry point for all module services
 */

// Import all module services
const bcrServices = require('./bcr');
const accessServices = require('./access/authService');

/**
 * Core application module services
 */
module.exports = {
  // BCR Module services
  bcr: bcrServices,
  
  // Access Module services
  access: {
    auth: accessServices
  }
  
  // Additional module services can be added here as they are created
};
