/**
 * Funding Requirements Route
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { ensureAuthenticated } = require('../../middleware/auth');

/**
 * GET /funding/requirements
 * Render the funding requirements page
 */
const renderRequirements = (req, res) => {
  try {
    // Load requirements data from JSON file
    const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
    let requirements = [];
    
    if (fs.existsSync(requirementsPath)) {
      const data = fs.readFileSync(requirementsPath, 'utf8');
      requirements = JSON.parse(data);
    }
    
    // Filter by route if specified
    if (req.query.route) {
      requirements = requirements.filter(item => item.route === req.query.route);
    }
    
    // Define tag colors based on GOV.UK Design System
    const tagColors = {
      primary: 'govuk-tag govuk-tag--blue', // Blue - New/pending states
      secondary: 'govuk-tag govuk-tag--turquoise', // Turquoise - Active/in-use states
      early_years: 'govuk-tag govuk-tag--purple', // Purple - Received states
      further_education: 'govuk-tag govuk-tag--pink', // Pink - Sent states
      higher_education: 'govuk-tag govuk-tag--orange' // Orange - Declined/warning states
    };
    
    // Get available routes for filter
    const routes = [...new Set(requirements.map(item => item.route))];
    
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
      error
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
