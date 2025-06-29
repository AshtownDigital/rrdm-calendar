/**
 * Route Loader
 * Loads all routes for the application in a modular way
 */

// Core modules
const bcrRoutes = require('./modules/bcr/routes');
const referenceDataRoutes = require('./modules/reference-data/routes');
const dashboardRoutes = require('./modules/dashboard/routes');
const accessRoutes = require('./modules/access/routes');

// Supporting modules
const homeRoutes = require('./modules/home/routes');

module.exports = (app) => {
  // === Core Application Modules ===
  
  // BCR Management module (includes submissions and impacted areas)
  app.use('/bcr', bcrRoutes);
  
  // Reference Data module
  app.use('/reference-data', referenceDataRoutes);
  
  // Dashboard module
  app.use('/dashboard', dashboardRoutes);
  
  // Access Management module
  app.use('/access', accessRoutes);
  
  // === Supporting Modules ===
  
  // Home module (landing page)
  app.use('/', homeRoutes);
};
