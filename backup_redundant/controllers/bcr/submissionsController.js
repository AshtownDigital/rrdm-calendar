/**
 * BCR Submissions Controller
 * Handles BCR submissions listing, viewing, and filtering
 */
const { validate: isUuid } = require('uuid');

// Import services
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');
const trelloService = require('../../services/trelloService');
const pdfService = require('../../services/pdfService');
const slaService = require('../../services/slaService');
const path = require('path');

// Import MongoDB models
const Submission = require('../../models/Submission');
const Bcr = require('../../models/Bcr');
const User = require('../../models/User');
const BcrConfig = require('../../models/BcrConfig');
const ImpactedArea = require('../../models/ImpactedArea');
const AuditLog = require('../../models/AuditLog');

/**
 * Helper to validate if a string is a UUID or BCR number
 * @param {string} id
 * @returns {boolean}
 */
function isValidBcrId(id) {
  if (!id) return false;
  const isBcrNumber = /^BCR-\d{2}\/\d{2}-\d{3}$/.test(id);
  return isBcrNumber || isUuid(id);
}

/**
 * Render an error page with consistent formatting
 */
function renderError(res, { status = 500, title = 'Error', message = 'An error occurred', error = {}, user = null }) {
  return res.status(status).render('error', {
    title,
    message,
    error: process.env.NODE_ENV === 'development' ? error : {},
    user
  });
}

