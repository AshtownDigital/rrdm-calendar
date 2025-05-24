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
              bcrModel.getAllSubmissions({ limit: 5 }),
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
      const statusTag = getSubmissionStatusTag(submission);
      return {
        id: submission._id || submission.id,
        bcrNumber: submission.submissionCode || 'N/A',
        description: submission.title || 'Untitled',
        status: submission.status || 'Unknown',
        statusClass: statusTag.class,
        statusText: statusTag.text,
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
    
    res.render('bcr/submission/new', {
      title: 'New BCR Submission',
      impactAreas,
      urgencyLevels,
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
    const submission = await bcrModel.createSubmission({
      ...req.body,
      submittedById: req.user ? req.user.id : null
    });
    
    res.redirect(`/bcr/submissions/${submission.id}`);
  } catch (error) {
    console.error('Error in create submission controller:', error);
    
    // Get impact areas and urgency levels for re-rendering the form
    const impactAreas = await bcrModel.getAllImpactAreas();
    const urgencyLevels = await bcrModel.getAllUrgencyLevels();
    
    res.status(500).render('bcr/submission/new', {
      title: 'New BCR Submission',
      impactAreas,
      urgencyLevels,
      formData: req.body,
      error: 'Failed to create submission',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * List all BCR submissions
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
        
        // Race the query against the timeout
        submissions = await Promise.race([
          bcrModel.getAllSubmissions(req.query),
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
      
      return {
        id: submission._id || submission.id,
        bcrNumber: submission.submissionCode || 'N/A',
        title: submission.title || submission.briefDescription || 'Untitled',
        displayStatus: statusTag.text,
        statusClass: statusTag.class,
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
          }) : 'Unknown'
      };
    });
    
    res.render('modules/bcr/submissions/index', {
      title: 'BCR Submissions',
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
      title: 'BCR Submissions',
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
    
    res.render('bcr/submission/view', {
      title: `BCR Submission ${submission.id}`,
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
      mappedImpactAreas.push({
        id: area._id,
        name: area.displayName || area.value.charAt(0).toUpperCase() + area.value.slice(1),
        description: area.description || '',
        displayOrder: area.displayOrder || 0
      });
    }
    
    console.log('Mapped impact areas:', mappedImpactAreas);
    
    res.render('modules/bcr/impact-areas/index', {
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
    res.render('modules/bcr/impact-areas/new', {
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
