/**
 * Reference Data Dashboard Controller
 * Handles the reference data dashboard
 */
const path = require('path');
const fs = require('fs').promises;
const { prisma } = require('../../config/database');

/**
 * Helper function to get item status HTML
 * @param {string} status - The item status
 * @returns {string} - HTML for the status tag
 */
const getStatusHtml = (status) => {
  const className = status === 'Active' ? 'active' : 
                   status === 'Updated' ? 'updated' : 
                   'removed';
  return `<span class="status-tag status-tag--${className}">${status}</span>`;
};

/**
 * Get academic years from release notes data
 * @returns {Promise<Array>} - Array of academic year strings
 */
const getAcademicYears = async () => {
  try {
    // First try to get academic years from the database
    const dbAcademicYears = await prisma.referenceData.findMany({
      where: { category: 'academicYear' },
      orderBy: { name: 'desc' }
    });
    
    if (dbAcademicYears && dbAcademicYears.length > 0) {
      return dbAcademicYears.map(year => year.name);
    }
    
    // Fallback to reading from files if no data in database
    const releaseNotesDir = path.join(__dirname, '../../data/release-notes');
    const alternateDir = path.join(__dirname, '../../data/release_notes');
    let files = [];
    
    // Try both directory paths
    try {
      files = await fs.readdir(releaseNotesDir);
    } catch (err) {
      try {
        files = await fs.readdir(alternateDir);
      } catch (innerErr) {
        console.error('Error reading release notes directories:', innerErr);
        return [];
      }
    }
    
    // Get all academic years from filenames
    const academicYears = files
      .filter(file => file.match(/^\d{4}[-_]\d{4}\.json$/))
      .map(file => file.replace(/[-_]/, '/').replace('.json', ''))
      .sort((a, b) => b.localeCompare(a)); // Sort descending
    
    return academicYears;
  } catch (err) {
    console.error('Error getting academic years:', err);
    return [];
  }
};

/**
 * Display the reference data dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showDashboard = async (req, res) => {
  try {
    // Set custom navigation for dashboard page only
    res.locals.navigation = 'partials/ref-data-navigation.njk';
    
    // Get academic years for navigation
    const academicYears = await getAcademicYears();
    const selectedYear = req.query.year || (academicYears.length > 0 ? academicYears[0] : '');
    
    // Get items from the database
    const items = await prisma.referenceData.findMany({
      where: { 
        category: { not: 'academicYear' } 
      }
    });
    
    const activeItems = items.filter(item => item.status === 'Active' || !item.status);
    const updatedItems = items.filter(item => item.status === 'Updated');
    const removedItems = items.filter(item => item.status === 'Removed');
    
    const dashboardItems = items.map(item => ({
      name: item.name,
      status: getStatusHtml(item.status || 'Active'),
      changeType: item.changeType || 'No Change',
      lastUpdated: item.lastUpdated || new Date().toISOString(),
      actions: `
        <div class="button-group">
          <a href="/ref-data/items/${item.id}/values" class="govuk-button govuk-button--secondary">View Values</a>
          <a href="/ref-data/items/${item.id}/history" class="govuk-button govuk-button--secondary">History</a>
        </div>
      `
    }));
    
    // Add custom CSS for dashboard navigation
    res.locals.customCss = '<link rel="stylesheet" href="/stylesheets/dashboard-nav.css">';
    
    // Render the template with data
    res.render('modules/ref-data/dashboard/index', {
      title: 'Reference Data Dashboard',
      items: dashboardItems,
      activeCount: activeItems.length,
      updatedCount: updatedItems.length,
      removedCount: removedItems.length,
      academicYears: academicYears,
      selectedYear: selectedYear,
      latestYear: academicYears.length > 0 ? academicYears[0] : '',
      latestVersion: '1.0',
      serviceName: 'Reference Data Management',
      user: req.user
    });
  } catch (error) {
    console.error('Error showing dashboard:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load dashboard',
      error,
      user: req.user
    });
  }
};

module.exports = {
  showDashboard,
  getStatusHtml,
  getAcademicYears
};
