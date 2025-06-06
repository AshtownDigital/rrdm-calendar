/**
 * BCR Submission Controller
 * Handles BCR submissions and viewing submission details with BPMN workflow
 */
// Using Mongoose models
const Bcr = require('../../models/Bcr');
const BcrConfig = require('../../models/BcrConfig');
const User = require('../../models/User');
const { v4: uuidv4 } = require('uuid');
const bcrConfigService = require('../../services/bcrConfigService');
const bcrWorkflowService = require('../../services/bcrWorkflowService');

// Simple logger
const logger = {
  info: (message) => console.log(`INFO: ${message}`),
  error: (message, error) => console.error(`ERROR: ${message}`, error || '')
};

/**
 * Generate a BCR code in the format BCR-YY/YY-XXXX
 */
async function generateBcrCode() {
  const now = new Date();
  const fiscalYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fiscalYearEnd = fiscalYearStart + 1;
  const shortYearStart = fiscalYearStart.toString().slice(-2);
  const shortYearEnd = fiscalYearEnd.toString().slice(-2);
  
  let nextId = 1000;
  try {
    const highestBcr = await Bcr.findOne().sort({ bcrNumber: -1 });
    
    if (highestBcr && highestBcr.bcrNumber) {
      const parts = highestBcr.bcrNumber.split('-');
      const lastPart = parts[parts.length - 1];
      const lastId = parseInt(lastPart, 10);
      if (!isNaN(lastId)) {
        nextId = lastId + 1;
      }
    }
  } catch (error) {
    logger.error('Error generating BCR code:', error);
  }
  
  return `BCR-${shortYearStart}/${shortYearEnd}-${nextId}`;
}

/**
 * Create a new BCR submission
 */
