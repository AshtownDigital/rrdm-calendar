/**
 * Funding History Route
 */
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../../middleware/auth');
const { FundingHistory } = require('../../models');
const { Op } = require('sequelize');

/**
 * GET /funding/history
 * Render the funding history page
 */
const renderHistory = async (req, res) => {
  try {
    // Build query for filtering
    let historyQuery = {};
    
    // Filter by year if specified
    if (req.query.year) {
      const year = parseInt(req.query.year, 10);
      historyQuery.year = year;
    }
    
    // Get history data from database
    const history = await FundingHistory.findAll({
      where: historyQuery,
      order: [['year', 'DESC'], ['createdAt', 'DESC']],
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
    
    // Get available years for filter
    const yearsResult = await FundingHistory.findAll({
      attributes: ['year'],
      group: ['year'],
      order: [['year', 'DESC']]
    });
    
    const years = yearsResult.map(item => item.year);
    
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
      error,
      user: req.user
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
