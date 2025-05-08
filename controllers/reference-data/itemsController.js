/**
 * Reference Data Items Controller
 * Handles reference data items management
 */
const { prisma } = require('../../config/database');

/**
 * Helper function to get current academic year
 * @param {Object} req - Express request object
 * @param {boolean} allowAll - Whether to allow 'all' as a valid year option
 * @returns {Object} - The current academic year object
 */
const getCurrentAcademicYear = async (req, allowAll = true) => {
  try {
    // Get all academic years from the database
    const academicYears = await prisma.referenceData.findMany({
      where: { category: 'academicYear' },
      orderBy: { name: 'desc' }
    });
    
    // Add 'all' option if allowed
    if (allowAll) {
      academicYears.unshift({ id: 'all', name: 'All Academic Years' });
    }
    
    const yearId = req.query['academic-year'];
    
    // If no year is specified in the query
    if (!yearId) {
      // Only return 'all' if we're on the main items list view and allowAll is true
      if (allowAll) {
        return academicYears.find(year => year.id === 'all');
      } else {
        // For other views, default to the most recent academic year
        const actualYears = academicYears.filter(year => year.id !== 'all');
        return actualYears[0];
      }
    }
    
    // If 'all' is selected but not allowed for this view
    if (yearId === 'all' && !allowAll) {
      const actualYears = academicYears.filter(year => year.id !== 'all');
      return actualYears[0];
    }
    
    // Handle different formats of academic year (2025-26 vs 2025/26)
    const formattedYearId = yearId.includes('-') ? yearId : yearId.replace('/', '-');
    
    // First try to find an exact match
    let year = academicYears.find(year => year.id === yearId);
    
    // If not found, try matching by converting slashes to hyphens
    if (!year) {
      year = academicYears.find(year => year.id === formattedYearId.replace('-', '/'));
    }
    
    // If still not found, try matching by converting the name format
    if (!year) {
      const yearName = formattedYearId.replace('-', '/');
      year = academicYears.find(year => year.name === yearName);
    }
    
    // If still not found or if 'all' is selected but not allowed, return the first actual year
    if (!year || (year.id === 'all' && !allowAll)) {
      const actualYears = academicYears.filter(year => year.id !== 'all');
      return actualYears[0];
    }
    
    return year;
  } catch (error) {
    console.error('Error getting current academic year:', error);
    // Return a default academic year
    return { id: 'current', name: 'Current Academic Year' };
  }
};

/**
 * Format names for CSV and API
 * @param {string} name - The name to format
 * @returns {string} - The formatted name
 */
const formatName = (name) => {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .replace(/^[0-9]/, 'N$&'); // Prefix with 'N' if starts with number
};

/**
 * Generate HESA link based on item ID
 * @param {string} itemId - The item ID
 * @returns {string|null} - The HESA link or null if not applicable
 */
const getHesaLink = (itemId) => {
  // Map of item IDs to HESA links
  const hesaLinks = {
    'ethnicity': 'https://www.hesa.ac.uk/collection/c19051/a/ethnic',
    'gender': 'https://www.hesa.ac.uk/collection/c19051/a/sexid',
    'disability': 'https://www.hesa.ac.uk/collection/c19051/a/disable'
  };
  
  return hesaLinks[itemId] || null;
};

/**
 * Get HESA name if available
 * @param {Object} item - The reference data item
 * @returns {string|null} - The HESA name or null if not applicable
 */
const getHesaName = (item) => {
  // Map of item IDs to HESA names
  const hesaNames = {
    'ethnicity': 'ETHNIC',
    'gender': 'SEXID',
    'disability': 'DISABLE'
  };
  
  return hesaNames[item.id] || null;
};

