/**
 * BCR Index Controller
 * Handles the main BCR management page
 */
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');

/**
 * Display the main BCR management page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const index = (req, res) => {
  res.render('modules/bcr/index', {
    title: 'BCR Management',
    user: req.user
  });
};

module.exports = {
  index
};
