/**
 * BCR Workflow View Controller
 * Handles BCR workflow visualization
 */
const { Bcr, Phase, Status } = require('../../../models/modules/bcr/model');
const workflowService = require('../../../services/modules/bcr/workflowService');

/**
 * Display the workflow view for a BCR
 */
exports.showWorkflowView = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the BCR
    const bcr = await Bcr.findById(id)
      .populate('submissionId')
      .populate('currentPhaseId')
      .populate('currentStatusId')
      .exec();
    
    if (!bcr) {
      req.flash('error', 'BCR not found');
      return res.redirect('/bcr/business-change-requests');
    }
    
    // Get the workflow visual
    const workflowVisual = await workflowService.getWorkflowVisual(id);
    
    // Get all phases for the dropdown
    const allPhases = await Phase.find({ deleted: { $ne: true } })
      .sort({ displayOrder: 1 })
      .exec();
    
    // Format a simple workflow history
    const workflowHistory = bcr.workflowHistory || [];
    
    // Render the workflow view
    res.render('modules/bcr/bcrs/workflow-view', {
      title: `Workflow: ${bcr.bcrNumber}`,
      bcr,
      workflowVisual,
      workflowHistory,
      allPhases,
      user: req.user,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error in showWorkflowView:', error);
    req.flash('error', `Error displaying workflow view: ${error.message}`);
    res.redirect('/bcr/business-change-requests');
  }
};

/**
 * Handle the next phase action
 */
exports.handleNextPhase = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, skipCurrentPhase } = req.body;
    
    // Move to the next phase
    await workflowService.moveToNextPhase(id, {
      skipCurrentPhase: skipCurrentPhase === 'true',
      comments,
      userId: req.user?._id
    });
    
    req.flash('success', 'BCR moved to the next phase successfully');
    res.redirect(`/bcr/workflow/${id}`);
  } catch (error) {
    console.error('Error in handleNextPhase:', error);
    req.flash('error', `Error moving to next phase: ${error.message}`);
    res.redirect(`/bcr/workflow/${id}`);
  }
};

/**
 * Handle the skip to phase action
 */
exports.handleSkipToPhase = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetPhaseId, comments } = req.body;
    
    // Skip to the target phase
    await workflowService.skipToPhase(id, targetPhaseId, {
      comments,
      userId: req.user?._id
    });
    
    req.flash('success', 'BCR skipped to the selected phase successfully');
    res.redirect(`/bcr/workflow/${id}`);
  } catch (error) {
    console.error('Error in handleSkipToPhase:', error);
    req.flash('error', `Error skipping to phase: ${error.message}`);
    res.redirect(`/bcr/workflow/${id}`);
  }
};
