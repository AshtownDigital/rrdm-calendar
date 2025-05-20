/**
 * Seed script to populate BCR Workflow Phases and Statuses
 * 
 * This script populates the database with the BCR workflow phases and statuses
 * according to the BPMN process diagram.
 * 
 * Usage: node seeders/populate-bcr-workflow.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

// Define phases based on the BPMN diagram
const phases = [
  {
    id: 1,
    name: 'Submission',
    description: 'Initial submission of the BCR',
    displayOrder: 10,
    allowedActions: ['view', 'edit', 'delete']
  },
  {
    id: 2,
    name: 'Initial Assessment',
    description: 'First evaluation of the BCR to determine if it is valid',
    displayOrder: 20,
    allowedActions: ['view', 'update-status']
  },
  {
    id: 3,
    name: 'Detailed Analysis',
    description: 'In-depth examination of the change request',
    displayOrder: 30,
    allowedActions: ['view', 'update-status']
  },
  {
    id: 4,
    name: 'Stakeholder Consultation',
    description: 'Gathering input from affected parties',
    displayOrder: 40,
    allowedActions: ['view', 'update-status']
  },
  {
    id: 5,
    name: 'Implementation Planning',
    description: 'Creating a plan for the change',
    displayOrder: 50,
    allowedActions: ['view', 'update-status']
  },
  {
    id: 6,
    name: 'Approval Process',
    description: 'Formal review and approval workflow',
    displayOrder: 60,
    allowedActions: ['view', 'update-status', 'approve', 'reject']
  },
  {
    id: 7,
    name: 'Implementation',
    description: 'Executing the change',
    displayOrder: 70,
    allowedActions: ['view', 'update-status']
  },
  {
    id: 8,
    name: 'Testing',
    description: 'Verifying the implementation',
    displayOrder: 80,
    allowedActions: ['view', 'update-status']
  },
  {
    id: 9,
    name: 'Go Live',
    description: 'Deploying the change to production',
    displayOrder: 90,
    allowedActions: ['view', 'update-status']
  },
  {
    id: 10,
    name: 'Post-Implementation Review',
    description: 'Evaluating the implementation success',
    displayOrder: 100,
    allowedActions: ['view', 'update-status']
  },
  {
    id: 11,
    name: 'Closure',
    description: 'Successful completion of the BCR process',
    displayOrder: 110,
    allowedActions: ['view']
  }
];

// Define statuses based on the BPMN diagram
const statuses = [
  // Submission statuses
  {
    name: 'Submission Received',
    description: 'BCR has been submitted',
    phaseId: 1,
    type: 'in_progress',
    displayOrder: 10
  },
  {
    name: 'Submission Complete',
    description: 'Submission phase is complete',
    phaseId: 1,
    type: 'completed',
    displayOrder: 15
  },
  
  // Initial Assessment statuses
  {
    name: 'Under Initial Assessment',
    description: 'BCR is being assessed for completeness and validity',
    phaseId: 2,
    type: 'in_progress',
    displayOrder: 20
  },
  {
    name: 'Additional Information Requested',
    description: 'More information is needed from the submitter',
    phaseId: 2,
    type: 'in_progress',
    displayOrder: 25
  },
  {
    name: 'Initial Assessment Complete',
    description: 'Initial assessment phase is complete',
    phaseId: 2,
    type: 'completed',
    displayOrder: 30
  },
  
  // Detailed Analysis statuses
  {
    name: 'Under Analysis',
    description: 'BCR is being analyzed in detail',
    phaseId: 3,
    type: 'in_progress',
    displayOrder: 40
  },
  {
    name: 'Analysis Complete',
    description: 'Detailed analysis phase is complete',
    phaseId: 3,
    type: 'completed',
    displayOrder: 50
  },
  
  // Stakeholder Consultation statuses
  {
    name: 'Under Consultation',
    description: 'Stakeholders are being consulted',
    phaseId: 4,
    type: 'in_progress',
    displayOrder: 60
  },
  {
    name: 'Consultation Complete',
    description: 'Stakeholder consultation phase is complete',
    phaseId: 4,
    type: 'completed',
    displayOrder: 70
  },
  
  // Implementation Planning statuses
  {
    name: 'Planning In Progress',
    description: 'Implementation plan is being created',
    phaseId: 5,
    type: 'in_progress',
    displayOrder: 80
  },
  {
    name: 'Planning Complete',
    description: 'Implementation planning phase is complete',
    phaseId: 5,
    type: 'completed',
    displayOrder: 90
  },
  
  // Approval Process statuses
  {
    name: 'Awaiting Approval',
    description: 'BCR is waiting for approval',
    phaseId: 6,
    type: 'in_progress',
    displayOrder: 100
  },
  {
    name: 'Approved',
    description: 'BCR has been approved',
    phaseId: 6,
    type: 'completed',
    displayOrder: 110
  },
  {
    name: 'Rejected',
    description: 'BCR has been rejected',
    phaseId: 6,
    type: 'rejected',
    displayOrder: 120
  },
  
  // Implementation statuses
  {
    name: 'Implementation In Progress',
    description: 'Changes are being implemented',
    phaseId: 7,
    type: 'in_progress',
    displayOrder: 130
  },
  {
    name: 'Implementation Complete',
    description: 'Implementation phase is complete',
    phaseId: 7,
    type: 'completed',
    displayOrder: 140
  },
  
  // Testing statuses
  {
    name: 'Testing In Progress',
    description: 'Changes are being tested',
    phaseId: 8,
    type: 'in_progress',
    displayOrder: 150
  },
  {
    name: 'Testing Failed',
    description: 'Testing has failed, implementation needs fixes',
    phaseId: 8,
    type: 'in_progress',
    displayOrder: 155
  },
  {
    name: 'Testing Complete',
    description: 'Testing phase is complete',
    phaseId: 8,
    type: 'completed',
    displayOrder: 160
  },
  
  // Go Live statuses
  {
    name: 'Go-Live In Progress',
    description: 'Changes are being deployed to production',
    phaseId: 9,
    type: 'in_progress',
    displayOrder: 170
  },
  {
    name: 'Go-Live Complete',
    description: 'Go-Live phase is complete',
    phaseId: 9,
    type: 'completed',
    displayOrder: 180
  },
  
  // Post-Implementation Review statuses
  {
    name: 'PIR In Progress',
    description: 'Post-implementation review is being conducted',
    phaseId: 10,
    type: 'in_progress',
    displayOrder: 190
  },
  {
    name: 'PIR Complete',
    description: 'Post-implementation review phase is complete',
    phaseId: 10,
    type: 'completed',
    displayOrder: 200
  },
  
  // Closure statuses
  {
    name: 'Closed',
    description: 'BCR process is complete and closed',
    phaseId: 11,
    type: 'in_progress',
    displayOrder: 210
  }
];

// Phase transitions based on the BPMN diagram
const phaseTransitions = [
  { fromPhaseId: 1, toPhaseId: 2, condition: 'automatic' },
  { fromPhaseId: 2, toPhaseId: 3, condition: 'valid_bcr' },
  { fromPhaseId: 3, toPhaseId: 4, condition: 'automatic' },
  { fromPhaseId: 4, toPhaseId: 5, condition: 'automatic' },
  { fromPhaseId: 5, toPhaseId: 6, condition: 'approval_required' },
  { fromPhaseId: 5, toPhaseId: 7, condition: 'no_approval_required' },
  { fromPhaseId: 6, toPhaseId: 7, condition: 'approved' },
  { fromPhaseId: 7, toPhaseId: 8, condition: 'automatic' },
  { fromPhaseId: 8, toPhaseId: 7, condition: 'testing_failed' },
  { fromPhaseId: 8, toPhaseId: 9, condition: 'testing_passed' },
  { fromPhaseId: 9, toPhaseId: 10, condition: 'automatic' },
  { fromPhaseId: 10, toPhaseId: 11, condition: 'automatic' }
];

/**
 * Seed the BCR workflow phases and statuses
 */
