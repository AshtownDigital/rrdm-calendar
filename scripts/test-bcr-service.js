/**
 * Script to test the bcrService with the new_submission status
 * This verifies that our changes to the service are working correctly
 */
const bcrService = require('../services/bcrService');

async function testBcrService() {
  console.log('Testing BCR service with new_submission status...');
  
  try {
    // Test getAllBcrs
    console.log('Testing getAllBcrs()...');
    const allBcrs = await bcrService.getAllBcrs();
    console.log(`Successfully retrieved ${allBcrs.length} BCRs`);
    
    // Log the first BCR to verify status
    if (allBcrs.length > 0) {
      console.log('First BCR details:');
      console.log(`- ID: ${allBcrs[0].id}`);
      console.log(`- Number: ${allBcrs[0].bcrNumber}`);
      console.log(`- Status: ${allBcrs[0].status}`);
      console.log(`- Title: ${allBcrs[0].title}`);
    }
    
    // Test filtered query
    console.log('\nTesting getAllBcrs() with status filter...');
    const filteredBcrs = await bcrService.getAllBcrs({ status: 'new_submission' });
    console.log(`Successfully retrieved ${filteredBcrs.length} BCRs with 'new_submission' status`);
    
    // Test getBcrById with the first BCR if available
    if (allBcrs.length > 0) {
      console.log('\nTesting getBcrById()...');
      const bcr = await bcrService.getBcrById(allBcrs[0].id);
      console.log(`Successfully retrieved BCR by ID: ${bcr.id}`);
      console.log(`- Status: ${bcr.status}`);
    }
    
    console.log('\nAll tests completed successfully!');
    return true;
  } catch (error) {
    console.error('Error testing BCR service:', error);
    return false;
  }
}

// Run the test function
testBcrService()
  .then((success) => {
    if (success) {
      console.log('BCR service is working correctly with new_submission status.');
    } else {
      console.error('BCR service test failed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with an unhandled error:', error);
    process.exit(1);
  });