/**
 * Display the reference data items list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listItems = async (req, res) => {
  try {
    const currentYear = await getCurrentAcademicYear(req);
    
    // Get all reference data items
    let items = await prisma.referenceData.findMany({
      where: { 
        category: { not: 'academicYear' } 
      },
      include: {
        history: true
      },
      orderBy: { name: 'asc' }
    });
    
    // Format items for display
    const formattedItems = items.map(item => {
      // Get the history entry for the current academic year
      const currentYearHistory = item.history && item.history.length > 0 
        ? item.history.find(h => h.academicYear === currentYear.name) || item.history[0]
        : null;
      
      return {
        id: item.id,
        name: item.name,
        status: item.status || 'Active',
        itemSource: item.itemSource || 'Register Created',
        changeType: item.changeType || 'No Change',
        academicYear: currentYear.name,
        lastUpdated: item.lastUpdated || new Date().toISOString(),
        summary: currentYearHistory ? currentYearHistory.summary : 'No changes',
        actions: `<a href="/ref-data/items/${item.id}/values" class="govuk-link">Edit</a> | <a href="/ref-data/items/${item.id}/history" class="govuk-link">History</a>`
      };
    });
    
    // Get all academic years for the dropdown
    const academicYears = await prisma.referenceData.findMany({
      where: { category: 'academicYear' },
      orderBy: { name: 'desc' }
    });
    
    // Add 'all' option
    academicYears.unshift({ id: 'all', name: 'All Academic Years' });
    
    // Render the template with data
    res.render('modules/ref-data/items/index', {
      title: 'Reference Data Items',
      serviceName: 'Reference Data Management',
      selectedYear: currentYear.name,
      academicYears,
      items: formattedItems,
      user: req.user
    });
  } catch (error) {
    console.error('Error listing reference data items:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load reference data items',
      error,
      user: req.user
    });
  }
};

/**
 * Display the item details and values
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const viewItemValues = async (req, res) => {
  try {
    const itemId = req.params.id;
    const currentYear = await getCurrentAcademicYear(req, false);
    
    // Get the item from the database
    const item = await prisma.referenceData.findUnique({
      where: { id: itemId }
    });
    
    if (!item) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested item could not be found.',
        user: req.user
      });
    }
    
    // Get the values for this item
    const values = await prisma.referenceValue.findMany({
      where: { referenceDataId: itemId }
    });
    
    // Get all academic years for the dropdown
    const academicYears = await prisma.referenceData.findMany({
      where: { category: 'academicYear' },
      orderBy: { name: 'desc' }
    });
    
    // Render the template with data
    res.render('modules/ref-data/items/details', {
      title: `${item.name} - ${currentYear.name}`,
      serviceName: 'Reference Data Management',
      selectedYear: currentYear.name,
      academicYears,
      item: {
        ...item,
        academicYear: currentYear.name,
        csvName: formatName(item.name),
        apiName: formatName(item.name),
        hesaLink: getHesaLink(item.id),
        hesaName: getHesaName(item)
      },
      values,
      user: req.user
    });
  } catch (error) {
    console.error('Error viewing item values:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load item values',
      error,
      user: req.user
    });
  }
};

/**
 * Display the item history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const viewItemHistory = async (req, res) => {
  try {
    const itemId = req.params.id;
    const currentYear = await getCurrentAcademicYear(req, false);
    
    // Get the item from the database
    const item = await prisma.referenceData.findUnique({
      where: { id: itemId },
      include: {
        history: true
      }
    });
    
    if (!item) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested item could not be found.',
        user: req.user
      });
    }
    
    // Get all academic years
    const academicYears = await prisma.referenceData.findMany({
      where: { category: 'academicYear' },
      orderBy: { name: 'desc' }
    });
    
    // Ensure we have history entries for all academic years
    let fullHistory = [];
    
    // Create a map of existing entries by academic year for quick lookup
    const existingEntriesByYear = {};
    if (item.history) {
      item.history.forEach(entry => {
        existingEntriesByYear[entry.academicYear] = entry;
      });
    }
    
    // Create entries for all academic years
    academicYears.forEach(year => {
      // Check if we have an existing entry for this year
      if (existingEntriesByYear[year.name]) {
        // Use the existing entry
        const entry = existingEntriesByYear[year.name];
        fullHistory.push({
          ...entry,
          status: entry.status || 'Active',
          changeType: entry.changeType || 'No Change',
          lastUpdated: entry.lastUpdated || item.lastUpdated || new Date().toISOString(),
          academicYear: year.name,
          academicYearId: year.id,
          summary: entry.summary || 'No changes'
        });
      } else {
        // Create a new entry for this year
        fullHistory.push({
          status: 'Active',
          changeType: 'No Change',
          lastUpdated: item.lastUpdated || new Date().toISOString(),
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
    
    // Render the template with data
    res.render('modules/ref-data/items/history', {
      title: `${item.name} History`,
      serviceName: 'Reference Data Management',
      selectedYear: currentYear.name,
      academicYears,
      item: {
        ...item,
        academicYear: currentYear.name,
        csvName: formatName(item.name),
        apiName: formatName(item.name)
      },
      history: fullHistory,
      user: req.user
    });
  } catch (error) {
    console.error('Error viewing item history:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load item history',
      error,
      user: req.user
    });
  }
};

/**
 * Display the add reference data item form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showAddItemForm = async (req, res) => {
  try {
    // Generate the next 6 academic years starting from the current year (2025)
    const currentYear = new Date().getFullYear();
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
    
    // Render the template with data
    res.render('modules/ref-data/items/add', {
      title: 'Add Reference Data Item',
      serviceName: 'Reference Data Management',
      academicYears: futureAcademicYears,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing add item form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load add item form',
      error,
      user: req.user
    });
  }
};

/**
 * Process the add reference data item form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processAddItem = async (req, res) => {
  try {
    // Get form data
    const { name, academicYear } = req.body;
    
    // Create a new reference data item
    await prisma.referenceData.create({
      data: {
        name,
        status: 'Active',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Redirect back to the items list
    res.redirect('/ref-data/items');
  } catch (error) {
    console.error('Error adding reference data item:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to add reference data item',
      error,
      user: req.user
    });
  }
};

module.exports = {
  listItems,
  viewItemValues,
  viewItemHistory,
  showAddItemForm,
  processAddItem,
  getCurrentAcademicYear,
  formatName,
  getHesaLink,
  getHesaName
};
