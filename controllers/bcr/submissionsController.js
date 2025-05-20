/**
 * BCR Submissions Controller
 * Handles BCR submissions listing, viewing, and filtering
 */
const { PrismaClient } = require('@prisma/client');
const { validate: isUuid } = require('uuid');
const prisma = new PrismaClient();
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');
const trelloService = require('../../services/trelloService');
const pdfService = require('../../services/pdfService');
const slaService = require('../../services/slaService');
const path = require('path');

/**
 * Helper to validate if a string is a UUID or BCR number
 * @param {string} id
 * @returns {boolean}
 */
function isValidBcrId(id) {
  if (!id) return false;
  const isBcrNumber = /^BCR-\d{4}-\d{4}$/.test(id);
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
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
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
    
    // Create a mapping of phase IDs to their in-progress status
    const phaseToStatusMap = {};
    
    // Log phase and status data for debugging
    console.log(`Processing ${phases.length} phases and ${allStatuses.length} statuses`);
    
    // First, log the first few phases and statuses for debugging
    if (phases.length > 0) {
      console.log('Sample phase:', {
        id: phases[0].id,
        name: phases[0].name,
        value: phases[0].value,
        type: phases[0].type
      });
    }
    
    if (allStatuses.length > 0) {
      console.log('Sample status:', {
        id: allStatuses[0].id,
        name: allStatuses[0].name,
        value: allStatuses[0].value,
        type: allStatuses[0].type
      });
    }
    
    // Initialize the mapping with null for each phase value
    phases.forEach(phase => {
      phaseToStatusMap[phase.value] = null;
    });
    
    // Populate the mapping with statuses
    for (const phase of phases) {
      // Find in-progress status for this phase (not starting with 'completed:')
      const inProgressStatuses = allStatuses.filter(status => 
        status.value === phase.value && !status.name.startsWith('completed:')
      );
      
      if (inProgressStatuses.length > 0) {
        // Use the first in-progress status found
        phaseToStatusMap[phase.value] = inProgressStatuses[0].name;
        console.log(`Mapped phase ${phase.name} (${phase.value}) to status ${inProgressStatuses[0].name}`);
      } else {
        console.log(`No in-progress status found for phase ${phase.name} (${phase.value})`);
      }
    }
    
    // Get only the In Progress statuses for each phase (non-completed statuses)
    const inProgressStatuses = allStatuses.filter(status => {
      return !status.name.startsWith('completed:');
    });
    
    // Update each submission to show the In Progress Status instead of the enum status
    submissions.forEach(submission => {
      // Parse the notes field to extract the current phase
      if (submission.notes) {
        const phaseMatch = submission.notes.match(/Current Phase: ([^\n]+)/i);
        const phaseStatusMatch = submission.notes.match(/Phase Status: ([^\n]+)/i);
        
        if (phaseStatusMatch && phaseStatusMatch[1]) {
          // Use the phase status from the notes field
          submission.displayStatus = phaseStatusMatch[1];
          console.log(`Set displayStatus from phase status: ${submission.displayStatus}`);
        } else if (phaseMatch && phaseMatch[1]) {
          // Find the phase by name
          const matchingPhase = phases.find(p => p.name === phaseMatch[1]);
          if (matchingPhase) {
            // Use phase.value instead of phase.id for the mapping
            if (phaseToStatusMap[matchingPhase.value]) {
              submission.displayStatus = phaseToStatusMap[matchingPhase.value];
              console.log(`Set displayStatus from matching phase: ${submission.displayStatus}`);
            } else {
              console.log(`No status mapping found for phase: ${matchingPhase.name} (${matchingPhase.value})`);
              // Fall back to using the phase name as the display status
              submission.displayStatus = `${matchingPhase.name} Phase`;
              console.log(`Set fallback displayStatus to: ${submission.displayStatus}`);
            }
          } else {
            console.log(`No matching phase found for: ${phaseMatch[1]}`);
          }
        }
      }
      
      // If we still don't have a display status, use the enum status with proper formatting
      if (!submission.displayStatus) {
        // Convert the enum status (e.g., 'under_review') to a more readable format (e.g., 'Under Review')
        const formattedStatus = submission.status
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        submission.displayStatus = formattedStatus;
        console.log(`Set displayStatus to formatted enum status: ${submission.displayStatus}`);
      }
      
      // If we couldn't extract a status, use a default based on the enum status
      if (!submission.displayStatus) {
        // Map the enum status to a more user-friendly display status
        switch (submission.status) {
          case 'draft':
            submission.displayStatus = 'Being Submitted';
            break;
          case 'new_submission':
            submission.displayStatus = 'New Submission';
            break;
          case 'submitted':
            submission.displayStatus = 'Submission Received';
            break;
          case 'under_review':
            submission.displayStatus = 'Under Review';
            break;
          case 'approved':
            submission.displayStatus = 'Approved';
            break;
          case 'implemented':
            submission.displayStatus = 'Implemented';
            break;
          case 'rejected':
            submission.displayStatus = 'Rejected';
            break;
          default:
            submission.displayStatus = submission.status;
        }
      }
    });
    
    // Get current academic year (e.g., '25/26' for 2025-2026)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Academic year starts in September, so if we're before September, use previous year
    const academicYearStart = currentMonth >= 9 ? currentYear : currentYear - 1;
    const academicYearEnd = academicYearStart + 1;
    
    // Format as YY/YY (e.g., 25/26)
    const academicYear = `${(academicYearStart % 100).toString().padStart(2, '0')}/${(academicYearEnd % 100).toString().padStart(2, '0')}`;
    const submitters = [...new Set(
      submissions
        .filter(s => s.Users_Bcrs_requestedByToUsers)
        .map(s => s.Users_Bcrs_requestedByToUsers.name)
    )].sort();

    res.render('modules/bcr/submissions.njk', {
      title: 'BCR Submissions',
      submissions,
      filters: {
        statuses: inProgressStatuses.map(s => s.name),
        impactAreas: impactAreas.map(ia => ia.name),
        submitters
      },
      selectedFilters: {
        status, impactArea, submitter, startDate, endDate
      },
      academicYear,
      user: req.user
    });
  } catch (error) {
    console.error('Error in listSubmissions:', error);
    console.error('Error stack:', error.stack);
    
    // Check if this is a database connection error
    if (error.code === 'P1001' || error.code === 'P1002') {
      console.error('Database connection error detected');
    }
    
    // Check if this is a schema error
    if (error.code === 'P2001' || error.code === 'P2002') {
      console.error('Schema error detected');
    }
    
    renderError(res, {
      status: 500,
      title: 'Error',
      message: `Failed to list BCR submissions: ${error.message}`,
      error,
      user: req.user
    });
  }
}

