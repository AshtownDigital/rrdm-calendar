/**
 * BCR Workflow View Controller
 * Handles BCR workflow visualization
 */
const { Bcr, Phase } = require('../../../models/modules/bcr/model');
const workflowService = require('../../../services/modules/bcr/workflowService');

/**
 * Display the workflow view for a BCR
 */
exports.showWorkflowView = async (req, res) => {
  try {
    // Get the BCR
    const bcr = await Bcr.findById(req.params.id)
      .populate('submissionId')
      .populate('currentPhaseId')
      .populate('currentStatusId')
      .exec();
    
    if (!bcr) {
      req.flash('error', 'BCR not found');
      return res.redirect('/bcr/business-change-requests');
    }
    
    // Get the workflow visual
    const workflowVisual = await workflowService.getWorkflowVisual(req.params.id);
    
    // Get all phases for the dropdown
    const allPhases = await Phase.find({ deleted: { $ne: true } })
      .sort({ displayOrder: 1 })
      .exec();
    
    // Format a simple workflow history
    const workflowHistory = bcr.workflowHistory || [];
    
    // Render the workflow view
    res.render('modules/bcr/workflow/index', {
      title: `Workflow: ${bcr.bcrNumber}`,
      bcr,
      workflowVisual,
      workflowHistory,
      allPhases,
      user: req.user,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    req.flash('error', `Error displaying workflow view: ${error.message}`);
    return res.redirect('/bcr/business-change-requests');
  }
};

/**
 * Handle the next phase action
 */
exports.handleNextPhase = async (req, res) => {
  try {
    const { comments, skipCurrentPhase } = req.body;
    
    // Move to the next phase
    await workflowService.moveToNextPhase(req.params.id, {
      skipCurrentPhase: skipCurrentPhase === 'true',
      comments,
      userId: req.user?._id
    });
    
    req.flash('success', 'BCR moved to the next phase successfully');
    return res.redirect(`/bcr/workflow/${req.params.id}`);
  } catch (error) {
    req.flash('error', `Error moving to next phase: ${error.message}`);
    return res.redirect(`/bcr/workflow/${req.params.id}`);
  }
};

/**
 * Handle the skip to phase action
 */
exports.handleSkipToPhase = async (req, res) => {
  try {
    const { targetPhaseId, comments } = req.body;
    
    // Skip to the target phase
    await workflowService.skipToPhase(req.params.id, targetPhaseId, {
      comments,
      userId: req.user?._id
    });
    
    req.flash('success', 'BCR skipped to the selected phase successfully');
    return res.redirect(`/bcr/workflow/${req.params.id}`);
  } catch (error) {
    req.flash('error', `Error skipping to phase: ${error.message}`);
    return res.redirect(`/bcr/workflow/${req.params.id}`);
  }
};
