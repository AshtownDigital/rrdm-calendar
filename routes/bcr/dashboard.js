/**
 * BCR Dashboard Route
 */
const express = require('express');
const router = express.Router();
const { BCR } = require('../../models');
const { ensureAuthenticated } = require('../../middleware/auth');

/**
 * GET /bcr
 * Render the BCR dashboard page
 */
const renderDashboard = async (req, res) => {
  try {
    // Get all BCRs
    const bcrs = await BCR.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    // Define tag colors based on GOV.UK Design System
    const statusColors = {
      'draft': 'govuk-tag govuk-tag--grey',
      'submitted': 'govuk-tag govuk-tag--blue',
      'in-progress': 'govuk-tag govuk-tag--light-blue',
      'approved': 'govuk-tag govuk-tag--green',
      'rejected': 'govuk-tag govuk-tag--red',
      'completed': 'govuk-tag govuk-tag--purple'
    };
    
    const priorityColors = {
      'low': 'govuk-tag govuk-tag--grey',
      'medium': 'govuk-tag govuk-tag--blue',
      'high': 'govuk-tag govuk-tag--red'
    };
    
    res.render('modules/bcr/dashboard', {
      title: 'Business Change Requests',
      bcrs,
      statusColors,
      priorityColors,
      user: req.user
    });
  } catch (error) {
    console.error('Error rendering BCR dashboard:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR dashboard',
      error
    });
  }
};

// Apply authentication middleware
router.use(ensureAuthenticated);

// Define routes
router.get('/', renderDashboard);

module.exports = {
  router,
  renderDashboard
};
