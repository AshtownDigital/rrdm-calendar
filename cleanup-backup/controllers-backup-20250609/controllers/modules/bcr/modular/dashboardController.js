/**
 * BCR Dashboard Controller
 * Handles rendering the BCR dashboard and related functionality
 */

const mongoose = require('mongoose');
const dashboardViewModel = require('../../../../viewModels/dashboardViewModel');
const { createModuleLogger } = require('../../../../services/shared/loggerService');

// Create module-specific logger
const logger = createModuleLogger('dashboardController');

/**
 * Render BCR dashboard with counters and phases
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.dashboard = async (req, res) => {
  try {
    logger.info('Loading dashboard', { userId: req.user?.id });
    
    // Use the view model to prepare dashboard data
    const dashboardData = await dashboardViewModel.prepareDashboardData({
      recentBcrsLimit: 5
    });
    
    // Render the dashboard view with prepared data
    res.render('modules/bcr/dashboard/index', {
      title: 'Business Change Request Dashboard',
      ...dashboardData,
      user: req.user
    });
    
    logger.info('Dashboard loaded successfully');
  } catch (error) {
    logger.error('Error loading dashboard', error, { userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * Render BCR statistics and metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.statistics = async (req, res) => {
  try {
    logger.info('Loading statistics', { userId: req.user?.id });
    
    // Use the view model to prepare dashboard data with all BCRs
    const dashboardData = await dashboardViewModel.prepareDashboardData({
      recentBcrsLimit: 100 // Get more BCRs for statistics
    });
    
    // Additional statistics processing could be done here
    
    // Render the statistics view with prepared data
    res.render('modules/bcr/statistics', {
      title: 'BCR Statistics and Metrics',
      ...dashboardData,
      user: req.user
    });
    
    logger.info('Statistics loaded successfully');
  } catch (error) {
    logger.error('Error loading statistics', error, { userId: req.user?.id });
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the statistics',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * Export all dashboard-related controllers
 */
module.exports = exports;
