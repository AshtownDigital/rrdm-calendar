/**
 * BCR Module Controller
 * Consolidated controller for BCR functionality
 */

const mongoose = require('mongoose');
const bcrModel = require('../../../models/modules/bcr/model');
const { Submission } = require('../../../models');
const workflowService = require('../../../services/modules/bcr/workflowService');
const { formatBcr } = require('../../../utils/formatters');

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
            // Get BCRs directly instead of submissions to access the workflowStatus field
            return await Promise.race([
              bcrModel.getAllBcrs({ limit: 5 }),
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
    const formattedRecentBcrs = recentBcrs.map(bcr => {
      // Get workflow status tag based on phase and status
      let statusClass = 'govuk-tag';
      let statusText = 'New Submission';
      let phaseName = '';
      
      // First check for the workflowStatus field (new field)
      if (bcr.workflowStatus) {
        statusText = bcr.workflowStatus;
      }
      // Then check for currentStatusId (populated reference)
      else if (bcr.currentStatusId && bcr.currentStatusId.name) {
        statusText = bcr.currentStatusId.name;
      }
      // Finally fall back to the legacy status field
      else if (bcr.status) {
        statusText = bcr.status;
      }
      
      // Get the phase name if available
      if (bcr.currentPhaseId && bcr.currentPhaseId.name) {
        phaseName = bcr.currentPhaseId.name;
      }
      
      // If we have phase information, include it in the status text
      if (phaseName) {
        statusText = `${phaseName}: ${statusText}`;
      }
      
      // Determine the status class (color)
      if (bcr.currentStatusId && bcr.currentStatusId.color) {
        // Use the color from the status if available
        statusClass = `govuk-tag govuk-tag--${bcr.currentStatusId.color}`;
      } else {
        // Use the workflowService to get the appropriate tag styling
        const statusTag = workflowService.getStatusTag({
          name: statusText,
          value: statusText.toLowerCase().replace(/\s+/g, '-')
        });
        statusClass = statusTag.class;
      }
      
      // Get the submission code if available
      const submissionCode = bcr.submissionId?.submissionCode || 'N/A';
      
      return {
        id: bcr._id || bcr.id,
        bcrNumber: bcr.bcrNumber || 'N/A',
        submissionCode: submissionCode,
        description: bcr.title || bcr.description || (bcr.submissionId?.briefDescription) || 'Untitled',
        status: statusText,
        statusClass: statusClass,
        statusText: statusText,
        createdAt: bcr.createdAt ? new Date(bcr.createdAt).toLocaleDateString('en-GB') : 'Unknown'
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
    
    // Helper functions for the template
    const helpers = {
      getPhaseByDisplayOrder: (phases, displayOrder) => {
        return phases.find(p => p.displayOrder === displayOrder);
      },
      
      getStatusById: (statuses, statusId) => {
        if (!statusId) return null;
        const statusIdStr = statusId.toString();
        return statuses.find(s => s._id.toString() === statusIdStr);
      },
      
      getGroupDescription: (groupName) => {
        const descriptions = {
          "Submission & Initial Review": "The initial phases of the BCR process involve submission, review, and prioritization.",
          "Requirements & Analysis": "These phases focus on documenting and analyzing the requirements for the business change.",
          "Development & Testing": "These phases cover the implementation and testing of the business change.",
          "Documentation & Communication": "These phases ensure proper documentation and communication of the business change.",
          "Deployment & Closure": "These phases manage the deployment and closure of the business change."
        };
        return descriptions[groupName] || "This group of phases manages a specific aspect of the BCR process.";
      }
    };
    
    res.render('modules/bcr/workflow-dynamic', {
      title: 'BCR Workflow',
      phases,
      statuses,
      getPhaseByDisplayOrder: helpers.getPhaseByDisplayOrder,
      getStatusById: helpers.getStatusById,
      getGroupDescription: helpers.getGroupDescription,
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
    // Ignore any error messages about BCRs not found
    let errorMessage = req.query.error;
    if (errorMessage === 'Business+Change+Request+not+found') {
      errorMessage = null;
    }
    
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let bcrs = [];
    let phases = [];
    let statuses = [];
    
    if (isDbConnected) {
      try {
        // Set a timeout for this operation to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('Timeout fetching BCRs'));
          }, 8000);
        });
        
        // Get all phases and statuses for reference
        phases = await workflowService.getAllPhases();
        statuses = await workflowService.getAllStatuses();
        
        // Get BCRs with optional filtering
        bcrs = await Promise.race([
          bcrModel.getAllBcrs(req.query),
          timeoutPromise
        ]);
        
        console.log(`Retrieved ${bcrs.length} BCRs, ${phases.length} phases, and ${statuses.length} statuses`);
      } catch (error) {
        console.error('Error fetching BCRs:', error);
        // Don't rethrow, continue with bcrs = []
      }
    }
    
    // If we got no BCRs, ensure we have an empty array
    const bcrsToDisplay = Array.isArray(bcrs) ? bcrs : [];
    
    // Format BCRs for display
    const formattedBcrs = bcrsToDisplay.map(bcr => {
      // Default values for phase and status
      let currentPhase = 'Phase 1: Complete and Submit BCR form';
      let workflowStatus = 'New Submission';
      let workflowStatusClass = 'govuk-tag govuk-tag--blue';
      let currentPhaseId = null;
      let currentStatusId = null;
      
      // Get the current phase and status from the BCR
      if (bcr.currentPhaseId) {
        currentPhaseId = bcr.currentPhaseId._id || bcr.currentPhaseId;
        currentPhase = bcr.currentPhaseId.name || 'Unknown Phase';
      }
      
      // First check for the workflowStatus field (new field)
      if (bcr.workflowStatus) {
        workflowStatus = bcr.workflowStatus;
        
        // Try to find the matching status in our statuses list
        const matchingStatus = statuses.find(s => s.name === bcr.workflowStatus);
        if (matchingStatus && matchingStatus.color) {
          workflowStatusClass = `govuk-tag govuk-tag--${matchingStatus.color}`;
        } else {
          // Use the getStatusTag helper for consistent styling
          const statusTag = workflowService.getStatusTag({
            name: bcr.workflowStatus,
            value: bcr.workflowStatus.toLowerCase().replace(/\s+/g, '-')
          });
          workflowStatusClass = statusTag.class;
        }
      } 
      // Then check for currentStatusId (populated reference)
      else if (bcr.currentStatusId) {
        currentStatusId = bcr.currentStatusId._id || bcr.currentStatusId;
        workflowStatus = bcr.currentStatusId.name || 'Unknown Status';
        workflowStatusClass = bcr.currentStatusId.color ? 
          `govuk-tag govuk-tag--${bcr.currentStatusId.color}` : 'govuk-tag';
      } 
      // Finally fall back to the legacy status field
      else if (bcr.status) {
        workflowStatus = bcr.status;
        
        // Try to find the matching status in our statuses list
        const matchingStatus = statuses.find(s => s.name === bcr.status);
        if (matchingStatus && matchingStatus.color) {
          workflowStatusClass = `govuk-tag govuk-tag--${matchingStatus.color}`;
        }
      }
      
      // If we have a submissionId reference, extract additional info if needed
      if (bcr.submissionId) {
        // Only use these as fallbacks if not already set
        if (!currentPhase && bcr.submissionId.workflowPhase) {
          currentPhase = bcr.submissionId.workflowPhase;
        }
        
        if (!workflowStatus && bcr.submissionId.status) {
          workflowStatus = bcr.submissionId.status;
        }
      }
      
      return {
        id: bcr._id || bcr.id,
        bcrNumber: bcr.bcrNumber || 'N/A',
        submissionCode: bcr.submissionId ? bcr.submissionId.submissionCode : 'N/A',
        briefDescription: bcr.title || (bcr.submissionId ? bcr.submissionId.briefDescription : 'No description provided'),
        currentPhase: currentPhase,
        currentPhaseId: currentPhaseId,
        displayStatus: workflowStatus,
        currentStatusId: currentStatusId,
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
          }) : 'Unknown'
      };
    });
    
    res.render('modules/bcr/bcrs/index', {
      title: 'Business Change Requests',
      bcrs: formattedBcrs,
      phases,
      statuses,
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
      phases: [],
      statuses: [],
      filters: req.query,
      connectionIssue: true,
      timedOut: true,
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while loading Business Change Requests',
      user: req.user
    });
  }
};

