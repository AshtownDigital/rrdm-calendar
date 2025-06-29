/**
 * BCR Creation Route
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const BCR = require('../../models/BCR');
const { ensureAuthenticated, checkPermission } = require('../../middleware/auth');

/**
 * GET /bcr/create
 * Render the BCR creation form
 */
const renderCreateForm = (req, res) => {
  res.render('modules/bcr/create', {
    title: 'Create Business Change Request',
    user: req.user || {}
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
        user: req.user || {}
      });
    }
    
    // Generate a new BCR code (you might want to implement a more sophisticated logic)
    const lastBCR = await BCR.findOne().sort({ recordNumber: -1 });
    const nextRecordNumber = lastBCR ? lastBCR.recordNumber + 1 : 1000;
    
    // Create the BCR
    const bcr = new BCR({
      recordNumber: nextRecordNumber,
      bcrCode: `BCR-${nextRecordNumber}`,
      title,
      description,
      priority,
      status: 'draft',
      currentPhase: 'draft',
      urgencyLevel: priority.toLowerCase(),
      impactedAreas: [],
      workflowHistory: [{
        phase: 'draft',
        status: 'draft',
        updatedAt: new Date(),
        updatedBy: req.user ? req.user.id : 'system',
        comments: 'BCR created'
      }],
      submissionId: new mongoose.Types.ObjectId(),
      createdBy: req.user ? req.user.id : 'system'
    });
    
    await bcr.save();
    
    // Redirect to the BCR view page
    res.redirect(`/bcr/${bcr._id}`);
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
