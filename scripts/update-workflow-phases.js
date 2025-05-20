// Script to update workflow phases with the new structure
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const workflowPhases = [
  { order: 1,  name: 'Complete and Submit BCR form', currentStatus: 'New Submission', completedStatus: 'completed:submission' },
  { order: 2,  name: 'Collate, initial review and Prioritize BCR', currentStatus: 'BCR Prioritized', completedStatus: 'completed:prioritisation' },
  { order: 3,  name: 'Create BCR Trello card', currentStatus: 'BCR Trello card Created', completedStatus: 'completed:trello_created' },
  { order: 4,  name: 'Review and analyse BCR (All Profession)', currentStatus: 'BCR Reviewed', completedStatus: 'completed:review' },
  { order: 5,  name: 'BCR Governance Playback', currentStatus: 'BCR Approved', completedStatus: 'completed:governance' },
  { order: 6,  name: 'Conduct Stakeholder Consultation', currentStatus: 'Stakeholders Consulted', completedStatus: 'completed:stakeholder' },
  { order: 7,  name: 'Document Draft Business change requirements', currentStatus: 'Business Change Requirements Documented', completedStatus: 'completed:requirements' },
  { order: 8,  name: 'Document Draft Business change version requirements', currentStatus: 'Version requirements documented', completedStatus: 'completed:version_requirements' },
  { order: 9,  name: 'Document Draft Business change version communication requirements', currentStatus: 'Version communication requirements documented', completedStatus: 'completed:communication_requirements' },
  { order: 10, name: 'Approve Business Change Requirements', currentStatus: 'Business Change Requirements Approved', completedStatus: 'completed:approval' },
  { order: 11, name: 'Implement Business Change Requirement(s)', currentStatus: 'Business change requirements implemented', completedStatus: 'completed:implementation' },
  { order: 12, name: 'Release to Staging Environment', currentStatus: 'Staging Release', completedStatus: 'completed:staging' },
  { order: 13, name: 'Release to Pre-Production Environment', currentStatus: 'Pre-Production Release', completedStatus: 'completed:preprod' },
  { order: 14, name: 'Release to Production Environment', currentStatus: 'Production Release', completedStatus: 'completed:production' }
];

async function main() {
  try {
    console.log('Deleting existing workflow phases...');
    // First delete all existing workflow phases
    await prisma.workflowPhase.deleteMany({});
    
    console.log('Creating new workflow phases...');
    // Then create the new workflow phases
    for (const phase of workflowPhases) {
      await prisma.workflowPhase.create({
        data: {
          order: phase.order,
          name: phase.name,
          currentStatus: phase.currentStatus,
          completedStatus: phase.completedStatus
        }
      });
      console.log(`Created phase: ${phase.name}`);
    }
    
    console.log('Workflow phases updated successfully!');
  } catch (error) {
    console.error('Error updating workflow phases:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
