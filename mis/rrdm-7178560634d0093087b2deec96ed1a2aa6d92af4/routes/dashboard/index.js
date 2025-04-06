const express = require('express');
const router = express.Router();
const itemsData = require('../../data/items.json');

// Helper function to get item status HTML
const getStatusHtml = (status) => {
  const className = status === 'Active' ? 'active' : 
                   status === 'Updated' ? 'updated' : 
                   'removed';
  return `<span class="status-tag status-tag--${className}">${status}</span>`;
};

// Dashboard route
router.get('/', (req, res) => {
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
        <a href="/items/${item.id}/values" class="govuk-button govuk-button--secondary">View Values</a>
        <a href="/items/${item.id}/history" class="govuk-button govuk-button--secondary">History</a>
      </div>
    `
  }));

  res.render('modules/dashboard/index', {
    items: dashboardItems,
    activeCount: activeItems.length,
    updatedCount: updatedItems.length,
    removedCount: removedItems.length
  });
});

module.exports = router;