async function createSubmission(req, res) {
  try {
    const { description, priority, impact } = req.body;
    const userId = req.user.id;
    
    const bcrCode = await generateBcrCode();
    
    const bcr = await Bcr.create({
      id: mongoose.Types.ObjectId(),
      description,
      status: 'new_submission',
      priority,
      impact,
      requestedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      bcrNumber: bcrCode,
      notes: `Initial submission created by ${req.user.name} on ${new Date().toISOString()}`
    });
    
    logger.info(`New BCR submission created: ${bcrCode}`);
    res.redirect(`/direct/bcr-submissions/${bcr.id}`);
  } catch (error) {
    logger.error('Error creating BCR submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while creating the BCR submission',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
}

/**
 * View a BCR submission
 */
async function viewSubmission(req, res) {
  try {
    const bcrId = req.params.id;
    
    // Get the BCR data with workflow activities
    const bcr = await Bcr.findById(bcrId)
      .populate({
        path: 'workflowActivities',
        options: { sort: { createdAt: -1 } }
      })
      .exec();
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        error: {},
        user: req.user
      });
    }
    
    // Get all users for assignee dropdown and other data
    let users = [];
    let assignee = null;
    let urgencyLevels = [];
    let impactAreas = [];
    
    try {
      // Get users
      users = await User.find().sort({ name: 1 }).exec();
      
      // Get assignee details if assigned
      if (bcr.assignedTo) {
        assignee = await User.findById(bcr.assigneeId).exec();
      }
      
      // Get urgency levels and impact areas
      urgencyLevels = await BcrConfig.find({ type: 'urgencyLevel' }).sort({ displayOrder: 1 }).exec();
      impactAreas = await BcrConfig.find({ type: 'impactArea' }).sort({ displayOrder: 1 }).exec();
    } catch (error) {
      logger.error('Error retrieving data:', error);
    }
    
    // Get BPMN workflow data
    let phases = [];
    let statuses = [];
    let transitions = [];
    let swimlanes = {};
    let availableTransitions = [];
    
    try {
      // Process phases
      const phaseConfigs = await BcrConfig.find({ type: 'phase' }).sort({ order: 1 }).exec();
      
      phases = phaseConfigs.map(config => {
        try {
          const phaseData = JSON.parse(config.value);
          return {
            id: phaseData.id.toString(),
            name: config.name,
            displayName: phaseData.displayName || config.name,
            swimlane: phaseData.swimlane || 'default',
            order: phaseData.order || 0,
            description: phaseData.description || ''
          };
        } catch (e) {
          return {
            id: config.value,
            name: config.name,
            displayName: config.name,
            swimlane: 'default',
            order: 0,
            description: ''
          };
        }
      }).sort((a, b) => a.order - b.order);
      
      // Process statuses
      statuses = statusConfigs.map(config => {
        return {
          id: config.id,
          name: config.name,
          displayName: config.name.replace(/_/g, ' ')
        };
      });
      
      // Process transitions for the BPMN diagram
      transitions = phaseTransitions.map(config => {
        try {
          const transitionData = JSON.parse(config.value);
          return {
            id: config.id,
            name: config.name,
            fromPhaseId: transitionData.fromPhaseId.toString(),
            toPhaseId: transitionData.toPhaseId.toString(),
            condition: transitionData.condition || null,
            isDefault: transitionData.isDefault || false
          };
        } catch (e) {
          return null;
        }
      }).filter(t => t !== null);
      
      // Group phases by swimlane for the BPMN diagram
      phases.forEach(phase => {
        if (!swimlanes[phase.swimlane]) {
          swimlanes[phase.swimlane] = [];
        }
        swimlanes[phase.swimlane].push(phase);
      });
      
      // Sort swimlanes
      const swimlaneOrder = ['Assessment', 'Analysis', 'Planning', 'Implementation'];
      const sortedSwimlanes = {};
      swimlaneOrder.forEach(lane => {
        if (swimlanes[lane]) {
          sortedSwimlanes[lane] = swimlanes[lane].sort((a, b) => a.order - b.order);
        }
      });
      
      // Add any remaining swimlanes
      Object.keys(swimlanes).forEach(lane => {
        if (!swimlaneOrder.includes(lane)) {
          sortedSwimlanes[lane] = swimlanes[lane].sort((a, b) => a.order - b.order);
        }
      });
      
      swimlanes = sortedSwimlanes;
      
      // Get available transitions for the current BCR
      if (bcr.currentPhaseId) {
        availableTransitions = await bcrWorkflowService.getAvailableTransitions(bcrId);
      }
    } catch (error) {
      logger.error('Error retrieving BPMN workflow data:', error);
    }

    // Render the template with all available data
    res.render('modules/bcr/submission-details', {
      title: `BCR ${bcr.bcrNumber} Details - ${bcr.id}`,
      bcr,
      phases,
      statuses,
      transitions,
      swimlanes,
      availableTransitions,
      users,
      // Use the BCR data directly for submission and workflow
      submission: {
        bcrId: bcr.id,
        bcrCode: bcr.bcrNumber,
        description: bcr.description,
        priority: bcr.priority,
        impact: bcr.impact,
        requestedBy: bcr.requestedBy,
        createdAt: bcr.createdAt,
        updatedAt: bcr.updatedAt
      },
      workflow: {
        bcrId: bcr.id,
        status: bcr.status,
        assignedTo: bcr.assignedTo,
        targetDate: bcr.targetDate,
        implementationDate: bcr.implementationDate,
        notes: bcr.notes,
        createdAt: bcr.createdAt,
        updatedAt: bcr.updatedAt
      },
      requester: bcr.requestedBy,
      assignee,
      urgencyLevels,
      impactAreas,
      user: req.user
    });
  } catch (error) {
    logger.error('Error viewing BCR submission:', error);
    return res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while viewing BCR submission',
      error,
      user: req.user
    });
  }
}

/**
 * Update a BCR submission
 */
async function updateSubmission(req, res) {
  try {
    const bcrId = req.params.id;
    const { description, priority, impact, status, assignedTo, targetDate, implementationDate, notes } = req.body;
    
    const bcr = await Bcr.findById(bcrId).exec();
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        error: {},
        user: req.user
      });
    }
    
    await Bcr.findByIdAndUpdate(bcrId, {
      description,
      priority,
      impact,
      status,
      assignedTo,
      targetDate: targetDate ? new Date(targetDate) : null,
      implementationDate: implementationDate ? new Date(implementationDate) : null,
      notes,
      updatedAt: new Date()
    });
    
    logger.info(`BCR submission updated: ${bcr.bcrNumber || bcr.id}`);
    res.redirect(`/bcr/submission/${bcrId}`);
  } catch (error) {
    logger.error('Error updating BCR submission:', error);
    return res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while updating BCR submission',
      error,
      user: req.user
    });
  }
}

