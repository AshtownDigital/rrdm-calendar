/**
 * BCR Dashboard Controller
 * Handles BCR dashboard and module status display
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');
const counterService = require('../../services/counterService');
const workflowPhaseService = require('../../services/workflowPhaseService');
const path = require('path');
const fs = require('fs');

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
      prisma.Bcr.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          submission: {
            select: {
              submissionCode: true,
              fullName: true,
              emailAddress: true,
              briefDescription: true
            }
          }
        }
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
      bcrsByUrgency[level.value] = await prisma.Bcr.count({
        where: { urgencyLevel: level.value }
      });
    }

    // Get BCRs by impact area
    const bcrsByImpactArea = {};
    for (const area of impactAreas) {
      bcrsByImpactArea[area.value] = await prisma.Bcr.count({
        where: {
          impactedAreas: {
            has: area.value
          }
        }
      });
    }

    // Get BCRs by status for the dashboard tabs
    // Get BCRs for each tab on the dashboard
    // Active BCRs (not rejected or completed)
    const activeBcrs = await prisma.Bcr.findMany({
      where: { 
        status: { notIn: ['Rejected', 'Completed'] }
      },
      include: {
        submission: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Completed BCRs
    const completedBcrs = await prisma.Bcr.findMany({
      where: { 
        status: 'Completed'
      },
      include: {
        submission: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Rejected BCRs
    const rejectedBcrsList = await prisma.Bcr.findMany({
      where: { 
        status: 'Rejected'
      },
      include: {
        submission: true
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    // Format the BCRs for display in the dashboard
    const activeBcrsData = activeBcrs.map(bcr => ({
      id: bcr.id,
      bcrNumber: bcr.bcrCode,
      description: bcr.submission?.briefDescription || '',
      status: bcr.status,
      priority: bcr.urgencyLevel,
      phase: bcr.currentPhase,
      updatedAt: bcr.updatedAt,
      createdAt: bcr.createdAt,
      requestedBy: bcr.submission?.fullName || 'Unknown'
    }));
    
    const completedBcrsData = completedBcrs.map(bcr => ({
      id: bcr.id,
      bcrNumber: bcr.bcrCode,
      description: bcr.submission?.briefDescription || '',
      status: bcr.status,
      priority: bcr.urgencyLevel,
      phase: bcr.currentPhase,
      completedAt: bcr.updatedAt,
      createdAt: bcr.createdAt,
      requestedBy: bcr.submission?.fullName || 'Unknown'
    }));
    
    const rejectedBcrsData = rejectedBcrsList.map(bcr => ({
      id: bcr.id,
      bcrNumber: bcr.bcrCode,
      description: bcr.submission?.briefDescription || '',
      status: bcr.status,
      priority: bcr.urgencyLevel,
      phase: bcr.currentPhase,
      rejectedAt: bcr.updatedAt,
      createdAt: bcr.createdAt,
      requestedBy: bcr.submission?.fullName || 'Unknown'
    }));

    // Get workflow phases for filtering
    const workflowPhases = await bcrConfigService.getConfigsByType('workflow_phase');
    const workflowPhaseNames = workflowPhases.map(phase => phase.value);

    // Format BCRs for display
    // Helper function to get appropriate tag color based on status
    function getStatusTagColor(status) {
      const statusColors = {
        'new_submission': 'govuk-tag govuk-tag--blue',
        'submitted': 'govuk-tag govuk-tag--light-blue',
        'under_review': 'govuk-tag govuk-tag--purple',
        'approved': 'govuk-tag govuk-tag--green',
        'rejected': 'govuk-tag govuk-tag--red',
        'implemented': 'govuk-tag govuk-tag--green',
        'closed': 'govuk-tag govuk-tag--grey'
      };
      return statusColors[status] || 'govuk-tag';
    }
    
    const formatBcrs = (bcrs) => {
      // Create a map of phase numbers to phase names
      const phaseMap = {};
      phases.forEach(phase => {
        phaseMap[phase.value] = phase.name;
      });
      
      return bcrs.map(bcr => {
        // Check if this is a new Bcr model with submission data
        let submissionCode = null;
        if (bcr.submission && bcr.submission.submissionCode) {
          submissionCode = bcr.submission.submissionCode;
        } else if (bcr.submissionId) {
          // For legacy BCRs, we don't have the submission data directly
          // But we could potentially fetch it if needed
          submissionCode = bcr.submissionCode || null;
        }
        
        // Map the phase number to a phase name
        const phaseNumber = bcr.phase || bcr.currentPhase;
        const phaseName = phaseMap[phaseNumber] || `Phase ${phaseNumber}` || 'Initial Assessment';
        
        return {
          ...bcr,
          bcrCode: bcr.bcrNumber || `BCR-${bcr.recordNumber}`,
          currentPhase: phaseName, // Use the phase name instead of the number
          statusTagColor: getStatusTagColor(bcr.status),
          urgencyLevel: bcr.priority || 'Medium',
          submissionCode: submissionCode
        };
      });
    };

    const formattedActiveBcrs = formatBcrs(activeBcrsData);
    const formattedCompletedBcrs = formatBcrs(completedBcrsData);
    const formattedRejectedBcrs = formatBcrs(rejectedBcrsData);

    // Calculate total BCRs (active + completed + rejected)
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
      { name: 'Bcrs', exists: true, count: await prisma.bcrs.count() },
      { name: 'BcrConfigs', exists: true, count: await prisma.bcrConfigs.count() },
      { name: 'Users', exists: true, count: await prisma.users.count() }
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
