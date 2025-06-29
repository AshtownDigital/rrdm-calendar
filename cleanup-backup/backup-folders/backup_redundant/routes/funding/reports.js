/**
 * Funding Reports Route
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { ensureAuthenticated } = require('../../middleware/auth');

/**
 * GET /funding/reports
 * Render the funding reports page
 */
const renderReports = (req, res) => {
  try {
    // Load requirements and history data for report generation
    const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
    const historyPath = path.join(__dirname, '../../data/funding/history.json');
    
    let requirements = [];
    let history = [];
    
    if (fs.existsSync(requirementsPath)) {
      const data = fs.readFileSync(requirementsPath, 'utf8');
      requirements = JSON.parse(data);
    }
    
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      history = JSON.parse(data);
    }
    
    // Get available routes and years for filters
    const routes = [...new Set(requirements.map(item => item.route))];
    const years = [...new Set([
      ...requirements.map(item => item.year),
      ...history.map(item => item.year)
    ])].sort((a, b) => b - a);
    
    res.render('modules/funding/reports', {
      title: 'Funding Reports',
      routes,
      years,
      user: req.user
    });
  } catch (error) {
    console.error('Error rendering funding reports:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load funding reports',
      error
    });
  }
};

/**
 * POST /funding/reports/generate
 * Generate a funding report based on filters
 */
const generateReport = (req, res) => {
  try {
    const { route, year, reportType } = req.body;
    
    // Load requirements and history data for report generation
    const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
    const historyPath = path.join(__dirname, '../../data/funding/history.json');
    
    let requirements = [];
    let history = [];
    let reportData = [];
    
    if (fs.existsSync(requirementsPath)) {
      const data = fs.readFileSync(requirementsPath, 'utf8');
      requirements = JSON.parse(data);
    }
    
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      history = JSON.parse(data);
    }
    
    // Filter data based on user selections
    if (route && route !== 'all') {
      requirements = requirements.filter(item => item.route === route);
      history = history.filter(item => item.route === route);
    }
    
    if (year && year !== 'all') {
      const yearInt = parseInt(year, 10);
      requirements = requirements.filter(item => item.year === yearInt);
      history = history.filter(item => item.year === yearInt);
    }
    
    // Generate report based on report type
    switch (reportType) {
      case 'requirements':
        reportData = requirements;
        break;
      case 'history':
        reportData = history;
        break;
      case 'comparison':
        // Create a comparison report between requirements and history
        reportData = requirements.map(req => {
          const historyItem = history.find(h => 
            h.route === req.route && h.year === req.year
          );
          
          return {
            route: req.route,
            year: req.year,
            requirementAmount: req.amount,
            historyAmount: historyItem ? historyItem.amount : 0,
            difference: req.amount - (historyItem ? historyItem.amount : 0)
          };
        });
        break;
      default:
        reportData = [...requirements, ...history];
    }
    
    // Define tag colors based on GOV.UK Design System
    const tagColors = {
      primary: 'govuk-tag govuk-tag--blue', // Blue - New/pending states
      secondary: 'govuk-tag govuk-tag--turquoise', // Turquoise - Active/in-use states
      early_years: 'govuk-tag govuk-tag--purple', // Purple - Received states
      further_education: 'govuk-tag govuk-tag--pink', // Pink - Sent states
      higher_education: 'govuk-tag govuk-tag--orange' // Orange - Declined/warning states
    };
    
    res.render('modules/funding/report-results', {
      title: 'Funding Report Results',
      reportData,
      reportType,
      route: route || 'all',
      year: year || 'all',
      tagColors,
      user: req.user
    });
  } catch (error) {
    console.error('Error generating funding report:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to generate funding report',
      error
    });
  }
};

// Apply authentication middleware
router.use(ensureAuthenticated);

// Define routes
router.get('/', renderReports);
router.post('/generate', generateReport);

module.exports = {
  router,
  renderReports,
  generateReport
};
