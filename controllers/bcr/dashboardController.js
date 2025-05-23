/**
 * BCR Dashboard Controller
 * Handles BCR dashboard and module status display
 */
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');
const counterService = require('../../services/counterService');
const workflowPhaseService = require('../../services/workflowPhaseService');
const path = require('path');
const fs = require('fs');

// Import MongoDB models
const Bcr = require('../../models/Bcr');
const Submission = require('../../models/Submission');
const BcrConfig = require('../../models/BcrConfig');
const User = require('../../models/User');
const WorkflowPhase = require('../../models/WorkflowPhase');
const ImpactedArea = require('../../models/ImpactedArea');

/**
 * Render an error page with consistent formatting
 */
function renderError(res, { status = 500, title = 'Error', message = 'An error occurred', error = {}, user = null }) {
  return res.status(status).render('error', {
    title,
    message,
    error: process.env.NODE_ENV === 'development' ? error : {},
    user
  });
}

/**
 * Display the BCR dashboard
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function dashboard(req, res) {
  try {
    // Always force a refresh of all counters from the database
    // This ensures we have the most accurate counts on the dashboard
    const globalCounters = await counterService.refreshAllCounters();
    
    // Get workflow phases and statuses for display
    const phases = await workflowPhaseService.getAllPhases();
    const statuses = await workflowPhaseService.getAllStatuses();
    
    // Get other necessary data for the dashboard
    const [
      // Get recent BCRs
      recentBcrs,
      
      // Get urgency levels
      urgencyLevels,
      
      // Get impact areas
      impactAreas
    ] = await Promise.all([
      // Get recent BCRs from the Bcr model
      Bcr.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
          path: 'submissionId',
          select: 'submissionCode fullName emailAddress briefDescription'
        }),
      
      // Get urgency levels
      bcrConfigService.getConfigsByType('urgencyLevel'),
      
      // Get impact areas
      bcrConfigService.getConfigsByType('impactArea')
    ]);
    
    // Extract submission counts from global counters
    const totalSubmissions = globalCounters.submissions.total || 0;
    const approvedSubmissions = globalCounters.submissions.approved || 0;
    const rejectedSubmissions = globalCounters.submissions.rejected || 0;
    const pendingSubmissions = globalCounters.submissions.pending || 0;
    
    // Extract BCR counts from global counters
    const totalBcrs = Object.values(globalCounters.bcrs.byPhase).reduce((sum, count) => sum + count, 0);
    const pendingBcrs = globalCounters.bcrs.byStatus['In Progress'] || 0;
    const approvedBcrs = globalCounters.bcrs.byStatus['Approved'] || 0;
    const rejectedBcrs = globalCounters.bcrs.byStatus['Rejected'] || 0;
    const implementedBcrs = globalCounters.bcrs.byStatus['Implemented'] || 0;

    // Get BCRs by urgency level
    const bcrsByUrgency = {};
    
    // Ensure urgencyLevels is an array
    const safeUrgencyLevels = Array.isArray(urgencyLevels) ? urgencyLevels : [];
    
    // Use either the retrieved urgency levels or defaults
    const levelsToUse = safeUrgencyLevels.length > 0 ? safeUrgencyLevels : [
      { value: 'Low', name: 'Low' },
      { value: 'Medium', name: 'Medium' },
      { value: 'High', name: 'High' },
      { value: 'Critical', name: 'Critical' }
    ];
    
    // Count BCRs for each urgency level
    for (const level of levelsToUse) {
      bcrsByUrgency[level.value] = await Bcr.countDocuments({
        urgencyLevel: level.value
      });
    }

    // Get BCRs by impact area
    const bcrsByImpactArea = {};
    for (const area of impactAreas) {
      bcrsByImpactArea[area.value] = await Bcr.countDocuments({
        impactedAreas: area.value
      });
    }

    // Get BCRs by status for the dashboard tabs
    const [activeBcrs, completedBcrs, rejectedBcrsData] = await Promise.all([
      // Active BCRs (In Progress, Approved, etc.)
      Bcr.find({
        status: { $in: ['In Progress', 'Approved', 'Pending'] }
      })
        .sort({ createdAt: -1 })
        .populate({
          path: 'submissionId',
          select: 'submissionCode fullName emailAddress briefDescription'
        }),
      
      // Completed BCRs (Implemented, Completed, etc.)
      Bcr.find({
        status: { $in: ['Implemented', 'Completed'] }
      })
        .sort({ createdAt: -1 })
        .populate({
          path: 'submissionId',
          select: 'submissionCode fullName emailAddress briefDescription'
        }),
      
      // Rejected BCRs
      Bcr.find({
        status: 'Rejected'
      })
        .sort({ createdAt: -1 })
        .populate({
          path: 'submissionId',
          select: 'submissionCode fullName emailAddress briefDescription'
        })
    ]);
    
    // Format BCRs for display
    // Helper function to get appropriate tag color based on status
    dashboard.getStatusTagColor = function(status) {
      if (status === 'Completed' || status === 'Implemented') {
        return 'govuk-tag govuk-tag--green';
      } else if (status === 'Rejected') {
        return 'govuk-tag govuk-tag--red';
      } else if (status === 'On Hold') {
        return 'govuk-tag govuk-tag--yellow';
      } else {
        return 'govuk-tag govuk-tag--blue';
      }
    };
    
    dashboard.formatBcrs = function(bcrs) {
      return bcrs.map(bcr => {
        const submission = bcr.submissionId;
        return {
          id: bcr._id,
          bcrCode: bcr.bcrCode,
          submissionDate: bcr.createdAt ? new Date(bcr.createdAt).toLocaleDateString('en-GB') : 'Unknown',
          submitter: submission ? submission.fullName : 'Unknown',
          description: submission ? submission.briefDescription : 'No description',
          status: bcr.status,
          statusTagColor: dashboard.getStatusTagColor(bcr.status),
          phase: bcr.currentPhase,
          urgencyLevel: bcr.urgencyLevel || 'Unknown',
          impactedAreas: Array.isArray(bcr.impactedAreas) ? bcr.impactedAreas.join(', ') : 'None'
        };
      });
    };
    
    const formattedActiveBcrs = dashboard.formatBcrs(activeBcrs);
    const formattedCompletedBcrs = dashboard.formatBcrs(completedBcrs);
    const formattedRejectedBcrs = dashboard.formatBcrs(rejectedBcrsData);
    
    // Get workflow phase names for the dashboard
    const workflowPhaseNames = phases.map(phase => phase.name);
    
    // Count totals for each category
    const totalActiveBcrs = formattedActiveBcrs.length;
    const totalCompletedBcrs = formattedCompletedBcrs.length;
    const totalRejectedBcrs = formattedRejectedBcrs.length;
    const totalAllBcrs = totalActiveBcrs + totalCompletedBcrs + totalRejectedBcrs;
    
    // Render the dashboard
    res.render('bcr/dashboard', {
      title: 'BCR Dashboard',
      stats: {
        total: totalBcrs,
        pending: pendingBcrs,
        approved: approvedBcrs,
        rejected: rejectedBcrs,
        implemented: implementedBcrs,
        pendingSubmissions: pendingSubmissions,
        totalSubmissions: totalSubmissions,
        approvedSubmissions: approvedSubmissions,
        rejectedSubmissions: rejectedSubmissions
      },
      activeBcrs: formattedActiveBcrs,
      completedBcrs: formattedCompletedBcrs,
      rejectedBcrs: formattedRejectedBcrs,
      activeBcrsCount: totalActiveBcrs,
      completedBcrsCount: totalCompletedBcrs,
      rejectedBcrsCount: totalRejectedBcrs,
      totalBcrsCount: totalAllBcrs,
      completedBcrsCount: formattedCompletedBcrs.length,
      rejectedBcrsCount: formattedRejectedBcrs.length,
      pendingSubmissionsCount: pendingSubmissions, // For backward compatibility
      workflowPhases: workflowPhaseNames,
      recentBcrs,
      bcrsByUrgency,
      urgencyLevels,
      bcrsByImpactArea,
      impactAreas,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in dashboard:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: `Failed to load BCR dashboard: ${error.message}`,
      error,
      user: req.user
    });
  }
}

/**
 * Display the BCR module status
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function moduleStatus(req, res) {
  try {
    // Get project root directory
    const rootDir = path.resolve(__dirname, '../..');
    
    // Check models
    const models = [
      { name: 'Bcrs', exists: true, count: await Bcr.countDocuments() },
      { name: 'BcrConfigs', exists: true, count: await BcrConfig.countDocuments() },
      { name: 'Users', exists: true, count: await User.countDocuments() }
    ];
    
    // Check controllers
    const controllersDir = path.join(rootDir, 'controllers/bcr');
    const controllers = fs.readdirSync(controllersDir)
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const name = file.replace('.js', '');
        return { name, exists: true, path: `/controllers/bcr/${file}` };
      });
    
    // Check routes
    const routesDir = path.join(rootDir, 'routes/bcr');
    const routes = fs.readdirSync(routesDir)
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const name = file.replace('.js', '');
        return { name, exists: true, path: `/routes/bcr/${file}` };
      });
    
    // Check views
    const viewsDir = path.join(rootDir, 'views/modules/bcr');
    const getViewFiles = (dir, baseDir = viewsDir) => {
      const items = fs.readdirSync(dir);
      let files = [];
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const relativePath = fullPath.replace(baseDir, '');
        
        if (fs.statSync(fullPath).isDirectory()) {
          files = files.concat(getViewFiles(fullPath, baseDir));
        } else if (item.endsWith('.njk')) {
          files.push({ 
            name: item, 
            exists: true, 
            path: `/views/modules/bcr${relativePath}`
          });
        }
      });
      
      return files;
    };
    
    const views = getViewFiles(viewsDir);
    
    // Render the module status page
    res.render('modules/bcr/module-status.njk', {
      title: 'BCR Module Status',
      models,
      controllers,
      routes,
      views,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in moduleStatus:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: `Failed to load BCR module status: ${error.message}`,
      error,
      user: req.user
    });
  }
}

module.exports = {
  dashboard,
  moduleStatus
};
