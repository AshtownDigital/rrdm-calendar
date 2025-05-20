/**
 * Script to update the BCR Phase-Status mapping in the database
 * This script updates the In Progress statuses in the BcrConfigs table
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
    inProgressStatus: 'New Submission',
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
 * Update or create a status configuration in the database
 * @param {Object} status - Status configuration
 * @returns {Promise<Object>} - Updated or created status
 */
async function updateOrCreateStatus(status) {
  const now = new Date();
  
  // Check if status already exists
  const existingStatus = await prisma.bcrConfigs.findFirst({
    where: {
      type: 'status',
      value: status.phaseValue,
      name: { not: { startsWith: 'completed:' } }
    }
  });
  
  if (existingStatus) {
    // Update existing status
    console.log(`Updating status: ${status.name} for phase ${status.phaseValue}`);
    const updatedStatus = await prisma.bcrConfigs.update({
      where: { id: existingStatus.id },
      data: {
        name: status.name,
        updatedAt: now
      }
    });
    
    // Update description if it exists
    const existingDescription = await prisma.bcrConfigs.findFirst({
      where: {
        type: 'status_description',
        name: `description:${existingStatus.name}`
      }
    });
    
    if (existingDescription) {
      await prisma.bcrConfigs.update({
        where: { id: existingDescription.id },
        data: {
          name: `description:${status.name}`,
          value: status.description,
          updatedAt: now
        }
      });
    } else {
      // Create description if it doesn't exist
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
    }
    
    return updatedStatus;
  } else {
    // Create new status
    console.log(`Creating new status: ${status.name} for phase ${status.phaseValue}`);
    const statusConfig = await prisma.bcrConfigs.create({
      data: {
        id: uuidv4(),
        type: 'status',
        name: status.name,
        value: status.phaseValue,
        displayOrder: status.displayOrder,
        createdAt: now,
        updatedAt: now
      }
    });
    
    // Create description
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
}

/**
 * Update the database with In Progress statuses
 */
async function updateInProgressStatuses() {
  try {
    console.log('Starting to update In Progress statuses...');
    
    // Update In Progress statuses
    console.log('Updating In Progress statuses...');
    let statusDisplayOrder = 10;
    for (const mapping of phaseStatusMapping) {
      // Update or create In Progress status
      await updateOrCreateStatus({
        name: mapping.inProgressStatus,
        phaseValue: mapping.phase.value,
        displayOrder: statusDisplayOrder,
        description: `In progress status for phase: ${mapping.phase.name}`
      });
      statusDisplayOrder += 20; // Skip 10 for completed status
    }
    
    console.log('In Progress statuses updated successfully!');
  } catch (error) {
    console.error('Error updating In Progress statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateInProgressStatuses();
