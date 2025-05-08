/**
 * BCR Submissions Controller
 * Handles BCR submissions listing, viewing, and filtering
 */
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');

/**
 * List all BCR submissions with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listSubmissions = async (req, res) => {
  try {
    // Get filter parameters from query string
    const status = req.query.status || 'all';
    const impactArea = req.query.impactArea || 'all';
    const submitter = req.query.submitter || 'all';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    
    // Get submissions from database using the service
    const submissions = await bcrService.getAllBcrs({
      status,
      impactArea,
      submitter,
      startDate,
      endDate
    });
    
    // Get configuration data for filters using the service
    const statuses = await bcrConfigService.getConfigsByType('status');
    const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
    
    // Get unique submitters for filter
    const allSubmissions = await bcrService.getAllBcrs();
    const submitters = [...new Set(
      allSubmissions
        .filter(s => s.Users_Bcrs_requestedByToUsers)
        .map(s => s.Users_Bcrs_requestedByToUsers.name)
    )].sort();
    
    // Render the template with data
    res.render('modules/bcr/submissions', {
      title: 'BCR Submissions',
      submissions,
      filters: {
        statuses: statuses.map(s => s.name),
        impactAreas: impactAreas.map(ia => ia.name),
        submitters
      },
      selectedFilters: {
        status,
        impactArea,
        submitter,
        startDate,
        endDate
      },
      user: req.user
    });
  } catch (error) {
    console.error('Error fetching BCR submissions:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR submissions',
      error,
      user: req.user
    });
  }
};

/**
 * View a single BCR submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const viewSubmission = async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Find the BCR in the database with associated users using the service
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }
    
    // Get phases and statuses for the UI
    const phases = await bcrConfigService.getConfigsByType('phase');
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    // Get users for assignee dropdown
    const users = await prisma.users.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });
    
    // Render the template with data
    res.render('modules/bcr/submission-details', {
      title: `BCR: ${bcr.title}`,
      bcr,
      phases,
      statuses,
      users,
      user: req.user
    });
  } catch (error) {
    console.error('Error viewing BCR submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR submission',
      error,
      user: req.user
    });
  }
};

/**
 * Show the phase update confirmation page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const phaseUpdateConfirmation = async (req, res) => {
  try {
    const bcrId = req.params.id;
    
    // Find the BCR in the database using the service
    const bcr = await bcrService.getBcrById(bcrId);
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        user: req.user
      });
    }
    
    // Render the template with data
    res.render('modules/bcr/phase-update-confirmation', {
      title: 'Phase Update Confirmation',
      bcr,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading phase update confirmation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load phase update confirmation',
      error,
      user: req.user
    });
  }
};

module.exports = {
  listSubmissions,
  viewSubmission,
  phaseUpdateConfirmation
};
