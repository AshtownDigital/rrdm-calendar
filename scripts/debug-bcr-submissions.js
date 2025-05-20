/**
 * Script to debug BCR submissions page issues
 * Tests each component separately to identify the specific error
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrService = require('../services/bcrService');
const bcrConfigService = require('../services/bcrConfigService');

async function debugBcrSubmissions() {
  try {
    console.log('=== BCR Submissions Debug Script ===');
    
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
    
    // Step 6: Test bcrConfigService.getConfigsByType for phases
    console.log('\n6. Testing bcrConfigService.getConfigsByType for phases...');
    const phases = await bcrConfigService.getConfigsByType('phase');
    console.log(`Retrieved ${phases.length} phases`);
    
    // Step 7: Test bcrConfigService.getConfigsByType for impact_area
    console.log('\n7. Testing bcrConfigService.getConfigsByType for impact_area...');
    const impactAreas = await bcrConfigService.getConfigsByType('impact_area');
    console.log(`Retrieved ${impactAreas.length} impact areas`);
    
    // Step 8: Test creating phase-to-status mapping
    console.log('\n8. Testing phase-to-status mapping creation...');
    const phaseToStatusMap = {};
    
    for (const phase of phases) {
      phaseToStatusMap[phase.id] = [];
    }
    
    // Populate the mapping with statuses
    statuses.forEach(status => {
      const phaseId = status.value;
      if (phaseToStatusMap[phaseId]) {
        phaseToStatusMap[phaseId].push(status.name);
      }
    });
    
    console.log('Phase-to-status mapping created successfully');
    console.log(`Sample mapping for first phase: ${phaseToStatusMap[phases[0].id]}`);
    
    // Step 9: Test updating submissions with displayStatus
    console.log('\n9. Testing updating submissions with displayStatus...');
    
    // Create a mapping of phase IDs to their in-progress status
    const inProgressStatusMap = {};
    
    for (const phase of phases) {
      // Find in-progress status for this phase (not starting with 'completed:')
      const inProgressStatuses = statuses.filter(status => 
        status.value === phase.id && !status.name.startsWith('completed:')
      );
      
      if (inProgressStatuses.length > 0) {
        // Use the first in-progress status found
        inProgressStatusMap[phase.id] = inProgressStatuses[0].name;
      }
    }
    
    console.log('In-progress status mapping created successfully');
    console.log(`Sample in-progress status for first phase: ${inProgressStatusMap[phases[0].id]}`);
    
    // Try to update a submission with displayStatus
    if (bcrs.length > 0) {
      const testBcr = bcrs[0];
      
      // Parse the notes field to extract the current phase
      if (testBcr.notes) {
        const phaseMatch = testBcr.notes.match(/Current Phase: ([^\n]+)/i);
        const phaseStatusMatch = testBcr.notes.match(/Phase Status: ([^\n]+)/i);
        
        if (phaseStatusMatch && phaseStatusMatch[1]) {
          // Use the phase status from the notes field
          testBcr.displayStatus = phaseStatusMatch[1];
          console.log(`Set displayStatus from phase status: ${testBcr.displayStatus}`);
        } else if (phaseMatch && phaseMatch[1]) {
          // Find the phase by name
          const matchingPhase = phases.find(p => p.name === phaseMatch[1]);
          if (matchingPhase && inProgressStatusMap[matchingPhase.id]) {
            testBcr.displayStatus = inProgressStatusMap[matchingPhase.id];
            console.log(`Set displayStatus from matching phase: ${testBcr.displayStatus}`);
          }
        }
      }
      
      // If we couldn't extract a status, use a default based on the enum status
      if (!testBcr.displayStatus) {
        testBcr.displayStatus = testBcr.status;
        console.log(`Set displayStatus to default status: ${testBcr.displayStatus}`);
      }
    }
    
    console.log('\n✅ All tests completed successfully');
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

// Run the debug function
debugBcrSubmissions();
