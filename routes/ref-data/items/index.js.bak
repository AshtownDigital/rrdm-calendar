const express = require('express');
const router = express.Router();
const data = require('../../../data/items.json');

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
            itemSource: item.itemSource || (Math.random() > 0.5 ? 'Data Gem' : 'Register Created'),
            changeType: historyEntry.changeType || item.changeType,
            academicYear: historyEntry.academicYear,
            lastUpdated: historyEntry.lastUpdated || item.lastUpdated,
            summary: historyEntry.summary || 'No changes',
            actions: `<a href="/ref-data/items/${item.id}/values" class="govuk-link">Edit</a> | <a href="/ref-data/items/${item.id}/history" class="govuk-link">History</a>`
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
        itemSource: item.itemSource || (Math.random() > 0.5 ? 'Data Gem' : 'Register Created'),
        changeType: item.changeType,
        academicYear: currentYear.name,
        lastUpdated: item.lastUpdated,
        summary: currentYearHistory ? currentYearHistory.summary : 'No changes',
        actions: `<a href="/ref-data/items/${item.id}/values" class="govuk-link">Edit</a> | <a href="/ref-data/items/${item.id}/history" class="govuk-link">History</a>`
      };
    });
  }

  res.render('modules/ref-data/items/list', {
    title: 'Reference Data Directory',
    currentYear,
    academicYears: data.academicYears,
    items
  });
});

// Item values route
router.get('/:id/values', (req, res) => {
  try {
    // Check if a specific academic year was requested
    let currentYear;
    if (req.query['academic-year']) {
      // Find the academic year by ID
      const yearId = req.query['academic-year'];
      const specificYear = data.academicYears.find(year => year.id === yearId);
      if (specificYear) {
        currentYear = specificYear;
      } else {
        // If not found, fall back to the default behavior
        currentYear = getCurrentAcademicYear(req, false);
      }
    } else {
      // No specific year requested, use the default
      currentYear = getCurrentAcademicYear(req, false);
    }
    
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
    actions: `<a href="/ref-data/items/${item.id}/history" class="govuk-button govuk-button--secondary">View History</a>`
  }));

  // Format names for CSV and API
  const formatName = (name) => {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .replace(/^[0-9]/, 'N$&'); // Prefix with 'N' if starts with number
  };

  // Generate HESA link based on item ID
  const getHesaLink = (itemId) => {
    const hesaLinks = {
      'sex': 'https://www.hesa.ac.uk/collection/c24053/e/SEXID',
      'region': 'https://www.hesa.ac.uk/collection/c24053/e/DOMICILE',
      'nationality': 'https://www.hesa.ac.uk/collection/c24053/e/NATION',
      'ethnicity': 'https://www.hesa.ac.uk/collection/c24053/e/ETHNIC',
      'disabilities': 'https://www.hesa.ac.uk/collection/c24053/e/DISABLE',
      'course-level': 'https://www.hesa.ac.uk/collection/c24053/e/COURSEAIM',
      'degree-subjects': 'https://www.hesa.ac.uk/collection/c24053/e/SBJCA',
      'course-education-phase': 'https://www.hesa.ac.uk/collection/c24053/e/ITTPHASE'
    };
    
    return hesaLinks[itemId] || null;
  };
  
  // Get HESA name if available
  const getHesaName = (item) => {
    try {
      // If hesaName is already defined in the item, use it
      if (item && item.hesaName) {
        return item.hesaName;
      }
      
      // Otherwise, extract it from the HESA link if available
      if (item && item.id) {
        const hesaLink = getHesaLink(item.id);
        if (hesaLink) {
          // Extract the last part of the URL after the last slash and 'e/'
          const match = hesaLink.match(/\/e\/([^/]+)$/);
          return match ? match[1] : null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error in getHesaName:', error);
      return null;
    }
  };

  res.render('modules/ref-data/items/details', {
    title: `${item.name} - ${currentYear.name}`,
    serviceName: 'Reference Data Management',
    selectedYear: currentYear.name,
    academicYears: data.academicYears,
    item: {
      ...item,
      academicYear: currentYear.name,
      csvName: formatName(item.name),
      apiName: formatName(item.name),
      hesaLink: getHesaLink(item.id),
      hesaName: getHesaName(item)
    },
    values
  });
  } catch (error) {
    console.error('Error in values route:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while processing your request.'
    });
  }
});

// Item history route
router.get('/:id/history', (req, res) => {
  // Get all academic years, not just the current one
  const allYears = data.academicYears.filter(year => year.id !== 'all');
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

  // Ensure we have history entries for all academic years
  let fullHistory = [];
  
  // Get all actual academic years (excluding 'all')
  const actualYears = data.academicYears.filter(year => year.id !== 'all');
  
  // Create a map of existing entries by academic year for quick lookup
  const existingEntriesByYear = {};
  item.history.forEach(entry => {
    existingEntriesByYear[entry.academicYear] = entry;
  });
  
  // Create entries for all academic years
  actualYears.forEach(year => {
    // Check if we have an existing entry for this year
    if (existingEntriesByYear[year.name]) {
      // Use the existing entry
      const entry = existingEntriesByYear[year.name];
      fullHistory.push({
        ...entry,
        status: entry.status || 'Active',
        changeType: entry.changeType || 'No Change',
        lastUpdated: entry.lastUpdated || item.lastUpdated,
        academicYear: year.name,
        academicYearId: year.id,
        summary: entry.summary || 'No changes'
      });
    } else {
      // Create a new entry for this year
      fullHistory.push({
        status: 'Active',
        changeType: 'No Change',
        lastUpdated: item.lastUpdated,
        academicYear: year.name,
        academicYearId: year.id,
        summary: 'No changes'
      });
    }
  });
  
  // Sort the history by academic year (most recent first)
  fullHistory.sort((a, b) => {
    // Extract the start year from academic year format (e.g., "2025/26" -> 2025)
    const yearA = parseInt(a.academicYear.split('/')[0]);
    const yearB = parseInt(b.academicYear.split('/')[0]);
    return yearB - yearA; // Sort descending (most recent first)
  });
  
  res.render('modules/ref-data/items/history', {
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
    history: fullHistory
  });
});

// Add reference data item form route
router.get('/add', (req, res) => {
  // Generate the next 6 academic years starting from the current year (2025)
  const currentYear = 2025;
  const futureAcademicYears = [];
  
  for (let i = 0; i < 6; i++) {
    const startYear = currentYear + i;
    const endYear = startYear + 1;
    const shortEndYear = endYear.toString().slice(-2);
    
    futureAcademicYears.push({
      id: `${startYear}-${shortEndYear}`,
      name: `${startYear}/${shortEndYear}`
    });
  }
  
  res.render('modules/ref-data/items/add', {
    title: 'Add Reference Data Item',
    serviceName: 'Reference Data Management',
    academicYears: futureAcademicYears
  });
});

// Process add reference data item form submission
router.post('/add', (req, res) => {
  // In a real application, this would save the data
  // For now, just redirect back to the items list with a success message
  res.redirect('/ref-data/items');
});

module.exports = router;