async function seedBcrWorkflow() {
  console.log('Starting to seed BCR workflow phases and statuses...');
  
  try {
    // Clear existing phases and statuses if needed
    console.log('Checking for existing phases and statuses...');
    
    const existingPhases = await prisma.bcrConfigs.findMany({
      where: {
        type: 'phase'
      }
    });
    
    const existingStatuses = await prisma.bcrConfigs.findMany({
      where: {
        type: 'status'
      }
    });
    
    // Ask for confirmation if there are existing phases or statuses
    if (existingPhases.length > 0 || existingStatuses.length > 0) {
      console.log(`Found ${existingPhases.length} existing phases and ${existingStatuses.length} existing statuses.`);
      console.log('Updating existing data...');
      
      // Update existing phases
      for (const phase of phases) {
        const existingPhase = existingPhases.find(p => p.value === phase.id.toString());
        
        if (existingPhase) {
          console.log(`Updating existing phase: ${phase.name}`);
          
          await prisma.bcrConfigs.update({
            where: { id: existingPhase.id },
            data: {
              name: phase.name,
              // Store description in the value field as JSON if needed
            value: JSON.stringify({
              id: phase.id,
              description: phase.description
            }),
              displayOrder: phase.displayOrder
            }
          });
        } else {
          console.log(`Creating new phase: ${phase.name}`);
          
          await prisma.bcrConfigs.create({
            data: {
              id: uuidv4(),
              type: 'phase',
              name: phase.name,
              value: phase.id.toString(),
              // Store description in the value field as JSON if needed
            value: JSON.stringify({
              id: phase.id,
              description: phase.description
            }),
              displayOrder: phase.displayOrder,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      }
      
      // Update existing statuses
      for (const status of statuses) {
        const existingStatus = existingStatuses.find(s => s.name === status.name);
        
        if (existingStatus) {
          console.log(`Updating existing status: ${status.name}`);
          
          await prisma.bcrConfigs.update({
            where: { id: existingStatus.id },
            data: {
              // Store description in the value field as JSON if needed
            value: JSON.stringify({
              phaseId: status.phaseId,
              description: status.description,
              type: status.type
            }),
              value: status.phaseId.toString(),
              displayOrder: status.displayOrder
            }
          });
        } else {
          console.log(`Creating new status: ${status.name}`);
          
          await prisma.bcrConfigs.create({
            data: {
              id: uuidv4(),
              type: 'status',
              name: status.name,
              value: status.phaseId.toString(),
              // Store description in the value field as JSON if needed
            value: JSON.stringify({
              phaseId: status.phaseId,
              description: status.description,
              type: status.type
            }),
              displayOrder: status.displayOrder,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      }
    } else {
      console.log('No existing phases or statuses found. Creating all from scratch...');
      
      // Create all phases
      for (const phase of phases) {
        console.log(`Creating phase: ${phase.name}`);
        
        await prisma.bcrConfigs.create({
          data: {
            id: uuidv4(),
            type: 'phase',
            name: phase.name,
            // Store all data in the value field as JSON
            value: JSON.stringify({
              id: phase.id,
              description: phase.description
            }),
            displayOrder: phase.displayOrder,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      
      // Create all statuses
      for (const status of statuses) {
        console.log(`Creating status: ${status.name}`);
        
        await prisma.bcrConfigs.create({
          data: {
            id: uuidv4(),
            type: 'status',
            name: status.name,
            // Store all data in the value field as JSON
            value: JSON.stringify({
              phaseId: status.phaseId,
              description: status.description,
              type: status.type
            }),
            displayOrder: status.displayOrder,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }
    
    // Create phase-status mappings
    console.log('Creating phase-status mappings...');
    
    // First, clear existing mappings
    await prisma.bcrConfigs.deleteMany({
      where: {
        type: {
          in: ['phase_inProgressStatus', 'phase_completedStatus']
        }
      }
    });
    
    // Create in-progress status mappings
    for (const status of statuses) {
      if (status.type === 'in_progress') {
        const phaseId = status.phaseId;
        const phase = phases.find(p => p.id === phaseId);
        
        if (phase) {
          console.log(`Mapping in-progress status "${status.name}" to phase "${phase.name}"`);
          
          await prisma.bcrConfigs.create({
            data: {
              id: uuidv4(),
              type: 'phase_inProgressStatus',
              name: `phase${phaseId}_inProgressStatus`,
              value: status.name,
              // No description field in schema
              displayOrder: status.displayOrder,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      }
    }
    
    // Create completed status mappings
    for (const status of statuses) {
      if (status.type === 'completed') {
        const phaseId = status.phaseId;
        const phase = phases.find(p => p.id === phaseId);
        
        if (phase) {
          console.log(`Mapping completed status "${status.name}" to phase "${phase.name}"`);
          
          await prisma.bcrConfigs.create({
            data: {
              id: uuidv4(),
              type: 'phase_completedStatus',
              name: `phase${phaseId}_completedStatus`,
              value: status.name,
              // No description field in schema
              displayOrder: status.displayOrder,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      }
    }
    
    // Create phase transitions
    console.log('Creating phase transitions...');
    
    // First, clear existing transitions
    await prisma.bcrConfigs.deleteMany({
      where: {
        type: 'phase_transition'
      }
    });
    
    // Create new transitions
    for (const transition of phaseTransitions) {
      const fromPhase = phases.find(p => p.id === transition.fromPhaseId);
      const toPhase = phases.find(p => p.id === transition.toPhaseId);
      
      if (fromPhase && toPhase) {
        console.log(`Creating transition from "${fromPhase.name}" to "${toPhase.name}"`);
        
        await prisma.bcrConfigs.create({
          data: {
            id: uuidv4(),
            type: 'phase_transition',
            name: `phase${transition.fromPhaseId}_to_phase${transition.toPhaseId}`,
            value: JSON.stringify({
              fromPhaseId: transition.fromPhaseId,
              toPhaseId: transition.toPhaseId,
              condition: transition.condition
            }),
            // No description field in schema
            displayOrder: transition.fromPhaseId * 100 + transition.toPhaseId,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }
    
    console.log('BCR workflow seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding BCR workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedBcrWorkflow()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
