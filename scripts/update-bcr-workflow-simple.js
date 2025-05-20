/**
 * Script to update BCR workflow phases and statuses in the database
 * This ensures that the phases match the latest BCR workflow structure
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBcrWorkflowPhases() {
  console.log('Starting BCR workflow phases update...');
  
  try {
    // First, delete existing phase and status records to avoid duplicates
    console.log('Removing existing phase and status records...');
    await prisma.BcrConfigs.deleteMany({
      where: {
        OR: [
          { type: 'phase' },
          { type: 'status' }
        ]
      }
    });
    
    console.log('Creating new phase and status records...');
    
    // Helper function to generate UUID
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    // Current timestamp for createdAt and updatedAt fields
    const now = new Date();
    
    // Define the new phases with IDs
    const phases = [
      // Submission & Initial Review
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Complete and Submit BCR form',
        value: '1',
        displayOrder: 10,
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Collate, initial review and Prioritize BCR',
        value: '2',
        displayOrder: 20,
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Create BCR Trello card',
        value: '3',
        displayOrder: 30,
        createdAt: now,
        updatedAt: now
      },
      
      // Review & Approval
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Review and analyse BCR (All Profession)',
        value: '4',
        displayOrder: 40,
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'BCR Governance Playback',
        value: '5',
        displayOrder: 50,
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Conduct Stakeholder Consultation',
        value: '6',
        displayOrder: 60,
        createdAt: now,
        updatedAt: now
      },
      
      // Requirements Documentation
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Document Draft Business change requirements',
        value: '7',
        displayOrder: 70,
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Document Draft Business change version requirements',
        value: '8',
        displayOrder: 80,
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Document Draft Business change version communication requirements',
        value: '9',
        displayOrder: 90,
        createdAt: now,
        updatedAt: now
      },
      
      // Implementation & Release
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Approve Business Change Requirements',
        value: '10',
        displayOrder: 100,
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Implement Business Change Requirement(s)',
        value: '11',
        displayOrder: 110,
        createdAt: now,
        updatedAt: now
      },
      
      // Release Management
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Release to Staging Environment',
        value: '12',
        displayOrder: 120,
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Release to Pre-Production Environment',
        value: '13',
        displayOrder: 130,
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Release to Production Environment',
        value: '14',
        displayOrder: 140,
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Define the new statuses with IDs
    const statuses = [
      // Phase 1 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'New Submission',
        value: 'new_submission',
        displayOrder: 10,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 2 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'BCR Prioritized',
        value: 'bcr_prioritized',
        displayOrder: 20,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 3 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'BCR Trello card Created',
        value: 'bcr_trello_card_created',
        displayOrder: 30,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 4 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'BCR Reviewed',
        value: 'bcr_reviewed',
        displayOrder: 40,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 5 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'BCR Approved',
        value: 'bcr_approved',
        displayOrder: 50,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 6 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Stakeholders Consulted',
        value: 'stakeholders_consulted',
        displayOrder: 60,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 7 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Business Change Requirements Documented',
        value: 'business_change_requirements_documented',
        displayOrder: 70,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 8 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Version requirements documented',
        value: 'version_requirements_documented',
        displayOrder: 80,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 9 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Version communication requirements documented',
        value: 'version_communication_requirements_documented',
        displayOrder: 90,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 10 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Business Change Requirements Approved',
        value: 'business_change_requirements_approved',
        displayOrder: 100,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 11 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Business change requirements implemented',
        value: 'business_change_requirements_implemented',
        displayOrder: 110,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 12 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Staging Release',
        value: 'staging_release',
        displayOrder: 120,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 13 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Pre-Production Release',
        value: 'pre_production_release',
        displayOrder: 130,
        createdAt: now,
        updatedAt: now
      },
      
      // Phase 14 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Production Release',
        value: 'production_release',
        displayOrder: 140,
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Create all phases
    console.log(`Creating ${phases.length} phases...`);
    for (const phase of phases) {
      await prisma.BcrConfigs.create({
        data: phase
      });
    }
    
    // Create all statuses
    console.log(`Creating ${statuses.length} statuses...`);
    for (const status of statuses) {
      await prisma.BcrConfigs.create({
        data: status
      });
    }
    
    console.log('BCR workflow phases and statuses updated successfully!');
  } catch (error) {
    console.error('Error updating BCR workflow phases:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updateBcrWorkflowPhases();
