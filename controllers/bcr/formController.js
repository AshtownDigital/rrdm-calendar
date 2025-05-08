/**
 * BCR Form Controller
 * Handles BCR submission forms and processing
 */
const { v4: uuidv4 } = require('uuid');
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Display the new BCR submission form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showSubmitForm = async (req, res) => {
  try {
    // Get configuration data from database using services
    const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
    
    // Render the template with data
    res.render('modules/bcr/submit', {
      title: 'Submit BCR',
      impactAreas,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading BCR submission form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR submission form',
      error,
      user: req.user
    });
  }
};

/**
 * Process a new BCR submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processSubmission = async (req, res) => {
  try {
    // Process impact areas (handle both array and single value)
    let impactAreas = req.body.impactAreas;
    if (!Array.isArray(impactAreas)) {
      impactAreas = impactAreas ? [impactAreas] : [];
    }
    
    // Generate a new BCR ID
    const bcrNumber = await bcrService.generateBcrNumber();
    
    // Create the BCR data object
    const bcrData = {
      title: req.body.title,
      description: req.body.description,
      impact: impactAreas.join(', '),
      status: 'draft',
      requestedBy: req.user.id,
      notes: `${new Date().toISOString()} - ${req.user.name}: Initial submission`
    };
    
    // Create the BCR in the database
    const newBcr = await bcrService.createBcr(bcrData);
    
    // Redirect to the confirmation page
    res.redirect(`/bcr/update-confirmation/${newBcr.id}`);
  } catch (error) {
    console.error('Error in BCR submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to save submission: ' + error.message,
      user: req.user
    });
  }
};

/**
 * Display the BCR update confirmation page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showUpdateConfirmation = async (req, res) => {
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
    res.render('modules/bcr/update-confirmation', {
      title: 'BCR Update Confirmation',
      bcr,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading BCR update confirmation:', error);
    return res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR update confirmation',
      error,
      user: req.user
    });
  }
};

/**
 * Display the edit BCR form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditForm = async (req, res) => {
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
    
    // Get configuration data from database using services
    const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
    
    // Parse the impact areas from the BCR
    const selectedImpactAreas = bcr.impact ? bcr.impact.split(', ') : [];
    
    // Render the template with data
    res.render('modules/bcr/edit-submission', {
      title: `Edit BCR: ${bcr.title}`,
      bcr,
      impactAreas,
      selectedImpactAreas,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading BCR edit form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load BCR edit form',
      error,
      user: req.user
    });
  }
};

module.exports = {
  showSubmitForm,
  processSubmission,
  showUpdateConfirmation,
  showEditForm
};