/**
 * Delete a BCR submission
 */
async function deleteSubmission(req, res) {
  try {
    const bcrId = req.params.id;
    
    const bcr = await Bcr.findById(bcrId).exec();
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        error: {},
        user: req.user
      });
    }
    
    await Bcr.findByIdAndDelete(bcrId).exec();
    
    logger.info(`BCR submission deleted: ${bcr.bcrNumber || bcr.id}`);
    res.redirect('/bcr/submissions');
  } catch (error) {
    logger.error('Error deleting BCR submission:', error);
    return res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while deleting BCR submission',
      error,
      user: req.user
    });
  }
}

/**
 * Show the delete confirmation page
 */
async function showDeleteConfirmation(req, res) {
  try {
    const bcrId = req.params.id;
    
    const bcr = await Bcr.findById(bcrId).exec();
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${bcrId} not found`,
        error: {},
        user: req.user
      });
    }
    
    res.render('modules/bcr/delete-confirmation', {
      title: 'Delete BCR',
      bcr,
      // Use the BCR data directly for submission and workflow
      submission: {
        bcrId: bcr.id,
        bcrCode: bcr.bcrNumber,
        description: bcr.description,
        priority: bcr.priority,
        impact: bcr.impact,
        requestedBy: bcr.requestedBy,
        createdAt: bcr.createdAt,
        updatedAt: bcr.updatedAt
      },
      workflow: {
        bcrId: bcr.id,
        status: bcr.status,
        assignedTo: bcr.assignedTo,
        targetDate: bcr.targetDate,
        implementationDate: bcr.implementationDate,
        notes: bcr.notes,
        createdAt: bcr.createdAt,
        updatedAt: bcr.updatedAt
      },
      user: req.user
    });
  } catch (error) {
    logger.error('Error showing delete confirmation:', error);
    return res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while showing delete confirmation',
      error,
      user: req.user
    });
  }
}

/**
 * Show the new BCR submission form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function newSubmission(req, res) {
  try {
    // Get urgency levels and impact areas for the form
    const urgencyLevels = ['Low', 'Medium', 'High', 'Critical'];
    
    let impactAreas = [];
    try {
      impactAreas = await BcrConfig.find({ type: 'impact_area' }).sort({ name: 1 }).exec();
    } catch (error) {
      logger.error('Error retrieving impact areas:', error);
    }
    
    res.render('modules/bcr/submit', {
      title: 'Submit New BCR',
      urgencyLevels,
      impactAreas,
      formData: {},
      errors: {},
      user: req.user
    });
  } catch (error) {
    logger.error('Error rendering new BCR submission form:', error);
    return res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading BCR submission form',
      error,
      user: req.user
    });
  }
}

/**
 * Review a BCR submission before promotion
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function reviewSubmission(req, res) {
  try {
    const submissionId = req.params.id;
    
    // Get the BCR submission
    const bcr = await Bcr.findById(submissionId).exec();
    
    if (!bcr) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${submissionId} not found`,
        error: {},
        user: req.user
      });
    }
    
    // Get all phases and statuses
    const phases = await BcrConfig.find({ type: 'phase' }).sort({ value: 1 }).exec();
    
    const statuses = await BcrConfig.find({ type: 'status' }).sort({ value: 1 }).exec();
    
    // Get urgency levels and impact areas
    const urgencyLevels = ['Low', 'Medium', 'High', 'Critical'];
    const impactAreas = await BcrConfig.find({ type: 'impact_area' }).sort({ name: 1 }).exec();
    
    res.render('modules/bcr/submission-confirmation', {
      title: 'Review BCR Submission',
      bcr,
      phases,
      statuses,
      urgencyLevels,
      impactAreas,
      user: req.user
    });
  } catch (error) {
    logger.error('Error reviewing BCR submission:', error);
    return res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while reviewing BCR submission',
      error,
      user: req.user
    });
  }
}

module.exports = {
  createSubmission,
  newSubmission,
  reviewSubmission,
  viewSubmission,
  updateSubmission,
  deleteSubmission,
  showDeleteConfirmation
};