/**
 * List BCR submissions with optional filtering
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function listSubmissions(req, res) {
  console.log('==== BCR listSubmissions called ====');
  try {
    // Parse filters from query
    const { status, impactArea, submitter, startDate, endDate } = req.query;
    console.log('Query params:', { status, impactArea, submitter, startDate, endDate });
    
    const filters = {};
    if (status && status !== 'all') filters.status = status;
    if (impactArea && impactArea !== 'all') filters.impactArea = impactArea;
    if (submitter && submitter !== 'all') filters.submitter = submitter;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    console.log('Applying filters:', filters);

    console.log('Fetching data from services...');
    // Fetch data
    let submissions, allStatuses, phases, impactAreas;
    try {
      console.log('Getting BCRs from bcrService...');
      submissions = await bcrService.getAllBcrs(filters);
      console.log(`Retrieved ${submissions ? submissions.length : 0} submissions`);
    } catch (error) {
      console.error('Error getting BCRs:', error);
      throw error;
    }
    
    try {
      console.log('Getting status configs...');
      allStatuses = await bcrConfigService.getConfigsByType('status');
      console.log(`Retrieved ${allStatuses ? allStatuses.length : 0} statuses`);
    } catch (error) {
      console.error('Error getting statuses:', error);
      throw error;
    }
    
    try {
      console.log('Getting phase configs...');
      phases = await bcrConfigService.getConfigsByType('phase');
      console.log(`Retrieved ${phases ? phases.length : 0} phases`);
    } catch (error) {
      console.error('Error getting phases:', error);
      throw error;
    }
    
    try {
      console.log('Getting impact area configs...');
      impactAreas = await bcrConfigService.getConfigsByType('impact_area');
      console.log(`Retrieved ${impactAreas ? impactAreas.length : 0} impact areas`);
    } catch (error) {
      console.error('Error getting impact areas:', error);
      throw error;
    }
    
    // Create a mapping of phase values to their in-progress status
    const phaseToStatusMap = {};
    
    // Log phase and status data for debugging
    console.log(`Processing ${phases.length} phases and ${allStatuses.length} statuses`);
    
    // First, log the first few phases and statuses for debugging
    if (phases.length > 0) {
      console.log('Sample phase:', {
        id: phases[0]._id,
        name: phases[0].name,
        value: phases[0].value,
        type: phases[0].type
      });
    }
    
    if (allStatuses.length > 0) {
      console.log('Sample status:', {
        id: allStatuses[0]._id,
        name: allStatuses[0].name,
        value: allStatuses[0].value,
        type: allStatuses[0].type
      });
    }
    
    // Map phases to their in-progress status
    for (const phase of phases) {
      // Find the in-progress status for this phase
      const inProgressStatus = allStatuses.find(status => 
        status.phaseValue === phase.value && 
        status.statusType === 'in_progress'
      );
      
      if (inProgressStatus) {
        phaseToStatusMap[phase.value] = inProgressStatus.value;
        console.log(`Mapped phase ${phase.value} to status ${inProgressStatus.value}`);
      } else {
        console.warn(`No in-progress status found for phase ${phase.value}`);
      }
    }
    
    // Get all unique submitters for the filter dropdown
    const submitters = [];
    const submitterSet = new Set();
    
    for (const submission of submissions) {
      if (submission.submission && submission.submission.submittedBy) {
        const submitter = submission.submission.submittedBy;
        const submitterKey = submitter.email || submitter.name;
        
        if (submitterKey && !submitterSet.has(submitterKey)) {
          submitterSet.add(submitterKey);
          submitters.push({
            id: submitter.id,
            name: submitter.name,
            email: submitter.email
          });
        }
      }
    }
    
    // Sort submitters by name
    submitters.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    // Get all unique statuses for the filter dropdown
    const statusOptions = [];
    const statusSet = new Set();
    
    for (const submission of submissions) {
      if (submission.status && !statusSet.has(submission.status)) {
        statusSet.add(submission.status);
        
        // Find the display name for this status
        const statusConfig = allStatuses.find(s => s.value === submission.status);
        const displayName = statusConfig ? statusConfig.name : submission.status;
        
        statusOptions.push({
          value: submission.status,
          name: displayName
        });
      }
    }
    
    // Sort status options by name
    statusOptions.sort((a, b) => a.name.localeCompare(b.name));
    
    // Format the submissions for display
    const formattedSubmissions = submissions.map(submission => {
      // Find the display name for the status
      const statusConfig = allStatuses.find(s => s.value === submission.status);
      const statusName = statusConfig ? statusConfig.name : submission.status || 'Unknown';
      
      // Find the display name for the phase
      const phaseConfig = phases.find(p => p.value === submission.currentPhase);
      const phaseName = phaseConfig ? phaseConfig.name : submission.currentPhase || 'Unknown';
      
      // Find the tag color for the status
      const statusColor = statusConfig ? statusConfig.color || 'blue' : 'blue';
      
      // Format the impacted areas
      const formattedImpactAreas = Array.isArray(submission.impactedAreas) 
        ? submission.impactedAreas.map(area => {
            const areaConfig = impactAreas.find(ia => ia.value === area);
            return areaConfig ? areaConfig.name : area;
          }).join(', ') 
        : 'None';
      
      return {
        id: submission.id,
        bcrCode: submission.bcrCode,
        submissionDate: submission.createdAt ? new Date(submission.createdAt).toLocaleDateString('en-GB') : 'Unknown',
        submitter: submission.submission && submission.submission.submittedBy 
          ? submission.submission.submittedBy.name 
          : 'Unknown',
        description: submission.submission ? submission.submission.briefDescription : 'No description',
        status: {
          value: submission.status,
          name: statusName,
          color: statusColor
        },
        phase: {
          value: submission.currentPhase,
          name: phaseName
        },
        urgencyLevel: submission.urgencyLevel || 'Unknown',
        impactedAreas: formattedImpactAreas
      };
    });
    
    // Render the submissions list page
    res.render('bcr/submissions', {
      title: 'BCR Submissions',
      submissions: formattedSubmissions,
      filters: {
        status: status || 'all',
        impactArea: impactArea || 'all',
        submitter: submitter || 'all',
        startDate: startDate || '',
        endDate: endDate || ''
      },
      filterOptions: {
        statuses: [{ value: 'all', name: 'All Statuses' }, ...statusOptions],
        impactAreas: [
          { value: 'all', name: 'All Impact Areas' },
          ...impactAreas.map(area => ({ value: area.value, name: area.name }))
        ],
        submitters: [
          { id: 'all', name: 'All Submitters' },
          ...submitters
        ]
      },
      phaseToStatusMap,
      user: req.user
    });
  } catch (error) {
    console.error('Error in listSubmissions:', error);
    return renderError(res, {
      status: 500,
      title: 'Error Listing BCR Submissions',
      message: 'An error occurred while listing BCR submissions',
      error,
      user: req.user
    });
  }
}

/**
 * View a single BCR submission
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function viewSubmission(req, res) {
  try {
    const bcrId = req.params.id;
    
    if (!isValidBcrId(bcrId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        user: req.user
      });
    }
    
    // Get the BCR
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'BCR Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }
    
    // Get the submission
    const submission = bcr.submission;
    
    if (!submission) {
      return renderError(res, {
        status: 404,
        title: 'Submission Not Found',
        message: `Submission for BCR ${bcrId} not found`,
        user: req.user
      });
    }
    
    // Get the workflow activities
    const workflowActivities = await bcrService.getWorkflowActivities(bcrId);
    
    // Get all phases and statuses for the dropdown
    const phases = await bcrConfigService.getConfigsByType('phase');
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    // Get all users for the assignee dropdown
    const users = await User.find({}).sort({ name: 1 });
    
    // Format the BCR for display
    const formattedBcr = {
      id: bcr.id,
      bcrCode: bcr.bcrCode,
      submissionDate: bcr.createdAt ? new Date(bcr.createdAt).toLocaleDateString('en-GB') : 'Unknown',
      submitter: submission.submittedBy ? submission.submittedBy.name : 'Unknown',
      description: submission.briefDescription || 'No description',
      status: bcr.status,
      phase: bcr.currentPhase,
      urgencyLevel: bcr.urgencyLevel || 'Unknown',
      impactedAreas: Array.isArray(bcr.impactedAreas) ? bcr.impactedAreas.join(', ') : 'None',
      workflowHistory: bcr.workflowHistory || []
    };
    
    // Format the submission for display
    const formattedSubmission = {
      id: submission.id,
      submissionCode: submission.submissionCode,
      fullName: submission.fullName,
      emailAddress: submission.emailAddress,
      briefDescription: submission.briefDescription,
      detailedDescription: submission.detailedDescription,
      businessJustification: submission.businessJustification,
      submissionSource: submission.submissionSource,
      urgencyLevel: submission.urgencyLevel,
      impactAreas: Array.isArray(submission.impactAreas) ? submission.impactAreas.join(', ') : 'None',
      affectedReferenceDataArea: submission.affectedReferenceDataArea,
      technicalDependencies: submission.technicalDependencies,
      relatedDocuments: submission.relatedDocuments,
      attachments: submission.attachments,
      additionalNotes: submission.additionalNotes,
      declaration: submission.declaration,
      submittedBy: submission.submittedBy ? {
        id: submission.submittedBy.id,
        name: submission.submittedBy.name,
        email: submission.submittedBy.email
      } : null
    };
    
    // Format the workflow activities for display
    const formattedActivities = workflowActivities.map(activity => {
      // Find the display name for the status
      const statusConfig = statuses.find(s => s.value === activity.status);
      const statusName = statusConfig ? statusConfig.name : activity.status || 'Unknown';
      
      // Find the display name for the phase
      const phaseConfig = phases.find(p => p.value === activity.phase);
      const phaseName = phaseConfig ? phaseConfig.name : activity.phase || 'Unknown';
      
      return {
        id: activity.id,
        timestamp: activity.performedAt ? new Date(activity.performedAt).toLocaleString('en-GB') : 'Unknown',
        action: activity.action,
        phase: {
          value: activity.phase,
          name: phaseName
        },
        status: {
          value: activity.status,
          name: statusName
        },
        performedBy: activity.performedBy ? activity.performedBy.name : 'System',
        notes: activity.notes
      };
    });
    
    // Check if Trello integration is enabled
    const trelloEnabled = process.env.TRELLO_API_KEY && process.env.TRELLO_TOKEN;
    
    // Get SLA information if available
    let slaInfo = null;
    try {
      if (bcr.currentPhase) {
        slaInfo = await slaService.getSlaForPhase(bcr.currentPhase);
      }
    } catch (error) {
      console.warn('Error getting SLA info:', error);
    }
    
    // Render the BCR view page
    res.render('bcr/view', {
      title: `BCR ${bcr.bcrCode}`,
      bcr: formattedBcr,
      submission: formattedSubmission,
      workflowActivities: formattedActivities,
      phases: phases.map(phase => ({
        id: phase._id,
        value: phase.value,
        name: phase.name
      })),
      statuses: statuses.map(status => ({
        id: status._id,
        value: status.value,
        name: status.name,
        phaseValue: status.phaseValue
      })),
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      })),
      trelloEnabled,
      slaInfo,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  } catch (error) {
    console.error('Error in viewSubmission:', error);
    return renderError(res, {
      status: 500,
      title: 'Error Viewing BCR Submission',
      message: 'An error occurred while viewing the BCR submission',
      error,
      user: req.user
    });
  }
}

/**
 * Show the phase update confirmation page
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function phaseUpdateConfirmation(req, res) {
  try {
    const { bcrId, phase, status } = req.query;
    
    if (!isValidBcrId(bcrId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided BCR ID is not in a valid format',
        user: req.user
      });
    }
    
    // Get the BCR
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'BCR Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }
    
    // Get the phase and status details
    const phases = await bcrConfigService.getConfigsByType('phase');
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    const phaseConfig = phases.find(p => p.value === phase);
    const statusConfig = statuses.find(s => s.value === status);
    
    if (!phaseConfig || !statusConfig) {
      return renderError(res, {
        status: 400,
        title: 'Invalid Phase or Status',
        message: 'The provided phase or status is not valid',
        user: req.user
      });
    }
    
    // Render the confirmation page
    res.render('bcr/phase-update-confirmation', {
      title: 'Confirm Phase Update',
      bcr: {
        id: bcr.id,
        bcrCode: bcr.bcrCode,
        currentPhase: bcr.currentPhase,
        status: bcr.status
      },
      newPhase: {
        value: phaseConfig.value,
        name: phaseConfig.name
      },
      newStatus: {
        value: statusConfig.value,
        name: statusConfig.name
      },
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  } catch (error) {
    console.error('Error in phaseUpdateConfirmation:', error);
    return renderError(res, {
      status: 500,
      title: 'Error Loading Confirmation Page',
      message: 'An error occurred while loading the phase update confirmation page',
      error,
      user: req.user
    });
  }
}

/**
 * Simple test endpoint to verify controller and database connection
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function testEndpoint(req, res) {
  try {
    // Test database connection by fetching a few records
    const phases = await BcrConfig.find({ type: 'phase' }).limit(3);
    const statuses = await BcrConfig.find({ type: 'status' }).limit(3);
    const impactAreas = await ImpactedArea.find({}).limit(3);
    
    // Return the test results
    res.json({
      success: true,
      message: 'BCR submissions controller is working',
      data: {
        phases: phases.map(p => ({ id: p._id, name: p.name, value: p.value })),
        statuses: statuses.map(s => ({ id: s._id, name: s.name, value: s.value })),
        impactAreas: impactAreas.map(ia => ({ id: ia._id, name: ia.name, value: ia.value }))
      }
    });
  } catch (error) {
    console.error('Error in testEndpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error in BCR submissions controller test endpoint',
      error: error.message
    });
  }
}

/**
 * Display the new submission form
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function newSubmission(req, res) {
  try {
    // Get impact areas and urgency levels for the form
    const impactAreas = await ImpactedArea.find({}).sort({ order: 1 });
    const urgencyLevels = await bcrConfigService.getConfigsByType('urgencyLevel');
    
    // Define submission sources and attachments options
    const submissionSources = ['Internal', 'External', 'Partner', 'Other'];
    const attachmentsOptions = ['Yes', 'No'];
    
    // Render the new submission form
    res.render('bcr-submission/new', {
      title: 'New BCR Submission',
      impactAreas: impactAreas.map(ia => ({
        id: ia._id,
        name: ia.name,
        value: ia.value,
        order: ia.order
      })),
      urgencyLevels: urgencyLevels.map(ul => ({
        id: ul._id,
        name: ul.name,
        value: ul.value,
        order: ul.displayOrder
      })),
      submissionSources,
      attachmentsOptions,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  } catch (error) {
    console.error('Error in newSubmission:', error);
    return renderError(res, {
      status: 500,
      title: 'Error Loading Submission Form',
      message: 'An error occurred while loading the submission form',
      error,
      user: req.user
    });
  }
}

/**
 * Process a new BCR submission
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function createSubmission(req, res) {
  try {
    // Extract form data
    const {
      fullName,
      emailAddress,
      briefDescription,
      detailedDescription,
      businessJustification,
      submissionSource,
      urgencyLevel,
      impactAreas,
      affectedReferenceDataArea,
      technicalDependencies,
      relatedDocuments,
      attachments,
      additionalNotes,
      declaration
    } = req.body;
    
    // Validate required fields
    if (!fullName || !emailAddress || !briefDescription || !urgencyLevel || !impactAreas) {
      // Get form data for re-rendering
      const impactAreasData = await ImpactedArea.find({}).sort({ order: 1 });
      const urgencyLevelsData = await bcrConfigService.getConfigsByType('urgencyLevel');
      const submissionSources = ['Internal', 'External', 'Partner', 'Other'];
      const attachmentsOptions = ['Yes', 'No'];
      
      return res.status(400).render('bcr-submission/new', {
        title: 'New BCR Submission',
        error: true,
        errorMessage: 'Please fill in all required fields',
        formData: req.body,
        impactAreas: impactAreasData.map(ia => ({
          id: ia._id,
          name: ia.name,
          value: ia.value,
          order: ia.order
        })),
        urgencyLevels: urgencyLevelsData.map(ul => ({
          id: ul._id,
          name: ul.name,
          value: ul.value,
          order: ul.displayOrder
        })),
        submissionSources,
        attachmentsOptions,
        user: req.user,
        csrfToken: req.csrfToken ? req.csrfToken() : null
      });
    }
    
    // Generate a unique submission code
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    const yearCode = `${String(currentYear).slice(2)}/${String(nextYear).slice(2)}`;
    
    // Get the next submission number
    const lastSubmission = await Submission.findOne({}, {}, { sort: { 'submissionNumber': -1 } });
    const submissionNumber = lastSubmission ? lastSubmission.submissionNumber + 1 : 1;
    
    // Format the submission code
    const submissionCode = `SUB-${yearCode}-${String(submissionNumber).padStart(3, '0')}`;
    
    // Create the submission
    const submission = new Submission({
      submissionNumber,
      submissionCode,
      fullName,
      emailAddress,
      briefDescription,
      detailedDescription,
      businessJustification,
      submissionSource,
      urgencyLevel,
      impactAreas: Array.isArray(impactAreas) ? impactAreas : [impactAreas],
      affectedReferenceDataArea: affectedReferenceDataArea || null,
      technicalDependencies: technicalDependencies || null,
      relatedDocuments: relatedDocuments || null,
      attachments,
      additionalNotes: additionalNotes || null,
      declaration: declaration === 'true' || declaration === true,
      createdAt: now,
      updatedAt: now,
      submittedById: req.user._id
    });
    
    // Save the submission
    await submission.save();
    
    // Create a BCR record linked to this submission
    const bcr = await bcrService.createBcr(submission._id, {
      currentPhase: 'Initial Assessment',
      status: 'Submitted'
    });
    
    // Create an audit log entry
    const auditLog = new AuditLog({
      action: 'CREATE_BCR',
      userId: req.user._id,
      resourceType: 'BCR',
      resourceId: bcr.id,
      details: {
        submissionId: submission._id,
        submissionCode,
        bcrCode: bcr.bcrCode,
        timestamp: now.toISOString()
      },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: now
    });
    
    await auditLog.save();
    
    // Redirect to confirmation page
    res.redirect(`/bcr-submission/confirm?id=${submission._id}`);
  } catch (error) {
    console.error('Error in createSubmission:', error);
    
    // Get form data for re-rendering
    const impactAreasData = await ImpactedArea.find({}).sort({ order: 1 });
    const urgencyLevelsData = await bcrConfigService.getConfigsByType('urgencyLevel');
    const submissionSources = ['Internal', 'External', 'Partner', 'Other'];
    const attachmentsOptions = ['Yes', 'No'];
    
    return res.status(500).render('bcr-submission/new', {
      title: 'New BCR Submission',
      error: true,
      systemError: error.message,
      formData: req.body,
      impactAreas: impactAreasData.map(ia => ({
        id: ia._id,
        name: ia.name,
        value: ia.value,
        order: ia.order
      })),
      urgencyLevels: urgencyLevelsData.map(ul => ({
        id: ul._id,
        name: ul.name,
        value: ul.value,
        order: ul.displayOrder
      })),
      submissionSources,
      attachmentsOptions,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  }
}

/**
 * Process a BCR submission review
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function reviewSubmission(req, res) {
  try {
    const bcrId = req.params.id;
    const { reviewStatus, reviewNotes, assignedTo } = req.body;
    
    if (!isValidBcrId(bcrId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        user: req.user
      });
    }
    
    // Update the BCR with review information
    const updatedBcr = await bcrService.updateBcr(bcrId, {
      status: reviewStatus,
      notes: reviewNotes,
      userId: req.user._id
    });
    
    // Add a workflow activity
    await bcrService.addWorkflowActivity(bcrId, {
      phase: updatedBcr.currentPhase,
      status: reviewStatus,
      action: 'Review',
      performedById: req.user._id,
      notes: reviewNotes,
      updateBcr: false // Already updated above
    });
    
    // Redirect to the BCR view page
    req.flash('success', 'BCR review submitted successfully');
    res.redirect(`/bcr/bcr/${bcrId}`);
  } catch (error) {
    console.error('Error in reviewSubmission:', error);
    req.flash('error', `Failed to submit review: ${error.message}`);
    res.redirect(`/bcr/bcr/${req.params.id}`);
  }
}

module.exports = {
  listSubmissions,
  viewSubmission,
  phaseUpdateConfirmation,
  testEndpoint,
  newSubmission,
  createSubmission,
  reviewSubmission
};
