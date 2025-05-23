/**
 * Funding Requirements Route
 */
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../../middleware/auth');
const { FundingRequirement } = require('../../models');

/**
 * GET /funding/requirements
 * Render the funding requirements page
 */
const renderRequirements = async (req, res) => {
  try {
    // Load requirements data from database
    let requirementsQuery = {};
    
    // Filter by route if specified
    if (req.query.route) {
      requirementsQuery.route = req.query.route;
    }
    
    // Get requirements from database
    const requirements = await FundingRequirement.findAll({
      where: requirementsQuery,
      order: [['year', 'DESC'], ['route', 'ASC']],
      include: [{ association: 'creator', attributes: ['name'] }]
    });
    
    // Define tag colors based on GOV.UK Design System
    const tagColors = {
      primary: 'govuk-tag govuk-tag--blue', // Blue - New/pending states
      secondary: 'govuk-tag govuk-tag--turquoise', // Turquoise - Active/in-use states
      early_years: 'govuk-tag govuk-tag--purple', // Purple - Received states
      further_education: 'govuk-tag govuk-tag--pink', // Pink - Sent states
      higher_education: 'govuk-tag govuk-tag--orange' // Orange - Declined/warning states
    };
    
    // Get available routes for filter
    const routesResult = await FundingRequirement.findAll({
      attributes: ['route'],
      group: ['route'],
      order: [['route', 'ASC']]
    });
    
    const routes = routesResult.map(item => item.route);
    
    res.render('modules/funding/requirements', {
      title: 'Funding Requirements',
      requirements,
      routes,
      selectedRoute: req.query.route || 'all',
      tagColors,
      user: req.user
    });
  } catch (error) {
    console.error('Error rendering funding requirements:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load funding requirements',
      error,
      user: req.user
    });
  }
};

// Apply authentication middleware
router.use(ensureAuthenticated);

// Define routes
router.get('/', renderRequirements);

module.exports = {
  router,
  renderRequirements
};