/**
 * View workflow progress for a specific BCR by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.viewWorkflowProgress = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the BCR data
    const bcr = await bcrModel.getBcrById(id);
    if (!bcr) {
      req.flash('error', 'BCR not found');
      return res.redirect('/bcr/business-change-requests');
    }
    
    // Get the submission data if available
    let submission = null;
    if (bcr.submissionId) {
      submission = await Submission.findById(bcr.submissionId);
    }
    
    // Get the current phase and status
    const phase = await workflowService.getPhaseById(bcr.currentPhaseId);
    const status = await workflowService.getStatusById(bcr.currentStatusId);
    
    // Set the current phase and status
    const currentPhase = phase ? phase.name : 'Unknown';
    const workflowStatus = status ? status.name : 'Unknown';
    const workflowStatusClass = status && status.color ? `govuk-tag govuk-tag--${status.color}` : 'govuk-tag';
    
    // Format the BCR data for the view
    const bcrData = {
      ...bcr,
      createdAt: bcr.createdAt,
      updatedAt: bcr.updatedAt
    };
    
    // Get all phases for the workflow visualization
    const allPhases = await bcrModel.getAllPhases();
    
    // Get all statuses for the timeline
    const allStatuses = await bcrModel.getAllStatuses();
    
    // Create a simple workflow visualization
    const workflowProgress = [];
    
    // Sort phases by display order
    allPhases.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Find the current phase index
    const currentPhaseIndex = allPhases.findIndex(phase => 
      phase._id.toString() === (bcr.currentPhaseId ? bcr.currentPhaseId._id.toString() : ''));
    
    // Get the initial phase for the BCR creation event in the timeline
    let initialPhase = 'Initial Phase';
    if (allPhases.length > 0) {
      initialPhase = allPhases[0].name;
    }
    
    // Create the workflow progress data
    for (let i = 0; i < allPhases.length; i++) {
      const phase = allPhases[i];
      const isCurrentPhase = i === currentPhaseIndex;
      const isCompleted = i < currentPhaseIndex;
      
      workflowProgress.push({
        id: phase._id,
        name: phase.name,
        displayOrder: phase.displayOrder,
        status: isCompleted ? 'Completed' : (isCurrentPhase ? 'In Progress' : 'Not Started'),
        statusClass: isCompleted ? 'govuk-tag--green' : (isCurrentPhase ? 'govuk-tag--blue' : 'govuk-tag--grey')
      });
    }
    
    // Render the workflow progress view
    res.render('modules/bcr/bcrs/workflow-progress', {
      title: `Workflow Progress for BCR ${bcrData.bcrNumber}`,
      bcr: {
        ...bcrData,
        initialPhase: initialPhase
      },
      submission,
      currentPhase,
      workflowStatus,
      workflowStatusClass,
      workflowProgress,
      allPhases,
      allStatuses,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    console.error('Error viewing workflow progress:', error);
    // Handle error without using flash if it's not available
    return res.status(500).render('error', {
      message: 'An error occurred while viewing the workflow progress',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * View a specific Business Change Request
 */
