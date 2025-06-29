/**
 * Funding Module Controller
 * Consolidated controller for Funding functionality
 */
const fundingModel = require('../../../models/modules/funding/model');
const { formatCurrency } = require('../../../utils/formatters');

/**
 * Render Funding dashboard
 */
exports.index = async (req, res) => {
  try {
    // Get overview data for funding dashboard
    const routes = await fundingModel.getAllFundingRoutes();
    const yearData = await fundingModel.getCurrentYearFunding();
    
    res.render('modules/funding/index', {
      title: 'Funding Management',
      routes,
      yearData,
      user: req.user
    });
  } catch (error) {
    console.error('Error in funding dashboard controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the funding dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render Funding Requirements page
 */
exports.requirements = async (req, res) => {
  try {
    // Get selected route or default to first route
    const routeId = req.query.route;
    let selectedRoute;
    
    // Get all routes
    const routes = await fundingModel.getAllFundingRoutes();
    
    if (routeId) {
      selectedRoute = routes.find(r => r.id === routeId);
    } else if (routes.length > 0) {
      selectedRoute = routes[0];
    }
    
    // Get requirements for selected route
    let requirements = [];
    if (selectedRoute) {
      requirements = await fundingModel.getFundingRequirementsByRoute(selectedRoute.id);
    }
    
    // Format currency values
    requirements.forEach(req => {
      req.amountFormatted = formatCurrency(req.amount);
    });
    
    res.render('modules/funding/requirements', {
      title: 'Funding Requirements',
      routes,
      selectedRoute,
      requirements,
      user: req.user
    });
  } catch (error) {
    console.error('Error in funding requirements controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the funding requirements',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render Funding History page
 */
exports.history = async (req, res) => {
  try {
    // Get query parameters
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const routeId = req.query.route;
    
    // Get all routes
    const routes = await fundingModel.getAllFundingRoutes();
    let selectedRoute;
    
    if (routeId) {
      selectedRoute = routes.find(r => r.id === routeId);
    } else if (routes.length > 0) {
      selectedRoute = routes[0];
    }
    
    // Get funding history data
    const history = await fundingModel.getFundingHistory(year, selectedRoute ? selectedRoute.id : null);
    
    // Get available years for filter
    const availableYears = await fundingModel.getAvailableYears();
    
    res.render('modules/funding/history', {
      title: 'Funding History',
      routes,
      selectedRoute,
      history,
      year,
      availableYears,
      user: req.user
    });
  } catch (error) {
    console.error('Error in funding history controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the funding history',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render Funding Reports page
 */
exports.reports = async (req, res) => {
  try {
    // Get report types
    const reportTypes = await fundingModel.getReportTypes();
    
    // Get all routes for filter
    const routes = await fundingModel.getAllFundingRoutes();
    
    // Get available years for filter
    const availableYears = await fundingModel.getAvailableYears();
    
    res.render('modules/funding/reports', {
      title: 'Funding Reports',
      reportTypes,
      routes,
      availableYears,
      user: req.user
    });
  } catch (error) {
    console.error('Error in funding reports controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the funding reports page',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Generate Funding Report
 */
exports.generateReport = async (req, res) => {
  try {
    const { reportType, year, routeId, format } = req.body;
    
    // Validate parameters
    if (!reportType || !year) {
      return res.status(400).json({
        error: 'Missing required parameters'
      });
    }
    
    // Generate report data
    const reportData = await fundingModel.generateReport(reportType, year, routeId);
    
    // Handle different output formats
    if (format === 'json') {
      return res.json(reportData);
    } else if (format === 'csv') {
      // Generate CSV
      const csv = await fundingModel.convertReportToCsv(reportData);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="funding-report-${reportType}-${year}.csv"`);
      
      return res.send(csv);
    } else {
      // Default to HTML view
      res.render('modules/funding/report-result', {
        title: `${reportType} Report for ${year}`,
        reportType,
        year,
        reportData,
        user: req.user
      });
    }
  } catch (error) {
    console.error('Error in generate report controller:', error);
    res.status(500).json({
      error: 'An error occurred while generating the report'
    });
  }
};
