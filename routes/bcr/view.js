/**
 * BCR View Route
 */
const express = require('express');
const router = express.Router();
const { BCR } = require('../../models');
const { ensureAuthenticated } = require('../../middleware/auth');

/**
 * GET /bcr/:id
 * View a single BCR
 */
const viewBCR = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the BCR
    const bcr = await BCR.findByPk(id);
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Business Change Request not found',
        error: { status: 404 }
      });
    }
    
    // Define tag colors based on GOV.UK Design System
    const statusColors = {
      'draft': 'govuk-tag govuk-tag--grey',
      'submitted': 'govuk-tag govuk-tag--blue',
      'in-progress': 'govuk-tag govuk-tag--light-blue',
      'approved': 'govuk-tag govuk-tag--green',
      'rejected': 'govuk-tag govuk-tag--red',
      'completed': 'govuk-tag govuk-tag--purple'
    };
    
    const priorityColors = {
      'low': 'govuk-tag govuk-tag--grey',
      'medium': 'govuk-tag govuk-tag--blue',
      'high': 'govuk-tag govuk-tag--red'
    };
    
    res.render('modules/bcr/view', {
      title: `BCR: ${bcr.title}`,
      bcr,
      statusColors,
      priorityColors,
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
