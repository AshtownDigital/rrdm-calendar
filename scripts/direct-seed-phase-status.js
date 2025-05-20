/**
 * Script to directly seed the BCR Phase-Status mapping in the database
 * This script creates phases and statuses with a simpler approach
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

// Define the phases and their associated statuses
const phaseData = [
  {
    name: 'Submission',
    value: '1',
    displayOrder: 10,
    inProgressStatus: 'Being Submitted',
    completedStatus: 'Submitted',
    trelloList: 'Submitted'
  },
  {
    name: 'Prioritisation',
    value: '2',
    displayOrder: 20,
    inProgressStatus: 'Being Prioritised',
    completedStatus: 'Prioritised',
    trelloList: 'Triaged'
  },
  {
    name: 'Technical Review and Analysis',
    value: '3',
    displayOrder: 30,
    inProgressStatus: 'Under Technical Review',
    completedStatus: 'Technical Review Complete',
    trelloList: 'In Review'
  },
  {
    name: 'Governance Playback',
    value: '4',
    displayOrder: 40,
    inProgressStatus: 'In Governance Review',
    completedStatus: 'Governance Approved',
    trelloList: 'Governance Review'
  },
  {
    name: 'Stakeholder Consultation',
    value: '5',
    displayOrder: 50,
    inProgressStatus: 'Consulting Stakeholders',
    completedStatus: 'Stakeholders Consulted',
    trelloList: 'Stakeholder Review'
  },
  {
    name: 'Final Drafting',
    value: '6',
    displayOrder: 60,
    inProgressStatus: 'Drafting In Progress',
    completedStatus: 'Draft Completed',
    trelloList: 'Drafting'
  },
  {
    name: 'Final Approval',
    value: '7',
    displayOrder: 70,
    inProgressStatus: 'Awaiting Final Approval',
    completedStatus: 'Final Approval Granted',
    trelloList: 'Approved / Rejected'
  },
  {
    name: 'Implementation',
    value: '8',
    displayOrder: 80,
    inProgressStatus: 'Being Implemented',
    completedStatus: 'Implementation Complete',
    trelloList: 'Implementation'
  },
  {
    name: 'Validation & Testing',
    value: '9',
    displayOrder: 90,
    inProgressStatus: 'Testing In Progress',
    completedStatus: 'Testing Passed',
    trelloList: 'Testing'
  },
  {
    name: 'Go Live',
    value: '10',
    displayOrder: 100,
    inProgressStatus: 'Preparing for Go Live',
    completedStatus: 'Gone Live',
    trelloList: 'Go Live'
  },
  {
    name: 'Post-Implementation Review',
    value: '11',
    displayOrder: 110,
    inProgressStatus: 'Under Post-Implementation Review',
    completedStatus: 'Review Completed',
    trelloList: 'Completed'
  },
  {
    name: 'Closed',
    value: '12',
    displayOrder: 120,
    inProgressStatus: 'Closing',
    completedStatus: 'Closed',
    trelloList: 'Archived / Closed'
  }
];

/**
 * Seed the database with phase and status data
 */
async function seedPhaseStatusData() {
  try {
    console.log('Starting direct seeding of phase-status data...');
    
    // First, clear existing data
    console.log('Clearing existing phase and status configurations...');
    await prisma.bcrConfigs.deleteMany({
      where: {
        type: {
          in: ['phase', 'status', 'trello_list_mapping']
        }
      }
    });
    
    console.log('Creating phases and statuses...');
    
    // Create each phase and its associated statuses
    for (const phase of phaseData) {
      // Create the phase
      const phaseId = uuidv4();
      await prisma.bcrConfigs.create({
        data: {
          id: phaseId,
          type: 'phase',
          name: phase.name,
          value: phase.value,
          displayOrder: phase.displayOrder,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Create the in progress status
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'status',
          name: phase.inProgressStatus,
          value: phaseId, // Link directly to the phase ID
          displayOrder: phase.displayOrder * 10,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Create the completed status
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'status',
          name: phase.completedStatus,
          value: phaseId, // Link directly to the phase ID
          displayOrder: phase.displayOrder * 10 + 5,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Create the Trello list mapping
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'trello_list_mapping',
          name: phase.trelloList,
          value: phase.value,
          displayOrder: phase.displayOrder,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    console.log('Phase-status data seeded successfully!');
  } catch (error) {
    console.error('Error seeding phase-status data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
seedPhaseStatusData();
