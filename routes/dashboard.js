const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Read reference data values
const valuesPath = path.join(__dirname, '../data/values.json');
const values = JSON.parse(fs.readFileSync(valuesPath, 'utf8'));

router.get('/', (req, res) => {
  // Calculate summary statistics
  const summary = {
    active: 0,
    updated: 0,
    removed: 0,
    total: 0
  };

  // Prepare items list
  const items = [];

  // Process all items
  Object.entries(values).forEach(([category, data]) => {
    data.values.forEach(item => {
      // Update summary counts
      if (item.status === 'Active') summary.active++;
      if (item.changeType === 'Updated') summary.updated++;
      if (item.status === 'Removed') summary.removed++;
      summary.total++;

      // Add to items list with category
      items.push({
        name: `${item.name} (${category})`,
        status: item.status,
        changeType: item.changeType,
        lastUpdated: item.history[0].lastUpdated,
        actions: `<a href="/values/${category}/${item.id}" class="govuk-link">View Details</a>`
      });
    });
  });

  res.render('modules/dashboard/dashboard', {
    title: 'Reference Data Management',
    summary: summary,
    items: items
  });
});

module.exports = router;