exports.viewBcr = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if the ID is a valid MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render('error', {
        title: 'Invalid Request',
        message: 'The provided ID is not valid',
        error: { status: 400 },
        user: req.user
      });
    }
    
    // First try to find the ID as a BCR
    let bcr = await bcrModel.getBcrById(id);
    let submission = null;
    
    // If not found as a BCR, check if it's a submission ID
    if (!bcr) {
      submission = await bcrModel.getSubmissionById(id);
      
      if (submission && submission.bcrId) {
        // If it's a submission with a BCR ID, get the BCR
        bcr = await bcrModel.getBcrById(submission.bcrId);
      } else if (submission && submission.bcrNumber) {
        // If it's a submission with a BCR number but no BCR ID, try to find the BCR by other means
        // This is a fallback for submissions that were approved before the BCR model was updated
        const bcrs = await bcrModel.getAllBcrs({ search: submission.bcrNumber });
        if (bcrs && bcrs.length > 0) {
          bcr = bcrs[0];
        }
      }
      
      // If we still couldn't find a BCR, create a simple BCR object from the submission
      if (!bcr && submission) {
        // Create a temporary BCR object from the submission data
        bcr = {
          _id: submission._id,
          bcrNumber: submission.bcrNumber || 'BCR-Unknown',
          title: submission.briefDescription || 'No title available',
          description: submission.justification || 'No description available',
          urgencyLevel: submission.urgencyLevel || 'Medium',
          status: submission.status || 'Approved',
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt
        };
      } else if (!bcr) {
        // If no BCR and no submission found, redirect to the list page
        return res.redirect('/bcr/business-change-requests');
      }
    } else if (bcr.submissionId) {
      // If we found the BCR directly, get its associated submission
      submission = await bcrModel.getSubmissionById(bcr.submissionId);
    }
    
    // Get the current phase and status from the database
    let workflowStatus = 'New Submission';
    let workflowStatusClass = 'govuk-tag';
    let currentPhase = '';
    let currentPhaseObj = null;
    let currentStatusObj = null;
    
    // Fetch the current phase and status if the BCR has them
    if (bcr.currentPhaseId) {
      try {
        // Get the current phase
        const phase = await workflowService.getPhaseById(bcr.currentPhaseId);
        if (phase) {
          currentPhaseObj = phase;
          currentPhase = phase.name;
          console.log('Fetched current phase:', currentPhase);
        }
      } catch (error) {
        console.error('Error fetching current phase:', error);
      }
    }
    
    if (bcr.currentStatusId) {
      try {
        // Get the current status
        const status = await workflowService.getStatusById(bcr.currentStatusId);
        if (status) {
          currentStatusObj = status;
          workflowStatus = status.name;
          console.log('Fetched current status:', workflowStatus);
        }
      } catch (error) {
        console.error('Error fetching current status:', error);
      }
    } else if (bcr.workflowStatus) {
      // If we have a workflowStatus field but no currentStatusId, use that
      workflowStatus = bcr.workflowStatus;
      console.log('Using workflowStatus field:', workflowStatus);
    }
    
    // Get the status tag styling
    const statusTag = workflowService.getStatusTag(currentStatusObj || { name: workflowStatus });
    workflowStatusClass = statusTag.class;
    
    // Log the values we're using
    console.log('Using dynamic values for BCR:', bcr.bcrNumber || bcr.bcrCode);
    console.log('- Current Phase:', currentPhase);
    console.log('- Workflow Status:', workflowStatus);
    console.log('- Status Class:', workflowStatusClass);
    
    // Prepare BCR data for the view
    const bcrData = {
      ...bcr._doc || bcr,
      bcrNumber: bcr.bcrCode || bcr.bcrNumber || `BCR-${bcr.recordNumber || 'Unknown'}`,
      title: submission ? submission.briefDescription : (bcr.title || 'No title available'),
      description: submission ? submission.justification : (bcr.description || 'No description available')
    };
    
    // Debug log to see what values are being passed to the template
    console.log('Debug - BCR View Data:', {
      bcrNumber: bcrData.bcrNumber,
      currentPhase,
      currentPhaseObj,
      workflowStatus,
      workflowStatusClass,
      currentStatus: currentStatusObj
    });
    
    // Get all phases for the workflow visualization
    const allPhases = await bcrModel.getAllPhases();
    
    // Get all statuses for the timeline
    const allStatuses = await bcrModel.getAllStatuses();
    
    // Create a simple workflow visualization
    const workflowProgress = [];
    
    // Sort phases by display order
    allPhases.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Find the current phase index
    const currentPhaseIndex = allPhases.findIndex(phase => 
      phase._id.toString() === (bcr.currentPhaseId ? bcr.currentPhaseId._id.toString() : ''));
    
    // Get the initial phase for the BCR creation event in the timeline
    let initialPhase = 'Initial Phase';
    if (allPhases.length > 0) {
      initialPhase = allPhases[0].name;
    }
    
    // Create the workflow progress data
    for (let i = 0; i < allPhases.length; i++) {
      const phase = allPhases[i];
      const isCurrentPhase = i === currentPhaseIndex;
      const isCompleted = i < currentPhaseIndex;
      
      workflowProgress.push({
        id: phase._id,
        name: phase.name,
        displayOrder: phase.displayOrder,
        status: isCompleted ? 'Completed' : (isCurrentPhase ? 'In Progress' : 'Not Started'),
        statusClass: isCompleted ? 'govuk-tag--green' : (isCurrentPhase ? 'govuk-tag--blue' : 'govuk-tag--grey')
      });
    }
    
    // Render the BCR view
    res.render('modules/bcr/bcrs/view', {
      title: `BCR ${bcrData.bcrNumber}`,
      bcr: {
        ...bcrData,
        initialPhase: initialPhase
      },
      submission,
      currentPhase,
      workflowStatus,
      workflowStatusClass,
      workflowProgress,
      allPhases,
      allStatuses,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
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
 * Render the edit submission form
 */
exports.editSubmissionForm = async (req, res) => {
  try {
    // Check MongoDB connection state
    const isDbConnected = mongoose.connection.readyState === 1;
    let timedOut = false;
    let submission = null;
    let impactAreas = [];
    let urgencyLevels = [];
    
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
        
        // Get impact areas and urgency levels for form dropdowns
        [impactAreas, urgencyLevels] = await Promise.all([
          bcrModel.getAllImpactAreas(),
          bcrModel.getAllUrgencyLevels()
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
    
    res.render('modules/bcr/submissions/edit', {
      title: `Edit Submission ${submission.submissionCode}`,
      submission,
      impactAreas,
      urgencyLevels,
      statusTag: getSubmissionStatusTag(submission),
      connectionIssue: !isDbConnected,
      timedOut: timedOut,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in edit submission form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      connectionIssue: mongoose.connection.readyState !== 1,
      user: req.user
    });
  }
};

/**
 * Update a submission
 */
exports.updateSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get the current submission
    const currentSubmission = await bcrModel.getSubmissionById(submissionId);
    if (!currentSubmission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested submission was not found',
        error: {},
        user: req.user
      });
    }
    
    // Prepare update data from form
    const updateData = {
      fullName: req.body.fullName,
      emailAddress: req.body.emailAddress,
      organisation: req.body.organisation,
      briefDescription: req.body.briefDescription,
      justification: req.body.justification,
      urgencyLevel: req.body.urgencyLevel,
      impactAreas: Array.isArray(req.body.impactAreas) ? req.body.impactAreas : [req.body.impactAreas],
      technicalDependencies: req.body.technicalDependencies,
      additionalNotes: req.body.additionalNotes,
      updatedAt: new Date()
    };
    
    // Update the submission
    await bcrModel.Submission.findByIdAndUpdate(submissionId, updateData);
    
    // Redirect to the submission view page
    res.redirect(`/bcr/submissions/${submissionId}`);
  } catch (error) {
    console.error('Error in update submission controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while updating the submission',
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
