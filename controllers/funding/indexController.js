/**
 * Funding Index Controller
 * Handles the main funding management page
 */
const { prisma } = require('../../config/database');

/**
 * Display the main funding management page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const index = async (req, res) => {
  try {
    // Get funding data from the database
    const fundingItems = await prisma.fundingData.findMany({
      orderBy: { name: 'asc' }
    });
    
    // Render the template with data
    res.render('modules/funding/index', {
      title: 'Funding Management',
      fundingItems,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading funding management page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load funding management page',
      error,
      user: req.user
    });
  }
};

module.exports = {
  index
};
