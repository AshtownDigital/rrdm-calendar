/**
 * Route Loader
 * Loads all routes for the application in a modular way
 */

// Core modules
const bcrRoutes = require('./modules/bcr/routes');
const referenceDataRoutes = require('./modules/reference-data/routes');
const dashboardRoutes = require('./modules/dashboard/routes');
const dataGemRoutes = require('./modules/data-gem/routes');
const submissionRoutes = require('./modules/submissions/routes');
const accessRoutes = require('./modules/access/routes');

// Supporting modules
const homeRoutes = require('./modules/home/routes');

module.exports = (app) => {
  // === Core Application Modules ===
  
  // BCR Management module (includes submissions and impacted areas)
  app.use('/bcr', bcrRoutes);
  
  // Submissions module (stand-alone)
  app.use('/submissions', submissionRoutes);

  // Reference Data module
  app.use('/reference-data', referenceDataRoutes);
  
  // Dashboard module
  app.use('/dashboard', dashboardRoutes);
  
  // Access Management module
  app.use('/access', accessRoutes);

  // Data Gem Viewer module
  app.use('/data-gem', dataGemRoutes);
  
  // === Supporting Modules ===
  
  // Home module (landing page)
  app.use('/', homeRoutes);
};
