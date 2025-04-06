const express = require('express');
const router = express.Router();
const items = require('../../data/items.json');
const values = require('../../data/values.json');

// Helper function to get current academic year
const getCurrentAcademicYear = (req, allowAll = true) => {
  const yearId = req.query['academic-year'];
  
  // If no year is specified in the query
  if (!yearId) {
    // Only return 'all' if we're on the main values list view and allowAll is true
    if (allowAll) {
      return items.academicYears.find(year => year.id === 'all');
    } else {
      // For other views, default to the most recent academic year
      const actualYears = items.academicYears.filter(year => year.id !== 'all');
      return actualYears[0];
    }
  }
  
  // If 'all' is selected but not allowed for this view
  if (yearId === 'all' && !allowAll) {
    const actualYears = items.academicYears.filter(year => year.id !== 'all');
    return actualYears[0];
  }
  
  // Find the academic year by ID
  let year = items.academicYears.find(year => year.id === yearId);
  
  // If not found or if 'all' is selected but not allowed, return the first actual year
  if (!year || (year.id === 'all' && !allowAll)) {
    const actualYears = items.academicYears.filter(year => year.id !== 'all');
    return actualYears[0];
  }
  
  return year;
};

// Main values index route
router.get('/', (req, res) => {
  const currentYear = getCurrentAcademicYear(req);
  let valuesList = [];
  
  // Process all reference data items and their values
  if (currentYear.id === 'all') {
    // For all years view, we need to collect values across all items
    Object.keys(values).forEach(itemId => {
      const item = items.items.find(i => i.id === itemId);
      if (item) {
        // Get the values for this item
        const itemValues = values[itemId].values || [];
        
        // Add each value to our list with item information
        itemValues.forEach(value => {
          valuesList.push({
            id: value.id,
            name: value.name,
            itemId: itemId,
            itemName: item.name,
            status: value.status,
            changeType: value.changeType || 'No Change',
            academicYear: currentYear.name === 'All' ? value.history[0]?.academicYear || 'Unknown' : currentYear.name,
            lastUpdated: value.history[0]?.lastUpdated || 'Unknown',
            actions: `<a href="/values/${itemId}/${value.id}/history" class="govuk-link">History</a>`
          });
        });
      }
    });
  } else {
    // For specific year view, filter by the selected academic year
    Object.keys(values).forEach(itemId => {
      const item = items.items.find(i => i.id === itemId);
      if (item) {
        // Get the values for this item
        const itemValues = values[itemId].values || [];
        
        // Add each value to our list with item information
        itemValues.forEach(value => {
          // Find history entry for the current academic year
          const yearHistory = value.history.find(h => h.academicYear === currentYear.name);
          
          if (yearHistory) {
            valuesList.push({
              id: value.id,
              name: value.name,
              itemId: itemId,
              itemName: item.name,
              status: yearHistory.status || value.status,
              changeType: yearHistory.changeType || 'No Change',
              academicYear: currentYear.name,
              lastUpdated: yearHistory.lastUpdated || 'Unknown',
              actions: `<a href="/values/${itemId}/${value.id}/history" class="govuk-link">History</a>`
            });
          }
        });
      }
    });
  }
  
  // Sort values alphabetically by name
  valuesList.sort((a, b) => a.name.localeCompare(b.name));
  
  res.render('modules/values/index', {
    title: 'Reference Data Values',
    currentYear,
    academicYears: items.academicYears,
    values: valuesList
  });
});

// Specific route for sex values
router.get('/sex', (req, res) => {
  const currentYear = getCurrentAcademicYear(req, false);
  const itemId = 'sex';
  
  // Find the item data
  const item = items.items.find(item => item.id === itemId);
  if (!item) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested item could not be found.'
    });
  }
  
  if (!values[itemId]) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'No values found for this item.'
    });
  }
  
  const itemValues = values[itemId].values || [];
  let formattedValues = [];
  
  // Process values based on the selected academic year
  if (currentYear.id === 'all') {
    // For all years view, show all values
    formattedValues = itemValues.map(value => ({
      id: value.id,
      name: value.name,
      description: value.description || '',
      status: value.status,
      changeType: value.changeType,
      academicYear: value.history && value.history[0] ? value.history[0].academicYear : '',
      changeSummary: value.history && value.history[0] ? value.history[0].summary : '',
      actions: `<a href="/values/${itemId}/${value.id}/history" class="govuk-button govuk-button--secondary">View History</a>`
    }));
  } else {
    // For specific year view, filter by the selected academic year
    formattedValues = itemValues
      .filter(value => {
        // Check if the value has history for the selected academic year
        return value.history && value.history.some(h => h.academicYear === currentYear.name);
      })
      .map(value => {
        // Find the history entry for the selected academic year
        const yearHistory = value.history.find(h => h.academicYear === currentYear.name);
        return {
          id: value.id,
          name: value.name,
          description: value.description || '',
          status: yearHistory ? yearHistory.status : value.status,
          changeType: yearHistory ? yearHistory.changeType : value.changeType,
          academicYear: currentYear.name,
          changeSummary: yearHistory ? yearHistory.summary : '',
          actions: `<a href="/values/${itemId}/${value.id}/history" class="govuk-button govuk-button--secondary">View History</a>`
        };
      });
  }
  
  // Sort values alphabetically by name
  formattedValues.sort((a, b) => a.name.localeCompare(b.name));
  
  res.render('modules/values/sex', {
    title: `${item.name} Values`,
    item,
    values: formattedValues,
    currentYear,
    academicYears: items.academicYears.filter(year => year.id !== 'all')
  });
});

// Item values list route
router.get('/:itemId', (req, res) => {
  const item = items.items.find(item => item.id === req.params.itemId);
  if (!item) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested item could not be found.'
    });
  }

  if (!values[req.params.itemId]) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'No values found for this item.'
    });
  }

  const itemValues = values[req.params.itemId].values || [];
  const formattedValues = itemValues.map(value => ({
    id: value.id,
    name: value.name,
    description: value.description || '',
    status: value.status,
    changeType: value.changeType,
    changeSummary: value.history && value.history[0] ? value.history[0].summary : '',
    actions: `<a href="/values/${item.id}/${value.id}/history" class="govuk-button govuk-button--secondary">View History</a>`
  }));

  res.render('modules/values/list', {
    title: `${item.name} Values`,
    item,
    values: formattedValues
  });
});

// Value history route
router.get('/:itemId/:valueId/history', (req, res) => {
  const item = items.items.find(item => item.id === req.params.itemId);
  if (!item) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested item could not be found.'
    });
  }

  if (!values[req.params.itemId]) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'No values found for this item.'
    });
  }

  const itemValues = values[req.params.itemId].values || [];
  const value = itemValues.find(v => v.id === req.params.valueId);
  if (!value) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested value could not be found.'
    });
  }

  res.render('modules/values/history', {
    title: `${value.name} History`,
    item,
    value,
    history: value.history.map(entry => ({
      ...entry,
      status: entry.status
    }))
  });
});

module.exports = router;
