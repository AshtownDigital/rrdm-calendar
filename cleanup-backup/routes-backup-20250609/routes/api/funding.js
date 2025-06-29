/**
 * API Funding Routes
 */
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../../middleware/auth');
const fundingService = require('../../services/fundingService');

// These functions are no longer needed as we're using Prisma services

/**
 * GET /api/funding/requirements
 * Get funding requirements data, optionally filtered by route
 */
const getFundingRequirements = async (req, res) => {
  try {
    // Get requirements from the database using the service
    // with optional filtering by route
    const filters = {};
    if (req.query.route) {
      filters.route = req.query.route;
    }
    if (req.query.year) {
      filters.year = req.query.year;
    }
    
    const requirements = await fundingService.getAllFundingRequirements(filters);
    
    res.status(200).json(requirements);
  } catch (error) {
    console.error('Error fetching funding requirements:', error);
    res.status(500).json({ error: 'Failed to fetch funding requirements' });
  }
};

/**
 * GET /api/funding/history
 * Get funding history data, optionally filtered by year or route
 */
const getFundingHistory = async (req, res) => {
  try {
    // Get history from the database using the service
    // with optional filtering by year or route
    const filters = {};
    if (req.query.year) {
      filters.year = req.query.year;
    }
    if (req.query.route) {
      filters.route = req.query.route;
    }
    
    const history = await fundingService.getAllFundingHistory(filters);
    
    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching funding history:', error);
    res.status(500).json({ error: 'Failed to fetch funding history' });
  }
};

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Define routes
router.get('/requirements', getFundingRequirements);
router.get('/history', getFundingHistory);

module.exports = {
  router,
  getFundingRequirements,
  getFundingHistory
};
