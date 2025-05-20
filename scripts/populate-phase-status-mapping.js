/**
 * Script to populate the BCR Phase-Status mapping in the database
 * This script creates the necessary phase and status configurations in the BcrConfigs table
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

// Workflow phases and status mapping based on the updated form model
const phaseStatusMapping = [
  {
    phase: {
      name: 'Submission',
      value: '1',
      displayOrder: 10,
      description: 'Initial submission of the BCR'
    },
    inProgressStatus: 'Being Submitted',
    completedStatus: 'Submitted',
    trelloList: 'Submitted'
  },
  {
    phase: {
      name: 'Prioritisation',
      value: '2',
      displayOrder: 20,
      description: 'Prioritising the BCR for processing'
    },
    inProgressStatus: 'Being Prioritised',
    completedStatus: 'Prioritised',
    trelloList: 'Triaged'
  },
  {
    phase: {
      name: 'Technical Review and Analysis',
      value: '3',
      displayOrder: 30,
      description: 'Technical review and analysis of the BCR'
    },
    inProgressStatus: 'Under Technical Review',
    completedStatus: 'Technical Review Complete',
    trelloList: 'In Review'
  },
  {
    phase: {
      name: 'Governance Playback',
      value: '4',
      displayOrder: 40,
      description: 'Governance review of the BCR'
    },
    inProgressStatus: 'In Governance Review',
    completedStatus: 'Governance Approved',
    trelloList: 'Governance Review'
  },
  {
    phase: {
      name: 'Stakeholder Consultation',
      value: '5',
      displayOrder: 50,
      description: 'Consultation with stakeholders'
    },
    inProgressStatus: 'Consulting Stakeholders',
    completedStatus: 'Stakeholders Consulted',
    trelloList: 'Stakeholder Review'
  },
  {
    phase: {
      name: 'Final Drafting',
      value: '6',
      displayOrder: 60,
      description: 'Final drafting of the BCR'
    },
    inProgressStatus: 'Drafting In Progress',
    completedStatus: 'Draft Completed',
    trelloList: 'Drafting'
  },
  {
    phase: {
      name: 'Final Approval',
      value: '7',
      displayOrder: 70,
      description: 'Final approval of the BCR'
    },
    inProgressStatus: 'Awaiting Final Approval',
    completedStatus: 'Final Approval Granted',
    trelloList: 'Approved / Rejected'
  },
  {
    phase: {
      name: 'Implementation',
      value: '8',
      displayOrder: 80,
      description: 'Implementation of the BCR'
    },
    inProgressStatus: 'Being Implemented',
    completedStatus: 'Implementation Complete',
    trelloList: 'Implementation'
  },
  {
    phase: {
      name: 'Validation & Testing',
      value: '9',
      displayOrder: 90,
      description: 'Validation and testing of the BCR implementation'
    },
    inProgressStatus: 'Testing In Progress',
    completedStatus: 'Testing Passed',
    trelloList: 'Testing'
  },
  {
    phase: {
      name: 'Go Live',
      value: '10',
      displayOrder: 100,
      description: 'Go live with the BCR implementation'
    },
    inProgressStatus: 'Preparing for Go Live',
    completedStatus: 'Gone Live',
    trelloList: 'Go Live'
  },
  {
    phase: {
      name: 'Post-Implementation Review',
      value: '11',
      displayOrder: 110,
      description: 'Post-implementation review of the BCR'
    },
    inProgressStatus: 'Under Post-Implementation Review',
    completedStatus: 'Review Completed',
    trelloList: 'Completed'
  },
  {
    phase: {
      name: 'Closed',
      value: '12',
      displayOrder: 120,
      description: 'BCR is closed'
    },
    inProgressStatus: 'Closing',
    completedStatus: 'Closed',
    trelloList: 'Archived / Closed'
  }
];

/**
 * Create a phase configuration in the database
 * @param {Object} phase - Phase configuration
 * @returns {Promise<Object>} - Created phase
 */
