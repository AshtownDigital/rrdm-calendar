/**
 * Funding History Route
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { ensureAuthenticated } = require('../../middleware/auth');

/**
 * GET /funding/history
 * Render the funding history page
 */
const renderHistory = (req, res) => {
  try {
    // Load history data from JSON file
    const historyPath = path.join(__dirname, '../../data/funding/history.json');
    let history = [];
    
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      history = JSON.parse(data);
    }
    
    // Filter by year if specified
    if (req.query.year) {
      const year = parseInt(req.query.year, 10);
      history = history.filter(item => item.year === year);
    }
    
    // Define tag colors based on GOV.UK Design System
    const tagColors = {
      primary: 'govuk-tag govuk-tag--blue', // Blue - New/pending states
      secondary: 'govuk-tag govuk-tag--turquoise', // Turquoise - Active/in-use states
      early_years: 'govuk-tag govuk-tag--purple', // Purple - Received states
      further_education: 'govuk-tag govuk-tag--pink', // Pink - Sent states
      higher_education: 'govuk-tag govuk-tag--orange' // Orange - Declined/warning states
    };
    
    // Get available years for filter
    const years = [...new Set(history.map(item => item.year))].sort((a, b) => b - a);
    
    res.render('modules/funding/history', {
      title: 'Funding History',
      history,
      years,
      selectedYear: req.query.year ? parseInt(req.query.year, 10) : 'all',
      tagColors,
      user: req.user
    });
  } catch (error) {
    console.error('Error rendering funding history:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load funding history',
      error
    });
  }
};

// Apply authentication middleware
router.use(ensureAuthenticated);

// Define routes
router.get('/', renderHistory);

module.exports = {
  router,
  renderHistory
};
