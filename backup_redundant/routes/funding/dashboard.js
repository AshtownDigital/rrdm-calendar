/**
 * Funding Dashboard Route
 */
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../../middleware/auth');

/**
 * GET /funding
 * Render the funding dashboard page
 */
const renderDashboard = (req, res) => {
  // Define tag colors based on GOV.UK Design System
  const tagColors = {
    primary: 'govuk-tag govuk-tag--blue',
    secondary: 'govuk-tag govuk-tag--turquoise',
    early_years: 'govuk-tag govuk-tag--purple',
    further_education: 'govuk-tag govuk-tag--pink',
    higher_education: 'govuk-tag govuk-tag--orange'
  };

  res.render('modules/funding/dashboard', {
    title: 'Funding',
    user: req.user,
    tagColors
  });
};

// Apply authentication middleware
router.use(ensureAuthenticated);

// Define routes
router.get('/', renderDashboard);

module.exports = {
  router,
  renderDashboard
};