async function createPhase(phase) {
  const now = new Date();
  // Create the main phase entry
  const phaseConfig = await prisma.bcrConfigs.create({
    data: {
      id: uuidv4(),
      type: 'phase',
      name: phase.name, // Workflow Phase Name
      value: phase.value,
      displayOrder: phase.displayOrder,
      createdAt: now,
      updatedAt: now
    }
  });
  
  // Create a separate entry for the description
  await prisma.bcrConfigs.create({
    data: {
      id: uuidv4(),
      type: 'phase_description',
      name: `description:${phase.value}`,
      value: phase.description,
      displayOrder: phase.displayOrder,
      createdAt: now,
      updatedAt: now
    }
  });
  
  return phaseConfig;
}

/**
 * Create a status configuration in the database
 * @param {Object} status - Status configuration
 * @returns {Promise<Object>} - Created status
 */
async function createStatus(status) {
  const now = new Date();
  // Create the main status entry
  const statusConfig = await prisma.bcrConfigs.create({
    data: {
      id: uuidv4(),
      type: 'status',
      name: status.name, // In Progress Status or Completed Status
      value: status.phaseValue, // Link to the phase
      displayOrder: status.displayOrder,
      createdAt: now,
      updatedAt: now
    }
  });
  
  // Create a separate entry for the description
  await prisma.bcrConfigs.create({
    data: {
      id: uuidv4(),
      type: 'status_description',
      name: `description:${status.name}`,
      value: status.description,
      displayOrder: status.displayOrder,
      createdAt: now,
      updatedAt: now
    }
  });
  
  return statusConfig;
}

/**
 * Populate the database with phase and status configurations
 */
async function populatePhaseStatusMapping() {
  try {
    console.log('Starting to populate phase-status mapping...');
    
    // First, clear existing phase and status configurations
    console.log('Clearing existing phase and status configurations...');
    await prisma.bcrConfigs.deleteMany({
      where: {
        type: {
          in: ['phase', 'status', 'phase_description', 'status_description', 'trello_list_mapping', 'trello_list_description']
        }
      }
    });
    
    // Create phases
    console.log('Creating phases...');
    for (const mapping of phaseStatusMapping) {
      await createPhase(mapping.phase);
    }
    
    // Create statuses
    console.log('Creating statuses...');
    let statusDisplayOrder = 10;
    for (const mapping of phaseStatusMapping) {
      // Create in progress status
      await createStatus({
        name: mapping.inProgressStatus,
        phaseValue: mapping.phase.value,
        displayOrder: statusDisplayOrder,
        description: `In progress status for phase: ${mapping.phase.name}`
      });
      statusDisplayOrder += 10;
      
      // Create completed status
      await createStatus({
        name: mapping.completedStatus,
        phaseValue: mapping.phase.value,
        displayOrder: statusDisplayOrder,
        description: `Completed status for phase: ${mapping.phase.name}`
      });
      statusDisplayOrder += 10;
    }
    
    // Create a mapping for Trello statuses
    console.log('Creating Trello status mapping...');
    const now = new Date();
    for (const mapping of phaseStatusMapping) {
      // Create the main Trello mapping entry
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'trello_list_mapping',
          name: mapping.trelloList, // Trello Status Name
          value: mapping.phase.value,
          displayOrder: parseInt(mapping.phase.value, 10) * 10,
          createdAt: now,
          updatedAt: now
        }
      });
      
      // Create a separate entry for the description
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'trello_list_description',
          name: `description:${mapping.trelloList}`,
          value: `Trello status for phase: ${mapping.phase.name}`,
          displayOrder: parseInt(mapping.phase.value, 10) * 10,
          createdAt: now,
          updatedAt: now
        }
      });
    }
    
    console.log('Phase-status mapping populated successfully!');
  } catch (error) {
    console.error('Error populating phase-status mapping:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populatePhaseStatusMapping();
