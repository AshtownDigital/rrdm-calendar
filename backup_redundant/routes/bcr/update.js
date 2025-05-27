/**
 * BCR Update Route
 */
const express = require('express');
const router = express.Router();
const BCR = require('../../models/BCR');
const { ensureAuthenticated, checkPermission } = require('../../middleware/auth');

/**
 * POST /bcr/:id/status
 * Update the status of a BCR
 */
const updateBCRStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    
    // Validate status
    const validStatuses = ['draft', 'submitted', 'in-progress', 'approved', 'rejected', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Find the BCR
    const bcr = await BCR.findById(id);
    
    if (!bcr) {
      return res.status(404).json({ error: 'BCR not found' });
    }
    
    // Update the BCR status and add to workflow history
    bcr.status = status;
    bcr.workflowHistory.push({
      phase: bcr.currentPhase,
      status,
      updatedAt: new Date(),
      updatedBy: req.user ? req.user.id : 'system',
      comments: comment || 'Status updated'
    });
    
    await bcr.save();
    
    // Redirect back to the BCR view page
    if (req.xhr) {
      // If it's an AJAX request, return JSON response
      return res.status(200).json({ success: true });
    } else {
      // Otherwise redirect to the BCR view page
      return res.redirect(`/bcr/${id}`);
    }
  } catch (error) {
    console.error('Error updating BCR status:', error);
    
    if (req.xhr) {
      // If it's an AJAX request, return JSON error
      return res.status(500).json({ error: 'Failed to update BCR status' });
    } else {
      // Otherwise render error page
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to update BCR status',
        error
      });
    }
  }
};

// Apply authentication middleware
router.use(ensureAuthenticated);

// Define routes
router.post('/:id/status', checkPermission('bcr.update'), updateBCRStatus);

module.exports = {
  router,
  updateBCRStatus
};
