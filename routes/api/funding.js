/**
 * API Funding Routes
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { ensureAuthenticated } = require('../../middleware/auth');

// Load funding data from JSON files
const loadFundingRequirements = () => {
  try {
    const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
    if (fs.existsSync(requirementsPath)) {
      const data = fs.readFileSync(requirementsPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading funding requirements:', error);
    return [];
  }
};

const loadFundingHistory = () => {
  try {
    const historyPath = path.join(__dirname, '../../data/funding/history.json');
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading funding history:', error);
    return [];
  }
};

/**
 * GET /api/funding/requirements
 * Get funding requirements data, optionally filtered by route
 */
const getFundingRequirements = async (req, res) => {
  try {
    let requirements = loadFundingRequirements();
    
    // Filter by route if specified
    if (req.query.route) {
      requirements = requirements.filter(item => item.route === req.query.route);
    }
    
    res.status(200).json(requirements);
  } catch (error) {
    console.error('Error fetching funding requirements:', error);
    res.status(500).json({ error: 'Failed to fetch funding requirements' });
  }
};

/**
 * GET /api/funding/history
 * Get funding history data, optionally filtered by year
 */
const getFundingHistory = async (req, res) => {
  try {
    let history = loadFundingHistory();
    
    // Filter by year if specified
    if (req.query.year) {
      const year = parseInt(req.query.year, 10);
      history = history.filter(item => item.year === year);
    }
    
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
