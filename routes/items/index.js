const express = require('express');
const router = express.Router();
const data = require('../../data/items.json');

// Helper function to get current academic year
const getCurrentAcademicYear = (req, allowAll = true) => {
  const yearId = req.query['academic-year'];
  
  // If no year is specified in the query
  if (!yearId) {
    // Only return 'all' if we're on the main items list view and allowAll is true
    if (allowAll) {
      return data.academicYears.find(year => year.id === 'all');
    } else {
      // For other views, default to the most recent academic year
      const actualYears = data.academicYears.filter(year => year.id !== 'all');
      return actualYears[0];
    }
  }
  
  // If 'all' is selected but not allowed for this view
  if (yearId === 'all' && !allowAll) {
    const actualYears = data.academicYears.filter(year => year.id !== 'all');
    return actualYears[0];
  }
  
  // Handle different formats of academic year (2025-26 vs 2025/26)
  const formattedYearId = yearId.includes('-') ? yearId : yearId.replace('/', '-');
  
  // First try to find an exact match
  let year = data.academicYears.find(year => year.id === yearId);
  
  // If not found, try matching by converting slashes to hyphens
  if (!year) {
    year = data.academicYears.find(year => year.id === formattedYearId.replace('-', '/'));
  }
  
  // If still not found, try matching by converting the name format
  if (!year) {
    const yearName = formattedYearId.replace('-', '/');
    year = data.academicYears.find(year => year.name === yearName);
  }
  
  // If still not found or if 'all' is selected but not allowed, return the first actual year
  if (!year || (year.id === 'all' && !allowAll)) {
    const actualYears = data.academicYears.filter(year => year.id !== 'all');
    return actualYears[0];
  }
  
  return year;
};



// Items list route
router.get('/', (req, res) => {
  const currentYear = getCurrentAcademicYear(req);
  let items = [];
  
  if (currentYear.id === 'all') {
    // Show items from all academic years
    const allYears = data.academicYears.filter(year => year.id !== 'all');
    
    // For each item, create entries for all academic years
    data.items.forEach(item => {
      // Get all history entries
      item.history.forEach(historyEntry => {
        // Find the academic year object that matches this history entry
        const yearObj = allYears.find(year => year.name === historyEntry.academicYear);
        
        if (yearObj) {
          items.push({
            id: item.id,
            name: item.name,
            status: historyEntry.status || item.status,
            changeType: historyEntry.changeType || item.changeType,
            academicYear: historyEntry.academicYear,
            lastUpdated: historyEntry.lastUpdated || item.lastUpdated,
            summary: historyEntry.summary || 'No changes',
            actions: `<a href="/items/${item.id}/history" class="govuk-link">History</a>`
          });
        }
      });
    });
    
    // Sort items alphabetically by name
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Show items for the selected academic year only
    items = data.items.map(item => {
      // Get the history entry for the current academic year
      const currentYearHistory = item.history.find(h => h.academicYear === currentYear.name) || item.history[0];
      
      return {
        id: item.id,
        name: item.name,
        status: item.status,
        changeType: item.changeType,
        academicYear: currentYear.name,
        lastUpdated: item.lastUpdated,
        summary: currentYearHistory ? currentYearHistory.summary : 'No changes',
        actions: `<a href="/items/${item.id}/history" class="govuk-link">History</a>`
      };
    });
  }

  res.render('modules/items/list', {
    title: 'Reference Data Directory',
    currentYear,
    academicYears: data.academicYears,
    items
  });
});

// Item values route
router.get('/:id/values', (req, res) => {
  const currentYear = getCurrentAcademicYear(req, false);
  const item = data.items.find(item => item.id === req.params.id);
  if (!item) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested item could not be found.'
    });
  }

  const values = item.values.map(value => ({
    id: value.id,
    name: value.name,
    description: value.description,
    status: value.status,
    changeType: value.changeType,
    changeSummary: value.changeSummary,
    actions: `<a href="/items/${item.id}/history" class="govuk-button govuk-button--secondary">View History</a>`
  }));

  // Format names for CSV and API
  const formatName = (name) => {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .replace(/^[0-9]/, 'N$&'); // Prefix with 'N' if starts with number
  };

  res.render('modules/items/details', {
    title: `${item.name} - ${currentYear.name}`,
    serviceName: 'Reference Data Management',
    selectedYear: currentYear.name,
    academicYears: data.academicYears,
    item: {
      ...item,
      academicYear: currentYear.name,
      csvName: formatName(item.name),
      apiName: formatName(item.name)
    },
    values
  });
});

// Item history route
router.get('/:id/history', (req, res) => {
  const currentYear = getCurrentAcademicYear(req, false);
  const item = data.items.find(item => item.id === req.params.id);
  if (!item) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested item could not be found.'
    });
  }

  // Format names for CSV and API
  const formatName = (name) => {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .replace(/^[0-9]/, 'N$&'); // Prefix with 'N' if starts with number
  };

  res.render('modules/items/history', {
    title: `${item.name} History`,
    serviceName: 'Reference Data Management',
    selectedYear: currentYear.name,
    academicYears: data.academicYears,
    item: {
      ...item,
      academicYear: currentYear.name,
      csvName: formatName(item.name),
      apiName: formatName(item.name)
    },
    history: item.history.map(entry => {
      // Find the academic year ID that matches the entry's academic year name
      const academicYearObj = data.academicYears.find(year => year.name === entry.academicYear);
      const academicYearId = academicYearObj ? academicYearObj.id : '';
      
      return {
        ...entry,
        status: entry.status,
        lastUpdated: entry.lastUpdated || item.lastUpdated,
        academicYearId: academicYearId
      };
    })
  });
});

module.exports = router;
