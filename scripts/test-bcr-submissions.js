/**
 * Script to test the BCR submissions page directly
 * This bypasses the authentication by directly calling the controller
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrService = require('../services/bcrService');
const bcrConfigService = require('../services/bcrConfigService');

async function testBcrSubmissions() {
  try {
    console.log('=== BCR Submissions Test Script ===');
    
    // Step 1: Test database connection
    console.log('\n1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Step 2: Test BcrConfigs table
    console.log('\n2. Testing BcrConfigs table...');
    const configCount = await prisma.bcrConfigs.count();
    console.log(`Total BcrConfigs: ${configCount}`);
    
    // Step 3: Test Bcrs table
    console.log('\n3. Testing Bcrs table...');
    const bcrsCount = await prisma.bcrs.count();
    console.log(`Total BCRs: ${bcrsCount}`);
    
    // Step 4: Test bcrService.getAllBcrs
    console.log('\n4. Testing bcrService.getAllBcrs...');
    const bcrs = await bcrService.getAllBcrs();
    console.log(`Retrieved ${bcrs.length} BCRs from bcrService`);
    if (bcrs.length > 0) {
      console.log('Sample BCR:', {
        id: bcrs[0].id,
        title: bcrs[0].title,
        status: bcrs[0].status,
        bcrNumber: bcrs[0].bcrNumber
      });
    }
    
    // Step 5: Test bcrConfigService.getConfigsByType for statuses
    console.log('\n5. Testing bcrConfigService.getConfigsByType for statuses...');
    const statuses = await bcrConfigService.getConfigsByType('status');
    console.log(`Retrieved ${statuses.length} statuses`);
    if (statuses.length > 0) {
      console.log('Sample status:', {
        id: statuses[0].id,
        name: statuses[0].name,
        value: statuses[0].value,
        type: statuses[0].type
      });
    }
    
    // Step 6: Test bcrConfigService.getConfigsByType for phases
    console.log('\n6. Testing bcrConfigService.getConfigsByType for phases...');
    const phases = await bcrConfigService.getConfigsByType('phase');
    console.log(`Retrieved ${phases.length} phases`);
    if (phases.length > 0) {
      console.log('Sample phase:', {
        id: phases[0].id,
        name: phases[0].name,
        value: phases[0].value,
        type: phases[0].type
      });
    }
    
    // Step 7: Test bcrConfigService.getConfigsByType for impact_area
    console.log('\n7. Testing bcrConfigService.getConfigsByType for impact_area...');
    const impactAreas = await bcrConfigService.getConfigsByType('impact_area');
    console.log(`Retrieved ${impactAreas.length} impact areas`);
    if (impactAreas.length > 0) {
      console.log('Sample impact area:', {
        id: impactAreas[0].id,
        name: impactAreas[0].name,
        value: impactAreas[0].value,
        type: impactAreas[0].type
      });
    }
    
    // Step 8: Test creating phase-to-status mapping
    console.log('\n8. Testing phase-to-status mapping creation...');
    const phaseToStatusMap = {};
    
    // Initialize the mapping with null for each phase value
    phases.forEach(phase => {
      phaseToStatusMap[phase.value] = null;
    });
    
    // Populate the mapping with statuses
    for (const phase of phases) {
      // Find in-progress status for this phase (not starting with 'completed:')
      const inProgressStatuses = statuses.filter(status => 
        status.value === phase.value && !status.name.startsWith('completed:')
      );
      
      if (inProgressStatuses.length > 0) {
        // Use the first in-progress status found
        phaseToStatusMap[phase.value] = inProgressStatuses[0].name;
        console.log(`Mapped phase ${phase.name} (${phase.value}) to status ${inProgressStatuses[0].name}`);
      } else {
        console.log(`No in-progress status found for phase: ${phase.name} (${phase.value})`);
      }
    }
    
    // Step 9: Test updating submissions with displayStatus
    console.log('\n9. Testing updating submissions with displayStatus...');
    
    // Update each submission to show the In Progress Status instead of the enum status
    for (const submission of bcrs) {
      // Parse the notes field to extract the current phase
      if (submission.notes) {
        const phaseMatch = submission.notes.match(/Current Phase: ([^\n]+)/i);
        const phaseStatusMatch = submission.notes.match(/Phase Status: ([^\n]+)/i);
        
        if (phaseStatusMatch && phaseStatusMatch[1]) {
          // Use the phase status from the notes field
          submission.displayStatus = phaseStatusMatch[1];
          console.log(`Set displayStatus from phase status: ${submission.displayStatus}`);
        } else if (phaseMatch && phaseMatch[1]) {
          // Find the phase by name
          const matchingPhase = phases.find(p => p.name === phaseMatch[1]);
          if (matchingPhase) {
            // Use phase.value instead of phase.id for the mapping
            if (phaseToStatusMap[matchingPhase.value]) {
              submission.displayStatus = phaseToStatusMap[matchingPhase.value];
              console.log(`Set displayStatus from matching phase: ${submission.displayStatus}`);
            } else {
              console.log(`No status mapping found for phase: ${matchingPhase.name} (${matchingPhase.value})`);
              // Fall back to using the phase name as the display status
              submission.displayStatus = `${matchingPhase.name} Phase`;
              console.log(`Set fallback displayStatus to: ${submission.displayStatus}`);
            }
          } else {
            console.log(`No matching phase found for: ${phaseMatch[1]}`);
          }
        }
      }
      
      // If we still don't have a display status, use the enum status with proper formatting
      if (!submission.displayStatus) {
        // Convert the enum status (e.g., 'under_review') to a more readable format (e.g., 'Under Review')
        const formattedStatus = submission.status
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        submission.displayStatus = formattedStatus;
        console.log(`Set displayStatus to formatted enum status: ${submission.displayStatus}`);
      }
    }
    
    console.log('\n✅ All tests completed successfully');
    console.log('\nSample BCRs with display status:');
    for (let i = 0; i < Math.min(3, bcrs.length); i++) {
      console.log(`${bcrs[i].bcrNumber}: ${bcrs[i].title} - Status: ${bcrs[i].status}, Display Status: ${bcrs[i].displayStatus}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test function
testBcrSubmissions();
