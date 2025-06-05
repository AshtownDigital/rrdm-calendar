/**
 * BCR Phase Rules Service
 * Provides validation rules, checklists, and recommendations for BCR phases
 */

const mongoose = require('mongoose');

// Phase checklist items by phase name - these would typically come from a database
const phaseChecklists = {
  'Initiation': [
    { id: 'init1', text: 'Business case submitted', required: true },
    { id: 'init2', text: 'Stakeholders identified', required: true },
    { id: 'init3', text: 'Initial scope defined', required: true },
    { id: 'init4', text: 'Budget approved', required: false }
  ],
  'Review': [
    { id: 'rev1', text: 'Technical feasibility assessed', required: true },
    { id: 'rev2', text: 'Risk assessment complete', required: true },
    { id: 'rev3', text: 'Stakeholder approval received', required: true },
    { id: 'rev4', text: 'Resources identified', required: false }
  ],
  'Planning': [
    { id: 'plan1', text: 'Detailed requirements gathered', required: true },
    { id: 'plan2', text: 'Design documents created', required: true },
    { id: 'plan3', text: 'Project timeline established', required: true },
    { id: 'plan4', text: 'Communication plan created', required: false }
  ],
  'Implementation': [
    { id: 'impl1', text: 'Development completed', required: true },
    { id: 'impl2', text: 'Testing performed', required: true },
    { id: 'impl3', text: 'Documentation updated', required: true },
    { id: 'impl4', text: 'Training materials created', required: false }
  ],
  'Deployment': [
    { id: 'dep1', text: 'Release plan approved', required: true },
    { id: 'dep2', text: 'System deployed to production', required: true },
    { id: 'dep3', text: 'Post-deployment testing complete', required: true },
    { id: 'dep4', text: 'Rollback plan established', required: false }
  ],
  'Evaluation': [
    { id: 'eval1', text: 'Metrics collected and analyzed', required: true },
    { id: 'eval2', text: 'Stakeholder feedback gathered', required: true },
    { id: 'eval3', text: 'Lessons learned documented', required: true },
    { id: 'eval4', text: 'Future recommendations provided', required: false }
  ]
};

// Recommended next steps by phase name
const recommendedNextSteps = {
  'Initiation': [
    'Schedule a kickoff meeting with all stakeholders',
    'Prepare initial requirements document',
    'Identify potential risks and mitigation strategies'
  ],
  'Review': [
    'Review technical architecture with engineering team',
    'Schedule stakeholder review meetings',
    'Update risk register with newly identified risks'
  ],
  'Planning': [
    'Break down requirements into smaller tasks',
    'Create detailed project timeline',
    'Assign resources to specific tasks'
  ],
  'Implementation': [
    'Set up regular progress check-ins',
    'Create testing plan and scenarios',
    'Schedule code reviews at key milestones'
  ],
  'Deployment': [
    'Create deployment timeline with clear rollback points',
    'Prepare user training materials',
    'Set up monitoring for the deployment'
  ],
  'Evaluation': [
    'Gather user feedback through surveys',
    'Review performance metrics against targets',
    'Document lessons learned for future projects'
  ]
};

// Phase transition validation rules
const phaseValidationRules = {
  'Initiation_Review': ['init1', 'init2', 'init3'],
  'Review_Planning': ['rev1', 'rev2', 'rev3'],
  'Planning_Implementation': ['plan1', 'plan2', 'plan3'],
  'Implementation_Deployment': ['impl1', 'impl2', 'impl3'],
  'Deployment_Evaluation': ['dep1', 'dep2', 'dep3'],
  'Evaluation_Complete': ['eval1', 'eval2', 'eval3']
};

/**
 * Get the checklist items for a specific phase
 * @param {string} phaseName - Name of the phase
 * @returns {Array} Array of checklist items
 */
exports.getPhaseChecklist = (phaseName) => {
  return phaseChecklists[phaseName] || [];
};

/**
 * Get recommended next steps for a specific phase
 * @param {string} phaseName - Name of the phase
 * @returns {Array} Array of recommended next steps
 */
exports.getRecommendedNextSteps = (phaseName) => {
  return recommendedNextSteps[phaseName] || [];
};

/**
 * Validate phase transition based on required checklist items
 * @param {string} fromPhaseName - Source phase name
 * @param {string} toPhaseName - Destination phase name
 * @param {Array} completedItems - Array of completed checklist item IDs
 * @returns {Object} Validation result with success flag and missing items
 */
exports.validatePhaseTransition = (fromPhaseName, toPhaseName, completedItems = []) => {
  const transitionKey = `${fromPhaseName}_${toPhaseName}`;
  const requiredItems = phaseValidationRules[transitionKey] || [];
  
  if (requiredItems.length === 0) {
    return { success: true, missingItems: [] };
  }
  
  const missingItems = requiredItems.filter(item => !completedItems.includes(item));
  
  return {
    success: missingItems.length === 0,
    missingItems: missingItems
  };
};

/**
 * Get historical data for similar BCRs
 * @param {string} currentPhase - Current phase name
 * @param {Array} tags - BCR tags or categories
 * @returns {Object} Historical metrics and insights
 */
exports.getHistoricalInsights = async (currentPhase, tags = []) => {
  try {
    // This would typically query a database for historical BCR data
    // For now, we'll return mock data
    return {
      averageDuration: {
        days: 14,
        description: 'Average time to complete this phase'
      },
      commonIssues: [
        'Missing stakeholder sign-off',
        'Incomplete requirements',
        'Resource constraints'
      ],
      successFactors: [
        'Regular status updates',
        'Clear documentation',
        'Early stakeholder engagement'
      ]
    };
  } catch (error) {
    console.error('Error fetching historical insights:', error);
    return {
      averageDuration: { days: 0, description: 'Not available' },
      commonIssues: [],
      successFactors: []
    };
  }
};
