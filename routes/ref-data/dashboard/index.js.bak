const express = require('express');
const router = express.Router();
const itemsData = require('../../../data/items.json');
const path = require('path');
const fs = require('fs').promises;

// Helper function to get item status HTML
const getStatusHtml = (status) => {
  const className = status === 'Active' ? 'active' : 
                   status === 'Updated' ? 'updated' : 
                   'removed';
  return `<span class="status-tag status-tag--${className}">${status}</span>`;
};

// Get academic years from release notes data
const getAcademicYears = async () => {
  try {
    const releaseNotesDir = path.join(__dirname, '../../../data/release-notes');
    const alternateDir = path.join(__dirname, '../../../data/release_notes');
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

// Dashboard route
router.get('/', async (req, res) => {
  // Set custom navigation for dashboard page only
  res.locals.navigation = 'partials/ref-data-navigation.njk';
  
  // Get academic years for navigation
  const academicYears = await getAcademicYears();
  const selectedYear = req.query.year || (academicYears.length > 0 ? academicYears[0] : '');
  
  const items = itemsData.items;
  const activeItems = items.filter(item => item.status === 'Active');
  const updatedItems = items.filter(item => item.status === 'Updated');
  const removedItems = items.filter(item => item.status === 'Removed');

  const dashboardItems = items.map(item => ({
    name: item.name,
    status: getStatusHtml(item.status),
    changeType: item.changeType,
    lastUpdated: item.lastUpdated,
    actions: `
      <div class="button-group">
        <a href="/ref-data/items/${item.id}/values" class="govuk-button govuk-button--secondary">View Values</a>
        <a href="/ref-data/items/${item.id}/history" class="govuk-button govuk-button--secondary">History</a>
      </div>
    `
  }));

  // Add custom CSS for dashboard navigation
  res.locals.customCss = '<link rel="stylesheet" href="/stylesheets/dashboard-nav.css">';
  
  res.render('modules/ref-data/dashboard/index', {
    items: dashboardItems,
    activeCount: activeItems.length,
    updatedCount: updatedItems.length,
    removedCount: removedItems.length,
    academicYears: academicYears,
    selectedYear: selectedYear,
    latestYear: academicYears.length > 0 ? academicYears[0] : '',
    latestVersion: '1.0',
    serviceName: 'Reference Data Management'
  });
});

module.exports = router;
