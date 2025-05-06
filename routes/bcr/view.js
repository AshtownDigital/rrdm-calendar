/**
 * BCR View Route
 */
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../../middleware/auth');
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');

/**
 * GET /bcr/:id
 * View a single BCR
 */
const viewBCR = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the BCR with associated users using the service
    const bcr = await bcrService.getBcrById(id);
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Business Change Request not found',
        error: { status: 404 }
      });
    }
    
    // Get BCR configuration data using the service
    const statuses = await bcrConfigService.getConfigsByType('status');
    const phases = await bcrConfigService.getConfigsByType('phase');
    const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
    const urgencyLevels = await bcrConfigService.getConfigsByType('urgencyLevel');
    
    // Define tag colors based on GOV.UK Design System
    const statusColors = {
      'draft': 'govuk-tag govuk-tag--grey',
      'submitted': 'govuk-tag govuk-tag--blue',
      'under_review': 'govuk-tag govuk-tag--light-blue',
      'approved': 'govuk-tag govuk-tag--green',
      'rejected': 'govuk-tag govuk-tag--red',
      'implemented': 'govuk-tag govuk-tag--purple'
    };
    
    const priorityColors = {
      'low': 'govuk-tag govuk-tag--grey',
      'medium': 'govuk-tag govuk-tag--blue',
      'high': 'govuk-tag govuk-tag--orange',
      'critical': 'govuk-tag govuk-tag--red'
    };
    
    res.render('modules/bcr/view', {
      title: `BCR: ${bcr.title}`,
      bcr,
      statusColors,
      priorityColors,
      statuses,
      phases,
      impactAreas,
      urgencyLevels,
      user: req.user
    });
  } catch (error) {
    console.error('Error viewing BCR:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR',
      error
    });
  }
};

// Apply authentication middleware
router.use(ensureAuthenticated);

// Define routes
router.get('/:id', viewBCR);

module.exports = {
  router,
  viewBCR
};
