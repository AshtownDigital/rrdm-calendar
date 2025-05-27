/**
 * BCR Module Controller
 * Consolidated controller for BCR functionality
 */

const mongoose = require('mongoose');
const counterService = require('../../../services/modules/bcr/counterService');
const workflowService = require('../../../services/modules/bcr/workflowService');
const bcrModel = require('../../../models/modules/bcr/model');

/**
 * Render BCR dashboard with counters and phases
 */
exports.dashboard = async (req, res) => {
  try {
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    
    // Use Promise.allSettled to handle partial failures
    const [impactAreasResult, urgencyLevelsResult, countersResult, recentBcrsResult] = 
      await Promise.allSettled([
        // Only attempt to fetch data if database is connected
        isDbConnected ? bcrModel.getAllImpactAreas() : Promise.resolve([]),
        isDbConnected ? bcrModel.getAllUrgencyLevels() : Promise.resolve([]),
        isDbConnected ? counterService.getCounters() : Promise.resolve({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          phases: {}
        }),
        // Wrap this in a try/catch with timeout to prevent hanging
        (async () => {
          if (!isDbConnected) {
            return []; // Skip database query if not connected
          }
          
          try {
            // Set a timeout for this operation
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Timeout fetching recent BCRs')), 5000);
            });
            
            // Race the query against the timeout
            return await Promise.race([
              bcrModel.getAllSubmissions({ status: 'Approved', limit: 5, hasBcrNumber: true }),
              timeoutPromise
            ]);
          } catch (error) {
            console.error('Error fetching recent BCRs:', error);
            return []; // Return empty array on error
          }
        })()
      ]);
    
    // Extract results or use defaults
    const impactAreas = impactAreasResult.status === 'fulfilled' ? impactAreasResult.value : [];
    const urgencyLevels = urgencyLevelsResult.status === 'fulfilled' ? urgencyLevelsResult.value : [];
    const counters = countersResult.status === 'fulfilled' ? countersResult.value : {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      phases: {}
    };
    const recentBcrs = recentBcrsResult.status === 'fulfilled' ? recentBcrsResult.value : [];
    
    // Format stats for the dashboard
    const stats = {
      total: counters.total || 0,
      pending: counters.pending || 0,
      approved: counters.approved || 0,
      rejected: counters.rejected || 0,
      implemented: (counters.phases && counters.phases['Implementation']) || 0 // Get implementation phase count
    };
    
    // Format recent BCRs
    const formattedRecentBcrs = recentBcrs.map(submission => {
      // Get workflow status tag based on phase and status
      let statusClass = 'govuk-tag';
      let statusText = 'New Submission';
      
      // If this is a BCR with a workflow status, use that instead
      if (submission.bcrId) {
        // Use the BCR's status if available
        if (submission.bcrId.status) {
          statusText = submission.bcrId.status;
          
          // If we have phase information, include it in the status text
          if (submission.bcrId.currentPhaseId && submission.bcrId.currentPhaseId.name) {
            const phaseName = submission.bcrId.currentPhaseId.name;
            statusText = `${phaseName}: ${statusText}`;
          }
          
          // Assign appropriate class based on status
          if (submission.bcrId.currentStatusId && submission.bcrId.currentStatusId.color) {
            // Use the color from the status if available
            statusClass = `govuk-tag govuk-tag--${submission.bcrId.currentStatusId.color}`;
          } else {
            // Fallback to default color mapping
            switch (submission.bcrId.status) {
              case 'New Submission':
                statusClass = 'govuk-tag govuk-tag--blue';
                break;
              case 'In Review':
                statusClass = 'govuk-tag govuk-tag--purple';
                break;
              case 'Implementation Started':
                statusClass = 'govuk-tag govuk-tag--orange';
                break;
              case 'Implementation Complete':
                statusClass = 'govuk-tag govuk-tag--turquoise';
                break;
              case 'Deployed to Production':
                statusClass = 'govuk-tag govuk-tag--green';
                break;
              case 'Closed':
                statusClass = 'govuk-tag govuk-tag--grey';
                break;
              default:
                statusClass = 'govuk-tag';
            }
          }
        }
      } else {
        // If no BCR ID, use the submission status
        const statusTag = getSubmissionStatusTag(submission);
        statusClass = statusTag.class;
        statusText = statusTag.text;
      }
      
      return {
        id: submission._id || submission.id,
        bcrNumber: submission.bcrNumber || submission.submissionCode || 'N/A',
        submissionCode: submission.submissionCode || 'N/A',
        description: submission.briefDescription || submission.title || 'Untitled',
        status: statusText,
        statusClass: statusClass,
        statusText: statusText,
        createdAt: submission.createdAt ? new Date(submission.createdAt).toLocaleDateString('en-GB') : 'Unknown'
      };
    });
    
    // Render the dashboard with actual data
    res.render('modules/bcr/dashboard', {
      title: 'BCR Dashboard',
      stats: stats,
      phases: counters.phases || {},
      impactAreas: impactAreas,
      urgencyLevels: urgencyLevels,
      bcrsByUrgency: {}, // This would need additional queries to populate
      recentBcrs: formattedRecentBcrs,
      connectionIssue: !isDbConnected, // Pass connection state to the template
      user: req.user
    });
  } catch (error) {
    console.error('Error in dashboard controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render BCR workflow view
 */
exports.showWorkflow = async (req, res) => {
  try {
    const phases = await workflowService.getAllPhases();
    const statuses = await workflowService.getAllStatuses();
    
    res.render('modules/bcr/workflow', {
      title: 'BCR Workflow',
      phases,
      statuses,
      user: req.user
    });
  } catch (error) {
    console.error('Error in workflow controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the workflow view',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render the new BCR submission form
 */
exports.newSubmissionForm = async (req, res) => {
  try {
    // Get impact areas and urgency levels for the form
    const impactAreas = await bcrModel.getAllImpactAreas();
    const urgencyLevels = await bcrModel.getAllUrgencyLevels();
    
    console.log('Impact areas for form:', impactAreas);
    console.log('Urgency levels from database:', JSON.stringify(urgencyLevels, null, 2));
    
    // Map impact areas to the format expected by the form
    const mappedImpactAreas = impactAreas.map(area => {
      // Use the name from the database, or extract it from the description if not available
      let areaName = area.name;
      if (!areaName) {
        // If we have a description that matches one of our known areas, use that name
        const descriptions = {
          'Changes to databases, schema design, internal data handling, or system logic.': 'Backend',
          'Updates to UI components, form elements, filters, labels, or layout.': 'Frontend',
          'Creation, modification, or removal of API endpoints or request/response formats.': 'API',
          'Changes to data import/export templates, field order, column definitions.': 'CSV',
          'Additions, updates, or removals of reference data values (e.g., dropdown options).': 'Reference Data',
          'Updates to internal guidance, user manuals, technical specs, or public-facing help.': 'Documentation & Guidance',
          'Changes required due to external policy or legal/regulatory compliance updates.': 'Policy',
          'Modifications impacting funding calculations, eligibility, or reporting models.': 'Funding'
        };
        areaName = descriptions[area.value] || 'Unknown Area';
      }
      
      return {
        id: area._id,
        name: areaName,
        description: area.value || ''
      };
    });
    
    // Map urgency levels to the format expected by the form
    const mappedUrgencyLevels = urgencyLevels.map(level => {
      // Use the color directly from the model
      const name = level.name || '';
      const description = level.description || '';
      const color = level.color || 'grey';
      
      console.log(`Processing urgency level: ${name}, color: ${color}, description: ${description}`);
      
      return {
        name: name,
        value: name,
        description: description,
        color: color
      };
    });
    
    console.log('Mapped urgency levels:', JSON.stringify(mappedUrgencyLevels, null, 2));
    
    // Define submission source options
    const submissionSources = ['Internal', 'External', 'Other'];
    
    // Define attachments options
    const attachmentsOptions = ['Yes', 'No'];
    
    res.render('bcr-submission/new', {
      title: 'New BCR Submission',
      impactAreas: mappedImpactAreas,
      urgencyLevels: mappedUrgencyLevels,
      submissionSources: submissionSources,
      attachmentsOptions: attachmentsOptions,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in new submission form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submission form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Create a new BCR submission
 */
exports.createSubmission = async (req, res) => {
  try {
    // Initialize errors object
    const errors = {};
    
    // Add detailed logging for debugging
    console.log('============= BCR SUBMISSION START =============');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);

    // Special handling for impactAreas before validation
    if (Array.isArray(req.body.impactAreas)) {
      // Filter out empty values from the array
      req.body.impactAreas = req.body.impactAreas.filter(area => area !== '');
      console.log('Filtered impactAreas array:', req.body.impactAreas);
    }

    // Required fields validation
    const requiredFields = [
      { field: 'fullName', message: 'Enter your full name' },
      { field: 'emailAddress', message: 'Enter your email address' },
      { field: 'submissionSource', message: 'Select a submission source' },
      { field: 'briefDescription', message: 'Enter a brief description' },
      { field: 'justification', message: 'Enter a justification' },
      { field: 'urgencyLevel', message: 'Select an urgency level' },
      { field: 'impactAreas', message: 'Select at least one impacted area' },
      { field: 'attachments', message: 'Select whether you will be providing attachments' },
      { field: 'declaration', message: 'You must confirm that the information is accurate' }
    ];

    // Check each required field
    requiredFields.forEach(({ field, message }) => {
      if (field === 'impactAreas') {
        // Special validation for impactAreas
        if (!req.body.impactAreas || (Array.isArray(req.body.impactAreas) && req.body.impactAreas.length === 0)) {
          errors[field] = message;
          console.log('Validation failed for impactAreas');
        }
      } else if (!req.body[field]) {
        errors[field] = message;
      }
    });

    // Email format validation
    if (req.body.emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.emailAddress)) {
      errors.emailAddress = 'Enter a valid email address';
    }

    // Validate that otherUrgencyDescription is provided when 'Other' is selected
    if (req.body.urgencyLevel === 'Other' && !req.body.otherUrgencyDescription) {
      errors.otherUrgencyDescription = 'Please specify the urgency level when selecting "Other"';
    }

    // Validate that organisation is provided when submission source is 'Other'
    if (req.body.submissionSource === 'Other' && !req.body.organisation) {
      errors.organisation = 'Please specify the organisation when selecting "Other" as submission source';
    }

    // Get data needed for rendering the form
    const impactAreas = await bcrModel.getAllImpactAreas();
    const urgencyLevels = await bcrModel.getAllUrgencyLevels();
    const submissionSources = ['Internal', 'External', 'Other'];
    const attachmentsOptions = ['Yes', 'No'];

    // Map impact areas to the format expected by the form
    const mappedImpactAreas = impactAreas.map(area => {
      // Use the name from the database, or extract it from the description if not available
      let areaName = area.name;
      if (!areaName) {
        // If we have a description that matches one of our known areas, use that name
        const descriptions = {
          'Changes to databases, schema design, internal data handling, or system logic.': 'Backend',
          'Updates to UI components, form elements, filters, labels, or layout.': 'Frontend',
          'Creation, modification, or removal of API endpoints or request/response formats.': 'API',
          'Changes to data import/export templates, field order, column definitions.': 'CSV',
          'Additions, updates, or removals of reference data values (e.g., dropdown options).': 'Reference Data',
          'Updates to internal guidance, user manuals, technical specs, or public-facing help.': 'Documentation & Guidance',
          'Changes required due to external policy or legal/regulatory compliance updates.': 'Policy',
          'Modifications impacting funding calculations, eligibility, or reporting models.': 'Funding'
        };
        areaName = descriptions[area.value] || 'Unknown Area';
      }

      return {
        id: area._id,
        name: areaName,
        description: area.value || ''
      };
    });

    // Map urgency levels to the format expected by the form
    const mappedUrgencyLevels = urgencyLevels.map(level => {
      const name = level.name || '';
      const description = level.description || '';
      const color = level.color || 'grey';

      return {
        name: name,
        value: name,
        description: description,
        color: color
      };
    });

    // If there are validation errors, re-render the form
    if (Object.keys(errors).length > 0) {
      console.log('Validation errors found:', errors);
      return res.status(400).render('bcr-submission/new', {
        title: 'New BCR Submission',
        impactAreas: mappedImpactAreas,
        urgencyLevels: mappedUrgencyLevels,
        submissionSources: submissionSources,
        attachmentsOptions: attachmentsOptions,
        formData: req.body,
        errors: errors,
        errorSummary: 'There is a problem with your submission',
        csrfToken: req.csrfToken ? req.csrfToken() : '',
        user: req.user
      });
    }

    // Process form data for submission
    // Create a clean copy of the form data, excluding the CSRF token
    let submissionData = {};
    
    // Copy all fields except _csrf
    Object.keys(req.body).forEach(key => {
      if (key !== '_csrf') {
        submissionData[key] = req.body[key];
      }
    });
    
    // Convert declaration checkbox value to boolean
    if (submissionData.declaration === 'true') {
      submissionData.declaration = true;
    }
    
    // Log the cleaned submission data
    console.log('Cleaned submission data:', JSON.stringify(submissionData, null, 2));
    
    // The Submission model will handle the conversion of impactAreas to proper format
    // and the submittedById field is optional, so we don't need to set it for unauthenticated users

    console.log('Final submission data:', JSON.stringify(submissionData, null, 2));

    // Create the submission
    const submission = await bcrModel.createSubmission(submissionData);
    console.log('Submission created successfully:', submission._id);

    // Render the confirmation page
    return res.render('bcr-submission/confirmation', {
      title: 'Submission Confirmation',
      submissionCode: submission.submissionCode,
      submissionId: submission._id,
      submissionLink: `${req.protocol}://${req.get('host')}/bcr/submissions/${submission._id}`,
      user: req.user
    });
  } catch (error) {
    console.error('============= BCR SUBMISSION ERROR =============');
    console.error('Error in create submission controller:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));

    try {
      // Get data needed for rendering the form
      const impactAreas = await bcrModel.getAllImpactAreas();
      const urgencyLevels = await bcrModel.getAllUrgencyLevels();
      const submissionSources = ['Internal', 'External', 'Other'];
      const attachmentsOptions = ['Yes', 'No'];
      
      // Map impact areas to the format expected by the form
      const mappedImpactAreas = impactAreas.map(area => {
        let areaName = area.name || '';
        return {
          id: area._id,
          name: areaName,
          description: area.value || ''
        };
      });
      
      // Map urgency levels to the format expected by the form
      const mappedUrgencyLevels = urgencyLevels.map(level => {
        return {
          name: level.name || '',
          value: level.name || '',
          description: level.description || '',
          color: level.color || 'grey'
        };
      });
      
      // Render the form with an error message
      return res.status(500).render('bcr-submission/new', {
        title: 'New BCR Submission',
        impactAreas: mappedImpactAreas,
        urgencyLevels: mappedUrgencyLevels,
        submissionSources: submissionSources,
        attachmentsOptions: attachmentsOptions,
        formData: req.body,
        errors: { general: 'An error occurred while processing your submission. Please try again.' },
        errorSummary: 'Failed to create submission',
        csrfToken: req.csrfToken ? req.csrfToken() : '',
        user: req.user
      });
    } catch (renderError) {
      // If we can't even render the form with an error, send a basic error response
      console.error('Error rendering error page:', renderError);
      return res.status(500).send('An error occurred while processing your submission. Please try again later.');
    }
  }
};

/**
 * List all submissions (not yet approved as BCRs)
 */
exports.listSubmissions = async (req, res) => {
  try {
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let submissions = [];
    
    if (isDbConnected) {
      try {
        // Set a timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching submissions'));
          }, 8000);
        });
        
        // Modify query to exclude approved submissions with BCR numbers
        const submissionsQuery = { ...req.query };
        if (!submissionsQuery.includeApproved) {
          submissionsQuery.excludeApproved = true;
        }
        
        // Race the query against the timeout
        submissions = await Promise.race([
          bcrModel.getAllSubmissions(submissionsQuery),
          timeoutPromise
        ]);
      } catch (queryError) {
        console.error('Error fetching submissions:', queryError);
        // Don't rethrow, just continue with empty submissions
        submissions = [];
      }
    }
    
    // If we got no submissions, ensure we have an empty array
    const submissionsToDisplay = Array.isArray(submissions) ? submissions : [];
    
    // Format submissions for display
    const formattedSubmissions = submissionsToDisplay.map(submission => {
      // Get status tag for display
      const statusTag = getSubmissionStatusTag(submission);
      
      // Extract phase information if available
      let currentPhase = 'N/A';
      let workflowStatus = statusTag.text;
      let workflowStatusClass = statusTag.class;
      
      if (submission.bcrId && submission.bcrId.currentPhaseId) {
        // If we have a BCR with phase info, use that
        currentPhase = submission.bcrId.currentPhaseId.name || 'Phase 1';
        
        // If we have status info from the BCR, use that
        if (submission.bcrId.status) {
          workflowStatus = submission.bcrId.status;
        }
        
        // If we have a status class from the BCR, use that
        if (submission.bcrId.currentStatusId && submission.bcrId.currentStatusId.color) {
          workflowStatusClass = `govuk-tag govuk-tag--${submission.bcrId.currentStatusId.color}`;
        }
      } else if (submission.status === 'Approved' && submission.bcrNumber) {
        // Default for approved submissions with BCR numbers but no phase info
        currentPhase = 'Phase 1: Complete and Submit BCR form';
        workflowStatus = 'New Submission';
        workflowStatusClass = 'govuk-tag'; // Default tag style for Phase 1
      }
      
      return {
        id: submission._id || submission.id,
        submissionCode: submission.submissionCode || 'N/A',
        bcrNumber: submission.bcrNumber || 'N/A',
        currentPhase: currentPhase,
        briefDescription: submission.briefDescription || 'No description provided',
        fullName: submission.fullName || 'Unknown',
        emailAddress: submission.emailAddress || 'No email provided',
        submissionSource: submission.submissionSource || 'Unknown',
        organisation: submission.organisation || 'Not specified',
        urgencyLevel: submission.urgencyLevel || 'Not specified',
        impactAreas: Array.isArray(submission.impactAreas) ? submission.impactAreas.join(', ') : 'None',
        displayStatus: workflowStatus,
        statusClass: workflowStatusClass,
        createdAt: submission.createdAt ? 
          new Date(submission.createdAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Unknown',
        updatedAt: submission.updatedAt ? 
          new Date(submission.updatedAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Unknown',
        reviewedAt: submission.reviewedAt ? 
          new Date(submission.reviewedAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Not reviewed'
      };
    });
    
    res.render('modules/bcr/submissions/index', {
      title: 'Submissions',
      submissions: formattedSubmissions,
      filters: req.query,
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      user: req.user
    });
  } catch (error) {
    console.error('Error in list submissions controller:', error);
    // Instead of showing an error page, render the submissions page with a warning
    res.render('modules/bcr/submissions/index', {
      title: 'Submissions',
      submissions: [],
      filters: req.query,
      connectionIssue: true,
      timedOut: true,
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while loading submissions',
      user: req.user
    });
  }
};

/**
 * List all approved Business Change Requests (post-approval)
 */
exports.listApprovedBcrs = async (req, res) => {
  try {
    // Check for error message in query parameters
    const errorMessage = req.query.error;
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let bcrs = [];
    
    if (isDbConnected) {
      try {
        // Set a timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching BCRs'));
          }, 8000);
        });
        
        // Query to only get approved submissions with BCR numbers
        const bcrQuery = { 
          ...req.query,
          status: 'Approved',
          hasBcrNumber: true 
        };
        
        // Race the query against the timeout
        bcrs = await Promise.race([
          bcrModel.getAllSubmissions(bcrQuery),
          timeoutPromise
        ]);
      } catch (queryError) {
        console.error('Error fetching BCRs:', queryError);
        // Don't rethrow, just continue with empty bcrs
        bcrs = [];
      }
    }
    
    // If we got no BCRs, ensure we have an empty array
    const bcrsToDisplay = Array.isArray(bcrs) ? bcrs : [];
    
    // Format BCRs for display
    const formattedBcrs = bcrsToDisplay.map(bcr => {
      // Get status tag for display
      let workflowStatus = 'New Submission';
      let workflowStatusClass = 'govuk-tag';
      let currentPhase = 'Phase 1: Complete and Submit BCR form';
      
      // Extract phase information if available
      if (bcr.bcrId && bcr.bcrId.currentPhaseId) {
        // If we have a BCR with phase info, use that
        currentPhase = bcr.bcrId.currentPhaseId.name || 'Phase 1';
        
        // If we have status info from the BCR, use that
        if (bcr.bcrId.status) {
          workflowStatus = bcr.bcrId.status;
        }
        
        // If we have a status class from the BCR, use that
        if (bcr.bcrId.currentStatusId && bcr.bcrId.currentStatusId.color) {
          workflowStatusClass = `govuk-tag govuk-tag--${bcr.bcrId.currentStatusId.color}`;
        }
      }
      
      return {
        id: bcr._id || bcr.id,
        submissionCode: bcr.submissionCode || 'N/A',
        bcrNumber: bcr.bcrNumber || 'N/A',
        currentPhase: currentPhase,
        briefDescription: bcr.briefDescription || 'No description provided',
        fullName: bcr.fullName || 'Unknown',
        emailAddress: bcr.emailAddress || 'No email provided',
        submissionSource: bcr.submissionSource || 'Unknown',
        organisation: bcr.organisation || 'Not specified',
        urgencyLevel: bcr.urgencyLevel || 'Not specified',
        impactAreas: Array.isArray(bcr.impactAreas) ? bcr.impactAreas.join(', ') : 'None',
        displayStatus: workflowStatus,
        statusClass: workflowStatusClass,
        createdAt: bcr.createdAt ? 
          new Date(bcr.createdAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Unknown',
        updatedAt: bcr.updatedAt ? 
          new Date(bcr.updatedAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Unknown',
        reviewedAt: bcr.reviewedAt ? 
          new Date(bcr.reviewedAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Not reviewed'
      };
    });
    
    res.render('modules/bcr/bcrs/index', {
      title: 'Business Change Requests',
      bcrs: formattedBcrs,
      filters: req.query,
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      error: errorMessage || null,
      user: req.user
    });
  } catch (error) {
    console.error('Error in list BCRs controller:', error);
    // Instead of showing an error page, render the BCRs page with a warning
    res.render('modules/bcr/bcrs/index', {
      title: 'Business Change Requests',
      bcrs: [],
      filters: req.query,
      connectionIssue: true,
      timedOut: true,
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while loading Business Change Requests',
      user: req.user
    });
  }
};

/**
 * View a specific Business Change Request
 */
exports.viewBcr = async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Check if the ID is a valid MongoDB ObjectId
    if (!bcrId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render('error', {
        title: 'Invalid Request',
        message: 'The provided BCR ID is not valid',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // Find the BCR
    const bcr = await bcrModel.getBcrById(bcrId);
    if (!bcr) {
      // If BCR not found, redirect to the list page with a message
      return res.redirect('/bcr/business-change-requests?error=Business+Change+Request+not+found');
    }
    
    // Get the submission associated with this BCR
    let submission = null;
    if (bcr.submissionId) {
      submission = await bcrModel.getSubmissionById(bcr.submissionId);
    }
    
    // Create phase and status objects from the BCR data
    // This is a temporary solution until the BCR model is updated to use references
    const currentPhase = {
      name: bcr.currentPhase || 'Phase 1',
      description: 'Current workflow phase'
    };
    
    const currentStatus = {
      name: bcr.status || 'New',
      color: getStatusColor(bcr.status)
    };
    
    // Prepare BCR data for the view
    const bcrData = {
      ...bcr._doc || bcr,
      bcrNumber: bcr.bcrCode || bcr.bcrNumber || `BCR-${bcr.recordNumber || 'Unknown'}`,
      title: submission ? submission.briefDescription : (bcr.title || 'No title available'),
      description: submission ? submission.justification : (bcr.description || 'No description available')
    };
    
    // Render the BCR view
    res.render('modules/bcr/bcrs/view', {
      title: `BCR: ${bcrData.bcrNumber}`,
      bcr: bcrData,
      submission,
      currentPhase,
      currentStatus,
      user: req.user
    });
  } catch (error) {
    console.error('Error in viewBcr controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the Business Change Request',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Helper function to get a color for a status
 */
function getStatusColor(status) {
  switch (status) {
    case 'Active':
      return 'blue';
    case 'In Progress':
      return 'purple';
    case 'Completed':
      return 'green';
    case 'On Hold':
      return 'yellow';
    case 'Cancelled':
      return 'red';
    default:
      return 'grey';
  }
}

/**
 * View a specific BCR submission
 */
exports.viewSubmission = async (req, res) => {
  try {
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let submission = null;
    
    if (isDbConnected) {
      try {
        // Set a timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching submission details'));
          }, 8000);
        });
        
        // Race the query against the timeout
        submission = await Promise.race([
          bcrModel.getSubmissionById(req.params.id),
          timeoutPromise
        ]);
      } catch (queryError) {
        console.error('Error fetching submission details:', queryError);
        // Don't rethrow, continue with submission = null
      }
    }
    
    if (!submission) {
      // If we couldn't find the submission due to connection issues or timeout,
      // show a more helpful error page with connection status
      return res.status(404).render('error', {
        title: 'Submission Not Available',
        message: timedOut ? 
          'The request to fetch the submission timed out. Please try again later.' : 
          (!isDbConnected ? 
            'Database connection issue detected. Please try again when the database is available.' : 
            'The requested submission was not found'),
        error: {},
        connectionIssue: !isDbConnected,
        timedOut: timedOut,
        user: req.user
      });
    }
    
    res.render('modules/bcr/submissions/view', {
      title: `Submission ${submission.submissionCode}`,
      submission,
      statusTag: getSubmissionStatusTag(submission),
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      user: req.user
    });
  } catch (error) {
    console.error('Error in view submission controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submission details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * List all impact areas
 */
exports.listImpactAreas = async (req, res) => {
  try {
    console.log('Retrieving impact areas...');
    const impactAreas = await bcrModel.getAllImpactAreas();
    console.log(`Found ${impactAreas.length} impact areas:`, impactAreas);
    
    // Map MongoDB document structure to template structure
    const mappedImpactAreas = [];
    
    for (const area of impactAreas) {
      // Use the name from the database, or extract it from the description if not available
      let areaName = area.name;
      if (!areaName) {
        // If we have a description that matches one of our known areas, use that name
        const descriptions = {
          'Changes to databases, schema design, internal data handling, or system logic.': 'Backend',
          'Updates to UI components, form elements, filters, labels, or layout.': 'Frontend',
          'Creation, modification, or removal of API endpoints or request/response formats.': 'API',
          'Changes to data import/export templates, field order, column definitions.': 'CSV',
          'Additions, updates, or removals of reference data values (e.g., dropdown options).': 'Reference Data',
          'Updates to internal guidance, user manuals, technical specs, or public-facing help.': 'Documentation & Guidance',
          'Changes required due to external policy or legal/regulatory compliance updates.': 'Policy',
          'Modifications impacting funding calculations, eligibility, or reporting models.': 'Funding'
        };
        areaName = descriptions[area.value] || 'Unknown Area';
      }
      
      mappedImpactAreas.push({
        id: area._id,
        name: areaName,
        description: area.value || '',
        displayOrder: area.displayOrder || 0,
        isActive: area.isActive !== undefined ? area.isActive : true,
        bcrCount: 0 // Default to 0 since we don't have this data yet
      });
    }
    
    console.log('Mapped impact areas:', mappedImpactAreas);
    
    res.render('impacted-areas/list', {
      title: 'BCR Impact Areas',
      impactAreas: mappedImpactAreas,
      user: req.user
    });
  } catch (error) {
    console.error('Error in list impact areas controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the impact areas list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render new impact area form
 */
exports.newImpactAreaForm = async (req, res) => {
  try {
    res.render('impacted-areas/new', {
      title: 'New Impact Area',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in new impact area form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the new impact area form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Create a new impact area
 */
exports.createImpactArea = async (req, res) => {
  try {
    await bcrModel.createImpactArea({
      type: 'impactArea',
      value: req.body.value,
      displayName: req.body.displayName,
      displayOrder: parseInt(req.body.displayOrder, 10) || 0
    });
    
    res.redirect('/bcr/impact-areas/list');
  } catch (error) {
    console.error('Error in create impact area controller:', error);
    res.status(500).render('modules/bcr/impact-areas/new', {
      title: 'New Impact Area',
      formData: req.body,
      error: 'Failed to create impact area',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * Render edit impact area form
 */
exports.editImpactAreaForm = async (req, res) => {
  try {
    const impactArea = await bcrModel.getConfigById(req.params.id);
    
    if (!impactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested impact area was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('modules/bcr/impact-areas/edit', {
      title: `Edit Impact Area: ${impactArea.displayName || impactArea.value}`,
      impactArea,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in edit impact area form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Update an impact area
 */
exports.updateImpactArea = async (req, res) => {
  try {
    await bcrModel.updateConfig(req.params.id, {
      value: req.body.value,
      displayName: req.body.displayName,
      displayOrder: parseInt(req.body.displayOrder, 10) || 0
    });
    
    res.redirect('/bcr/impact-areas/list');
  } catch (error) {
    console.error('Error in update impact area controller:', error);
    res.status(500).render('modules/bcr/impact-areas/edit', {
      title: 'Edit Impact Area',
      impactArea: { id: req.params.id, ...req.body },
      error: 'Failed to update impact area',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * Render delete impact area confirmation
 */
exports.deleteImpactAreaConfirm = async (req, res) => {
  try {
    const impactArea = await bcrModel.getConfigById(req.params.id);
    
    if (!impactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested impact area was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('modules/bcr/impact-areas/delete-confirm', {
      title: `Delete Impact Area: ${impactArea.displayName || impactArea.value}`,
      impactArea,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in delete impact area confirm controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the delete confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Delete an impact area
 */
exports.deleteImpactArea = async (req, res) => {
  try {
    await bcrModel.deleteConfig(req.params.id);
    
    res.redirect('/bcr/impact-areas/list');
  } catch (error) {
    console.error('Error in delete impact area controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while trying to delete the impact area',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Helper function to get the appropriate status tag for a submission
 */
function getSubmissionStatusTag(submission) {
  // Use standardized GOV.UK Design System tag colors
  if (!submission.status) {
    return { text: 'Unknown', class: 'govuk-tag govuk-tag--grey' };
  }
  
  switch (submission.status.toLowerCase()) {
    case 'pending':
      return { text: 'Pending', class: 'govuk-tag govuk-tag--blue' };
    case 'approved':
      return { text: 'Approved', class: 'govuk-tag govuk-tag--green' };
    case 'rejected':
      return { text: 'Rejected', class: 'govuk-tag govuk-tag--red' };
    case 'in review':
      return { text: 'In Review', class: 'govuk-tag govuk-tag--purple' };
    case 'implementation':
      return { text: 'Implementation', class: 'govuk-tag govuk-tag--orange' };
    case 'completed':
      return { text: 'Completed', class: 'govuk-tag govuk-tag--green' };
    default:
      return { text: submission.status, class: 'govuk-tag' };
  }
}
