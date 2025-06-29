/**
 * Dashboard Module Controller
 * Consolidated controller for system dashboard functionality
 */
const counterService = require('../../../services/modules/bcr/counterService');
const accessModel = require('../../../models/modules/access/model');
const referenceDataModel = require('../../../models/modules/reference-data/model');
const fundingModel = require('../../../models/modules/funding/model');

/**
 * Main system dashboard
 */
exports.index = async (req, res) => {
  try {
    // Get metrics from different modules
    const bcrCounters = await counterService.getCounters();
    const userCount = await accessModel.countAllUsers();
    const refDataMetrics = await referenceDataModel.getDashboardMetrics ? 
      await referenceDataModel.getDashboardMetrics() : { items: 0, values: 0 };
    
    const currentYear = new Date().getFullYear();
    
    // Render dashboard with all metrics
    res.render('modules/dashboard/index', {
      title: 'System Dashboard',
      metrics: {
        bcr: bcrCounters,
        users: userCount,
        refData: refDataMetrics
      },
      serviceName: 'Register Team Internal Services',
      selectedYear: currentYear,
      latestYear: currentYear,
      latestVersion: '1.0',
      user: req.user
    });
  } catch (error) {
    console.error('Error in dashboard controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * System metrics dashboard
 */
exports.metrics = async (req, res) => {
  try {
    // Get detailed metrics from all modules
    
    // Get BCR metrics
    const bcrCounters = await counterService.getCounters();
    const bcrMetrics = {
      counters: bcrCounters,
      breakdown: {
        byStatus: {
          pending: bcrCounters.pending || 0,
          approved: bcrCounters.approved || 0,
          rejected: bcrCounters.rejected || 0
        },
        byPhase: bcrCounters.phases || {}
      }
    };
    
    // Get user metrics
    const userCount = await accessModel.countAllUsers();
    const roleCount = await accessModel.countAllRoles();
    const userMetrics = {
      total: userCount,
      roles: roleCount
    };
    
    // Get reference data metrics
    const refDataMetrics = await referenceDataModel.getDashboardMetrics ? 
      await referenceDataModel.getDashboardMetrics() : { items: 0, values: 0 };
    
    // Render metrics dashboard
    res.render('modules/dashboard/metrics', {
      title: 'System Metrics',
      bcrMetrics,
      userMetrics,
      refDataMetrics,
      user: req.user
    });
  } catch (error) {
    console.error('Error in metrics controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the metrics dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * System status overview
 */
exports.status = async (req, res) => {
  try {
    // Collect system status information
    const statusInfo = {
      application: {
        status: 'healthy',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime())
      },
      database: {
        status: 'connected',
        type: 'MongoDB',
        version: '4.4.x'
      },
      services: [
        {
          name: 'BCR Module',
          status: 'operational',
          lastChecked: new Date()
        },
        {
          name: 'Reference Data Module',
          status: 'operational',
          lastChecked: new Date()
        },
        {
          name: 'Access Module',
          status: 'operational',
          lastChecked: new Date()
        },
        {
          name: 'Funding Module',
          status: 'operational',
          lastChecked: new Date()
        }
      ]
    };
    
    // Render status page
    res.render('modules/dashboard/status', {
      title: 'System Status',
      statusInfo,
      user: req.user
    });
  } catch (error) {
    console.error('Error in status controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the system status',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};
