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
    
    // Define the new phases with IDs
    const phases = [
      // Submission & Initial Review
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Complete and Submit BCR form',
        value: '1',
        displayOrder: 10,
        metadata: { group: 'Submission & Initial Review', description: 'Initial submission of the business change request with all required information.' }
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Collate, initial review and Prioritize BCR',
        value: '2',
        displayOrder: 20,
        metadata: { group: 'Submission & Initial Review', description: 'Assessment of business value and priority of the change request.' }
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Create BCR Trello card',
        value: '3',
        displayOrder: 30,
        metadata: { group: 'Submission & Initial Review', description: 'Setup tracking in project management system for workflow visibility.' }
      },
      
      // Review & Approval
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Review and analyse BCR (All Profession)',
        value: '4',
        displayOrder: 40,
        metadata: { group: 'Review & Approval', description: 'Technical analysis and impact assessment by all professional teams.' }
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'BCR Governance Playback',
        value: '5',
        displayOrder: 50,
        metadata: { group: 'Review & Approval', description: 'Presentation to governance board for initial approval and feedback.' }
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Conduct Stakeholder Consultation',
        value: '6',
        displayOrder: 60,
        metadata: { group: 'Review & Approval', description: 'Gathering feedback from all parties who may be impacted by the change.' }
      },
      
      // Requirements Documentation
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Document Draft Business change requirements',
        value: '7',
        displayOrder: 70,
        metadata: { group: 'Requirements Documentation', description: 'Documentation of core business change requirements based on all feedback.' }
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Document Draft Business change version requirements',
        value: '8',
        displayOrder: 80,
        metadata: { group: 'Requirements Documentation', description: 'Documentation of version-specific requirements for implementation.' }
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Document Draft Business change version communication requirements',
        value: '9',
        displayOrder: 90,
        metadata: { group: 'Requirements Documentation', description: 'Planning the communication strategy for the business change.' }
      },
      
      // Implementation & Release
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Approve Business Change Requirements',
        value: '10',
        displayOrder: 100,
        metadata: { group: 'Implementation & Release', description: 'Final governance approval of the complete business change requirements.' }
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Implement Business Change Requirement(s)',
        value: '11',
        displayOrder: 110,
        metadata: { group: 'Implementation & Release', description: 'Development and implementation of the approved business change.' }
      },
      
      // Release Management
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Release to Staging Environment',
        value: '12',
        displayOrder: 120,
        metadata: { group: 'Release Management', description: 'Deployment to testing environment for validation and testing.' }
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Release to Pre-Production Environment',
        value: '13',
        displayOrder: 130,
        metadata: { group: 'Release Management', description: 'Deployment to pre-production environment for final validation.' }
      },
      {
        id: generateUUID(),
        type: 'phase',
        name: 'Release to Production Environment',
        value: '14',
        displayOrder: 140,
        metadata: { group: 'Release Management', description: 'Final deployment to production environment for end users.' }
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
        metadata: { phase: '1', isCompleted: false, isInProgress: true }
      },
      
      // Phase 2 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'BCR Prioritized',
        value: 'bcr_prioritized',
        displayOrder: 20,
        metadata: { phase: '2', isCompleted: false, isInProgress: true }
      },
      
      // Phase 3 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'BCR Trello card Created',
        value: 'bcr_trello_card_created',
        displayOrder: 30,
        metadata: { phase: '3', isCompleted: false, isInProgress: true }
      },
      
      // Phase 4 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'BCR Reviewed',
        value: 'bcr_reviewed',
        displayOrder: 40,
        metadata: { phase: '4', isCompleted: false, isInProgress: true }
      },
      
      // Phase 5 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'BCR Approved',
        value: 'bcr_approved',
        displayOrder: 50,
        metadata: { phase: '5', isCompleted: false, isInProgress: true }
      },
      
      // Phase 6 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Stakeholders Consulted',
        value: 'stakeholders_consulted',
        displayOrder: 60,
        metadata: { phase: '6', isCompleted: false, isInProgress: true }
      },
      
      // Phase 7 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Business Change Requirements Documented',
        value: 'business_change_requirements_documented',
        displayOrder: 70,
        metadata: { phase: '7', isCompleted: false, isInProgress: true }
      },
      
      // Phase 8 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Version requirements documented',
        value: 'version_requirements_documented',
        displayOrder: 80,
        metadata: { phase: '8', isCompleted: false, isInProgress: true }
      },
      
      // Phase 9 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Version communication requirements documented',
        value: 'version_communication_requirements_documented',
        displayOrder: 90,
        metadata: { phase: '9', isCompleted: false, isInProgress: true }
      },
      
      // Phase 10 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Business Change Requirements Approved',
        value: 'business_change_requirements_approved',
        displayOrder: 100,
        metadata: { phase: '10', isCompleted: false, isInProgress: true }
      },
      
      // Phase 11 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Business change requirements implemented',
        value: 'business_change_requirements_implemented',
        displayOrder: 110,
        metadata: { phase: '11', isCompleted: false, isInProgress: true }
      },
      
      // Phase 12 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Staging Release',
        value: 'staging_release',
        displayOrder: 120,
        metadata: { phase: '12', isCompleted: false, isInProgress: true }
      },
      
      // Phase 13 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Pre-Production Release',
        value: 'pre_production_release',
        displayOrder: 130,
        metadata: { phase: '13', isCompleted: false, isInProgress: true }
      },
      
      // Phase 14 status
      {
        id: generateUUID(),
        type: 'status',
        name: 'Production Release',
        value: 'production_release',
        displayOrder: 140,
        metadata: { phase: '14', isCompleted: false, isInProgress: true }
      },
      
      // Completed statuses for each phase
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 1 Completed',
        value: 'phase_1_completed',
        displayOrder: 15,
        metadata: { phase: '1', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 2 Completed',
        value: 'phase_2_completed',
        displayOrder: 25,
        metadata: { phase: '2', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 3 Completed',
        value: 'phase_3_completed',
        displayOrder: 35,
        metadata: { phase: '3', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 4 Completed',
        value: 'phase_4_completed',
        displayOrder: 45,
        metadata: { phase: '4', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 5 Completed',
        value: 'phase_5_completed',
        displayOrder: 55,
        metadata: { phase: '5', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 6 Completed',
        value: 'phase_6_completed',
        displayOrder: 65,
        metadata: { phase: '6', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 7 Completed',
        value: 'phase_7_completed',
        displayOrder: 75,
        metadata: { phase: '7', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 8 Completed',
        value: 'phase_8_completed',
        displayOrder: 85,
        metadata: { phase: '8', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 9 Completed',
        value: 'phase_9_completed',
        displayOrder: 95,
        metadata: { phase: '9', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 10 Completed',
        value: 'phase_10_completed',
        displayOrder: 105,
        metadata: { phase: '10', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 11 Completed',
        value: 'phase_11_completed',
        displayOrder: 115,
        metadata: { phase: '11', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 12 Completed',
        value: 'phase_12_completed',
        displayOrder: 125,
        metadata: { phase: '12', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 13 Completed',
        value: 'phase_13_completed',
        displayOrder: 135,
        metadata: { phase: '13', isCompleted: true, isInProgress: false }
      },
      {
        id: generateUUID(),
        type: 'status',
        name: 'Phase 14 Completed',
        value: 'phase_14_completed',
        displayOrder: 145,
        metadata: { phase: '14', isCompleted: true, isInProgress: false }
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
