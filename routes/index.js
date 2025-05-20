/**
 * Route Loader
 * Loads all routes for the application
 */
const bcrRoutes = require('./bcr/routes');
const submissionRoutes = require('./bcr-submission/routes');
const impactedAreasRoutes = require('./impacted-areas/routes');

module.exports = (app) => {
  // Mount BCR routes
  app.use('/bcr', bcrRoutes);
  
  // Mount BCR submission routes
  app.use('/bcr-submission', submissionRoutes);
  
  // Mount impacted areas routes
  app.use('/impacted-areas', impactedAreasRoutes);
  
  // Root path handler - redirect to BCR dashboard
  app.get('/', (req, res) => {
    res.redirect('/bcr/dashboard');
  });
};
