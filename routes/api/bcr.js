/**
 * API Business Change Request (BCR) Routes
 */
const express = require('express');
const router = express.Router();
const { BCR } = require('../../models');
const { ensureAuthenticated, checkPermission } = require('../../middleware/auth');

/**
 * GET /api/bcr
 * Get all BCRs, optionally filtered by status or priority
 */
const getBCRList = async (req, res) => {
  try {
    const where = {};
    
    // Apply filters if provided
    if (req.query.status) {
      where.status = req.query.status;
    }
    
    if (req.query.priority) {
      where.priority = req.query.priority;
    }
    
    const bcrs = await BCR.findAll({ where });
    res.status(200).json(bcrs);
  } catch (error) {
    console.error('Error fetching BCRs:', error);
    res.status(500).json({ error: 'Failed to fetch BCRs' });
  }
};

/**
 * POST /api/bcr
 * Create a new BCR
 */
const createBCR = async (req, res) => {
  try {
    const { title, description, priority, targetDate } = req.body;
    
    // Validate required fields
    if (!title || !description || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create the BCR
    const bcr = await BCR.create({
      title,
      description,
      priority,
      targetDate,
      status: 'draft',
      createdBy: req.user.id
    });
    
    res.status(201).json(bcr);
  } catch (error) {
    console.error('Error creating BCR:', error);
    res.status(500).json({ error: 'Failed to create BCR' });
  }
};

/**
 * GET /api/bcr/:id
 * Get a specific BCR by ID
 */
const getBCRById = async (req, res) => {
  try {
    const bcr = await BCR.findByPk(req.params.id);
    
    if (!bcr) {
      return res.status(404).json({ error: 'BCR not found' });
    }
    
    res.status(200).json(bcr);
  } catch (error) {
    console.error('Error fetching BCR:', error);
    res.status(500).json({ error: 'Failed to fetch BCR' });
  }
};

/**
 * PATCH /api/bcr/:id/status
 * Update the status of a BCR
 */
const updateBCRStatus = async (req, res) => {
  try {
    const { status, comment } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Validate status value using GOV.UK Design System tag colors
    const validStatuses = ['draft', 'submitted', 'in-progress', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Find the BCR
    const bcr = await BCR.findByPk(req.params.id);
    
    if (!bcr) {
      return res.status(404).json({ error: 'BCR not found' });
    }
    
    // Update the BCR status
    await BCR.update(
      { 
        status,
        lastComment: comment || null,
        updatedBy: req.user.id
      },
      { where: { id: req.params.id } }
    );
    
    // Get the updated BCR
    const updatedBCR = await BCR.findByPk(req.params.id);
    
    res.status(200).json(updatedBCR);
  } catch (error) {
    console.error('Error updating BCR status:', error);
    res.status(500).json({ error: 'Failed to update BCR status' });
  }
};

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Define routes
router.get('/', getBCRList);
router.post('/', checkPermission('bcr.create'), createBCR);
router.get('/:id', getBCRById);
router.patch('/:id/status', checkPermission('bcr.update'), updateBCRStatus);

module.exports = {
  router,
  getBCRList,
  createBCR,
  getBCRById,
  updateBCRStatus
};
