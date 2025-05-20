/**
 * BCR Update Controller
 * Handles updating BCR phases and statuses
 */
const bcrModel = require('../../models/bcr/model');
const { WORKFLOW_PHASES, PHASE_STATUSES, STATUS_TAG_COLORS } = require('../../config/constants');

/**
 * Show the BCR update form
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const updateForm = async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Get the BCR
    const bcr = await bcrModel.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        error: {},
        user: req.user
      });
    }
    
    // Get status tag color
    const statusTagColor = STATUS_TAG_COLORS[bcr.status] || STATUS_TAG_COLORS.DEFAULT;
    
    // Render the update form
    res.render('bcr/update', {
      title: `Update BCR ${bcr.bcrCode}`,
      bcr: {
        ...bcr,
        statusTagColor
      },
      workflowPhases: WORKFLOW_PHASES,
      phaseStatuses: PHASE_STATUSES,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error showing BCR update form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the BCR update form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process a BCR phase update
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const update = async (req, res) => {
  try {
    const bcrId = req.params.id;
    const { phase, status, comment } = req.body;
    const updatedBy = req.user ? req.user.name : 'System';
    
    // Validate inputs
    if (!phase || !WORKFLOW_PHASES.includes(phase)) {
      return res.status(400).render('bcr/warning', {
        title: 'Invalid Phase',
        message: 'Please select a valid phase',
        user: req.user
      });
    }
    
    if (!status || !PHASE_STATUSES.includes(status)) {
      return res.status(400).render('bcr/warning', {
        title: 'Invalid Status',
        message: 'Please select a valid status',
        user: req.user
      });
    }
    
    // Get the BCR
    const bcr = await bcrModel.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        error: {},
        user: req.user
      });
    }
    
    // Update the BCR phase and status
    const updatedBcr = await bcrModel.updateBcrPhase(bcrId, phase, status, comment, updatedBy);
    
    // If the status is Completed or Skipped, auto-advance to the next phase
    if (status === PHASE_STATUSES[2] || status === PHASE_STATUSES[3]) {
      await bcrModel.autoAdvancePhase(bcrId);
    }
    
    // Render confirmation page
    res.render('bcr/confirm', {
      title: 'BCR Updated',
      message: `BCR ${bcr.bcrCode} has been updated to phase "${phase}" with status "${status}"`,
      bcr: updatedBcr,
      user: req.user
    });
  } catch (error) {
    console.error('Error updating BCR:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while updating the BCR',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

module.exports = {
  updateForm,
  update
};