/**
 * View a single BCR submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * View a single BCR submission
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function viewSubmission(req, res) {
  console.log('Starting viewSubmission for ID:', req.params.id);
  try {
    const bcrId = req.params.id;
    const isPrintMode = req.query.print === 'true';
    
    if (!isValidBcrId(bcrId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        error: { details: `Expected a UUID or BCR number, got: ${bcrId}` },
        user: req.user
      });
    }

    // Try to get the BCR using the service
    let bcr = null;
    try {
      bcr = await bcrService.getBcrById(bcrId);
    } catch (serviceError) {
      console.error('Error from bcrService.getBcrById:', serviceError);
      // fallback to raw query below
    }

    // If still not found, try raw query
    if (!bcr) {
      try {
        console.log(`BCR not found via service, trying raw query for ID: ${bcrId}`);
        const rawResults = await prisma.$queryRaw`SELECT id FROM bcrs WHERE bcrNumber = ${bcrId} OR id = ${bcrId}`;
        if (rawResults && rawResults.length > 0) {
          bcr = await prisma.Bcrs.findUnique({
            where: { id: rawResults[0].id },
            include: {
              Users_Bcrs_requestedByToUsers: true,
              Users_Bcrs_assignedToToUsers: true
            }
          });
        }
      } catch (queryError) {
        console.error('Error in raw query:', queryError);
      }
    }

    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }

    // Ensure the BCR has the expected structure for the template
    if (!bcr.history) bcr.history = [];
    if (!bcr.workflowHistory) bcr.workflowHistory = [];
    
    // Ensure other required properties exist to prevent template errors
    if (!bcr.bcrNumber) bcr.bcrNumber = bcr.id.substring(0, 8);
    if (!bcr.title) bcr.title = 'Untitled BCR';
    if (!bcr.status) bcr.status = 'unknown';
    
    // Get all the data needed for the template
    const [statuses, users, phases, prioritisations, phaseStatusMappings] = await Promise.all([
      bcrConfigService.getConfigsByType('status'),
      prisma.users.findMany({ orderBy: { name: 'asc' } }),
      bcrConfigService.getConfigsByType('phase'),
      [], // Placeholder for prioritisations if you have them
      bcrConfigService.getPhaseStatusMappings() // Get phase-status mappings
    ]);

    // Get SLA status for the BCR
    const slaStatus = await slaService.getSlaStatus(bcr.id);

    // Handle PDF generation if requested
    if (req.query.generatePdf === 'true' && !isPrintMode) {
      try {
        // Generate a base URL for the PDF generation
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;
        
        // Generate the PDF
        const pdfPath = await pdfService.generateBcrReport(bcr, baseUrl);
        
        // Get the relative path for download
        const relativePath = path.relative(path.join(__dirname, '../../public'), pdfPath);
        const downloadUrl = `/reports/${path.basename(pdfPath)}`;
        
        // Redirect to the BCR view with a success message
        req.flash('success', 'PDF report generated successfully');
        return res.redirect(`/bcr/${bcr.id}?pdfUrl=${encodeURIComponent(downloadUrl)}`);
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        req.flash('error', 'Failed to generate PDF report');
        return res.redirect(`/bcr/${bcr.id}`);
      }
    }

    // Log the data being sent to the template
    console.log('BCR data to render:', {
      id: bcr.id,
      title: bcr.title || 'Untitled',
      status: bcr.status,
      hasHistory: Array.isArray(bcr.history),
      historyLength: Array.isArray(bcr.history) ? bcr.history.length : 'N/A',
      hasWorkflowHistory: Array.isArray(bcr.workflowHistory),
      workflowHistoryLength: Array.isArray(bcr.workflowHistory) ? bcr.workflowHistory.length : 'N/A',
      currentPhaseId: bcr.currentPhaseId,
      phasesCount: phases.length,
      statusesCount: statuses.length,
      hasSlaStatus: !!slaStatus
    });
    
    // Enhance BCR object with current phase information
    const currentPhase = phases.find(phase => phase.value === bcr.currentPhaseId);
    if (currentPhase) {
      bcr.currentPhaseName = currentPhase.name;
    } else {
      // Set a default phase name if no matching phase is found
      bcr.currentPhaseName = 'Unknown Phase';
      console.warn(`No matching phase found for currentPhaseId: ${bcr.currentPhaseId}`);
    }
    
    // Ensure all required properties exist for the template
    bcr.Users_Bcrs_requestedByToUsers = bcr.Users_Bcrs_requestedByToUsers || { name: 'Unknown', email: '', role: '' };
    bcr.Users_Bcrs_assignedToToUsers = bcr.Users_Bcrs_assignedToToUsers || { name: 'Unassigned', email: '', role: '' };
    
    // Get the status display name based on the database status value
    let statusDisplay = bcr.status;
    if (bcr.status) {
      // Convert snake_case to Title Case for display
      statusDisplay = bcr.status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    bcr.statusDisplay = statusDisplay;
    
    // Render the template with data
    res.render('modules/bcr/submission-details.njk', {
      title: `BCR ${bcr.bcrNumber} - ${bcr.title}`,
      submission: bcr,
      phases,
      prioritisations,
      statuses,
      phaseStatusMappings,
      slaStatus,
      isPrintMode,
      pdfUrl: req.query.pdfUrl,
      user: req.user
    });
  } catch (error) {
    console.error('Unhandled error in viewSubmission controller:', error);
    // Improved error logging and user feedback
    let errorMessage = 'Failed to load BCR submission';
    if (error && error.message) {
      errorMessage += ': ' + error.message;
    }
    renderError(res, {
      status: 500,
      title: 'Error',
      message: errorMessage,
      error,
      user: req.user
    });
  }
}

/**
 * Show the phase update confirmation page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * Show the phase update confirmation page
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function phaseUpdateConfirmation(req, res) {
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
    const bcr = await bcrService.getBcrById(bcrId);
    if (!bcr) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }
    res.render('modules/bcr/phase-update-confirmation.njk', {
      title: 'Phase Update Confirmation',
      bcr,
      user: req.user
    });
  } catch (error) {
    console.error('Error in phase update confirmation:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: 'Failed to load phase update confirmation',
      error,
      user: req.user
    });
  }
}

// Export as named exports for clarity and testability
/**
 * Simple test endpoint to verify controller and database connection
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function testEndpoint(req, res) {
  console.log('Test endpoint reached');
  try {
    // Test basic database connection
    const statusCount = await prisma.bcrConfigs.count({
      where: { type: 'status' }
    });
    
    // Return a simple JSON response
    res.json({
      success: true,
      message: 'Test endpoint working',
      statusCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({
      success: false,
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
    // Get impact areas from the new ImpactedArea model
    const impactAreas = await prisma.impactedArea.findMany({
      orderBy: { order: 'asc' }
    });
    
    // Get urgency levels and other config data needed for the form
    const urgencyLevels = await bcrConfigService.getConfigsByType('urgencyLevel');
    const submissionSources = ['Internal', 'External', 'Partner', 'Other'];
    const attachmentsOptions = ['Yes', 'No'];
    
    // Render the new submission form
    res.render('bcr-submission/new', {
      title: 'New BCR Submission',
      impactAreas,
      urgencyLevels,
      submissionSources,
      attachmentsOptions,
      user: req.user,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error in newSubmission:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: 'Failed to load submission form',
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
      submissionSource,
      organisation,
      briefDescription,
      justification,
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
    const requiredFields = ['fullName', 'emailAddress', 'submissionSource', 'briefDescription', 
                          'justification', 'urgencyLevel', 'declaration'];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    // Check if impactAreas is provided (it's an array)
    if (!impactAreas || (Array.isArray(impactAreas) && impactAreas.length === 0)) {
      missingFields.push('impactAreas');
    }
    
    // Special validation for organisation when submissionSource is 'Other'
    if (submissionSource === 'Other' && !organisation) {
      missingFields.push('organisation');
    }
    
    // If any required fields are missing, return to form with errors
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      
      // Get form data for re-rendering
      const impactAreasData = await prisma.impactedArea.findMany({
        orderBy: { order: 'asc' }
      });
      const urgencyLevelsData = await bcrConfigService.getConfigsByType('urgencyLevel');
      const submissionSources = ['Internal', 'External', 'Partner', 'Other'];
      const attachmentsOptions = ['Yes', 'No'];
      
      return res.status(400).render('bcr-submission/new', {
        title: 'New BCR Submission',
        error: true,
        formData: req.body,
        missingFields,
        impactAreas: impactAreasData,
        urgencyLevels: urgencyLevelsData,
        submissionSources,
        attachmentsOptions,
        user: req.user,
        csrfToken: req.csrfToken()
      });
    }
    
    // Generate a unique submission code
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const nextYear = (parseInt(currentYear) + 1).toString().padStart(2, '0');
    const yearCode = `${currentYear}/${nextYear}`;
    
    // Count existing submissions to determine the next number
    const submissionCount = await prisma.submission.count();
    const submissionNumber = (submissionCount + 1).toString().padStart(3, '0');
    const submissionCode = `SUB-${yearCode}-${submissionNumber}`;
    
    // Create the submission in the database
    const now = new Date();
    const submission = await prisma.submission.create({
      data: {
        submissionCode,
        fullName,
        emailAddress,
        submissionSource,
        organisation: organisation || null,
        briefDescription,
        justification,
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
        submittedById: req.user.id
      }
    });
    
    // Create a BCR record linked to this submission
    const bcrCode = `BCR-${yearCode}-${submissionNumber}`;
    const bcr = await prisma.bcr.create({
      data: {
        bcrCode,
        submissionId: submission.id,
        currentPhase: 'Initial Assessment',
        status: 'Submitted',
        urgencyLevel,
        impactedAreas: Array.isArray(impactAreas) ? impactAreas : [impactAreas],
        workflowHistory: JSON.stringify([{
          phase: 'Submission',
          status: 'Submitted',
          timestamp: now.toISOString(),
          userId: req.user.id,
          userName: req.user.name || 'System'
        }]),
        createdAt: now,
        updatedAt: now
      }
    });
    
    // Update the submission with the BCR ID
    await prisma.submission.update({
      where: { id: submission.id },
      data: { bcrId: bcr.id }
    });
    
    // Create an audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_BCR',
        userId: req.user.id,
        resourceType: 'BCR',
        resourceId: bcr.id,
        details: JSON.stringify({
          submissionId: submission.id,
          submissionCode,
          bcrCode,
          timestamp: now.toISOString()
        }),
        ipAddress: req.ip || '127.0.0.1'
      }
    });
    
    // Redirect to confirmation page
    res.redirect(`/bcr-submission/confirm?id=${submission.id}`);
  } catch (error) {
    console.error('Error in createSubmission:', error);
    
    // Get form data for re-rendering
    const impactAreasData = await prisma.impactedArea.findMany({
      orderBy: { order: 'asc' }
    });
    const urgencyLevelsData = await bcrConfigService.getConfigsByType('urgencyLevel');
    const submissionSources = ['Internal', 'External', 'Partner', 'Other'];
    const attachmentsOptions = ['Yes', 'No'];
    
    return res.status(500).render('bcr-submission/new', {
      title: 'New BCR Submission',
      error: true,
      systemError: error.message,
      formData: req.body,
      impactAreas: impactAreasData,
      urgencyLevels: urgencyLevelsData,
      submissionSources,
      attachmentsOptions,
      user: req.user,
      csrfToken: req.csrfToken()
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
      assignedTo,
      notes: reviewNotes ? `${reviewNotes}\n\nReviewed by: ${req.user.name} on ${new Date().toISOString()}` : undefined,
      reviewedBy: req.user.id,
      reviewedAt: new Date()
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
