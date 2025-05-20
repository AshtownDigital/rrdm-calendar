/**
 * BCR View Controller
 * Handles viewing BCR details
 */
const bcrModel = require('../../models/bcr/model');
const submissionModel = require('../../models/bcr-submission/model');
const impactedAreasModel = require('../../models/impacted-areas/model');
const { WORKFLOW_PHASES, PHASE_STATUSES, STATUS_TAG_COLORS } = require('../../config/constants');

/**
 * View BCR details
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const view = async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    console.log(`Viewing BCR with ID: ${bcrId}`);
    
    // Get the BCR with more detailed error handling
    let bcr;
    try {
      bcr = await bcrModel.getBcrById(bcrId);
      console.log(`BCR retrieval result: ${bcr ? 'Found' : 'Not found'}`);
      
      if (bcr) {
        console.log(`BCR details: ID=${bcr.id}, Code=${bcr.bcrCode}, Phase=${bcr.currentPhase}`);
      }
    } catch (bcrError) {
      console.error('Error retrieving BCR:', bcrError);
      throw bcrError;
    }
    
    if (!bcr) {
      console.log(`BCR with ID ${bcrId} not found, redirecting to dashboard`);
      // Instead of showing an error page, redirect to the dashboard with a flash message
      req.flash('error', `BCR with ID ${bcrId} not found`);
      return res.redirect('/bcr/dashboard');
    }
    
    // Get the submission that created this BCR if submissionId exists
    let submission = null;
    if (bcr.submissionId) {
      submission = await submissionModel.getSubmissionById(bcr.submissionId);
    } else {
      // For testing purposes, try to get a submission with the same ID as the BCR
      // This is a temporary solution until the proper schema is in place
      submission = await submissionModel.getSubmissionById(bcrId);
    }
    
    // Get all impacted areas
    const allImpactedAreas = await impactedAreasModel.getAllImpactedAreas();
    
    // Map impacted area IDs to names if they exist
    const impactedAreaNames = bcr.impactedAreas ? bcr.impactedAreas.map(areaId => {
      const area = allImpactedAreas.find(a => a.id === areaId);
      return area ? area.name : 'Unknown Area';
    }) : [];
    
    // Get status tag color
    const statusTagColor = STATUS_TAG_COLORS[bcr.status] || STATUS_TAG_COLORS.DEFAULT;
    
    // Format workflow history for display if it exists
    const formattedHistory = bcr.workflowHistory ? bcr.workflowHistory.map(entry => ({
      ...entry,
      formattedTimestamp: new Date(entry.timestamp).toLocaleString(),
      statusTagColor: STATUS_TAG_COLORS[entry.status] || STATUS_TAG_COLORS.DEFAULT
    })) : [];
    
    // Render the BCR details view
    res.render('bcr/view', {
      title: `BCR ${bcr.bcrCode}`,
      bcr: {
        ...bcr,
        impactedAreaNames,
        statusTagColor,
        formattedHistory
      },
      submission,
      workflowPhases: WORKFLOW_PHASES,
      phaseStatuses: PHASE_STATUSES,
      user: req.user
    });
  } catch (error) {
    console.error('Error viewing BCR:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while viewing the BCR',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

module.exports = {
  view
};
