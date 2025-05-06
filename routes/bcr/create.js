/**
 * BCR Creation Route
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { BCR } = require('../../models');
const { ensureAuthenticated, checkPermission } = require('../../middleware/auth');

/**
 * GET /bcr/create
 * Render the BCR creation form
 */
const renderCreateForm = (req, res) => {
  res.render('modules/bcr/create', {
    title: 'Create Business Change Request',
    user: req.user
  });
};

/**
 * POST /bcr/create
 * Create a new BCR
 */
const createBCR = async (req, res) => {
  try {
    const { title, description, priority, targetDate } = req.body;
    
    // Validate required fields
    if (!title || !description || !priority) {
      return res.status(400).render('modules/bcr/create', {
        title: 'Create Business Change Request',
        error: 'Please fill in all required fields',
        formData: req.body,
        user: req.user
      });
    }
    
    // Create the BCR
    const bcr = await BCR.create({
      id: uuidv4(),
      title,
      description,
      priority,
      targetDate: targetDate || null,
      status: 'draft',
      createdBy: req.user.id
    });
    
    // Redirect to the BCR view page
    res.redirect(`/bcr/${bcr.id}`);
  } catch (error) {
    console.error('Error creating BCR:', error);
    res.status(500).render('modules/bcr/create', {
      title: 'Create Business Change Request',
      error: 'Failed to create BCR',
      formData: req.body,
      user: req.user
    });
  }
};

// Apply authentication middleware
router.use(ensureAuthenticated);

// Define routes
router.get('/', renderCreateForm);
router.post('/', checkPermission('bcr.create'), createBCR);

module.exports = {
  router,
  renderCreateForm,
  createBCR
};
