/**
 * Controller for BCR submission details
 * Handles rendering the BCR submission details page with correct phase groupings
 */
// Using centralized Prisma client
const { Bcr, BcrConfig } = require('../../models');
require('../../config/database.mongo');
// Prisma client is imported from centralized config

/**
 * View BCR details - Renamed to match the BCR_DEVELOPER_OVERVIEW.md document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function viewBCR(req, res) {
  try {
    console.log('BCR submission details controller called for ID:', req.params.id);
    
    // Get the BCR directly to check if it exists
    let bcr = null;
    try {
      bcr = await prisma.Bcrs.findUnique({
        where: { id: req.params.id }
      });
    } catch (error) {
      console.log('Error retrieving BCR:', error.message);
    }
    
    if (!bcr) {
      console.log(`BCR with ID ${req.params.id} not found`);
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${req.params.id} not found. The BCR may have been deleted or the ID is incorrect.`,
        error: {},
        user: req.user
      });
    }
    
    // Create submission and workflow objects directly from BCR data with comprehensive mapping
    const submission = {
      id: bcr.id,
      bcrId: bcr.id,
      bcrNumber: bcr.bcrNumber,
      title: bcr.title || bcr.description,
      description: bcr.description,
      priority: bcr.priority,
      impact: bcr.impact,
      requestedBy: bcr.requestedBy,
      createdAt: bcr.createdAt,
      updatedAt: bcr.updatedAt,
      dateSubmitted: bcr.createdAt,
      lastUpdated: bcr.updatedAt,
      submitter: {
        name: 'Admin User', // Default name since we're using the admin user
        email: 'admin@example.com' // Default email for admin user
      },
      submitterOrganisation: 'Register Team',
      employmentType: 'Internal',
      justification: bcr.notes || 'Justification for this BCR',
      technicalDependencies: 'Technical dependencies will be determined during implementation',
      relatedDocuments: [],
      status: bcr.status || 'New Submission',
      impactAreas: bcr.impact ? bcr.impact.split(', ') : [],
      // Add fields for "Change Request Relates To" and "Urgency of Change"
      changeType: bcr.impact ? bcr.impact.split(', ') : [],
      urgency: bcr.priority ? bcr.priority.charAt(0).toUpperCase() + bcr.priority.slice(1) : 'Medium', // Capitalize first letter
      // Map Current Phase to Current Status
      currentPhaseId: bcr.currentPhaseId || 1,
      workflowHistory: bcr.workflowHistory || []
    };
    
    // Get urgency levels, impact areas, and phases
    let urgencyLevels = [];
    let impactAreas = [];
    let phases = [];
    let statuses = [];
    
    try {
      urgencyLevels = await BcrConfig.find({ type: 'urgency' }).sort({ displayOrder: 'asc' });
      
      impactAreas = await BcrConfig.find({ type: 'impact' }).sort({ displayOrder: 'asc' });
      
      phases = await BcrConfig.find({ type: 'phase' }).sort({ displayOrder: 1 });
      
      statuses = await BcrConfig.find({ type: 'status' }).sort({ displayOrder: 1 });
    } catch (error) {
      console.log('Error retrieving BCR configs:', error.message);
    }
    
    // Render the template with all available data
    return res.render('modules/bcr/submission-details', {
      title: `BCR ${bcr.bcrNumber || bcr.id}`,
      bcr,
      submission,
      requester: null,
      assignee: null,
      urgencyLevels,
      impactAreas,
      phases,
      statuses,
      user: req.user
    });
  } catch (error) {
    console.error('Error in BCR submission details controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to view the BCR submission.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
}

/**
 * Update BCR Form - Renders the form for updating a BCR
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateBCRForm(req, res) {
  try {
    console.log('BCR update form controller called for ID:', req.params.id);
    
    // Get the BCR directly to check if it exists
    let bcr = null;
    try {
      bcr = await prisma.Bcrs.findUnique({
        where: { id: req.params.id }
      });
    } catch (error) {
      console.log('Error retrieving BCR:', error.message);
    }
    
    if (!bcr) {
      console.log(`BCR with ID ${req.params.id} not found`);
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${req.params.id} not found. The BCR may have been deleted or the ID is incorrect.`,
        error: {},
        user: req.user
      });
    }
    
    // Get all phases and statuses for the form
    const phases = await prisma.BcrConfigs.findMany({
      where: { type: 'phase' },
      orderBy: { value: 'asc' }
    });
    
    const statuses = await prisma.BcrConfigs.findMany({
      where: { type: 'status' },
      orderBy: { value: 'asc' }
    });
    
    // Get urgency levels and impact areas for the form
    const urgencyLevels = ['Low', 'Medium', 'High', 'Critical'];
    const impactAreas = await prisma.BcrConfigs.findMany({
      where: { type: 'impact_area' },
      orderBy: { name: 'asc' }
    });
    
    // Create submission object from BCR data
    const submission = {
      id: bcr.id,
      bcrId: bcr.id,
      bcrNumber: bcr.bcrNumber,
      title: bcr.title || bcr.description,
      description: bcr.description,
      priority: bcr.priority,
      impact: bcr.impact,
      requestedBy: bcr.requestedBy,
      createdAt: bcr.createdAt,
      updatedAt: bcr.updatedAt,
      dateSubmitted: bcr.createdAt,
      lastUpdated: bcr.updatedAt,
      status: bcr.status
    };
    
    return res.render('modules/bcr/update', {
      title: `Update BCR ${bcr.bcrNumber || bcr.id}`,
      bcr,
      submission,
      phases,
      statuses,
      urgencyLevels,
      impactAreas,
      user: req.user
    });
  } catch (error) {
    console.error('Error in BCR update form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to access the BCR update form.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
}

module.exports = {
  viewBCR,
  updateBCRForm,
  // Keep the old method name for backward compatibility
  showSubmissionDetails: viewBCR
};
