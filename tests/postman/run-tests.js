/**
 * Script to run BCR submission tests using Newman
 */
const newman = require('newman');
const path = require('path');
const fs = require('fs');

// Get a valid session ID from the RRDM application
async function getSessionId() {
  try {
    // This is a placeholder - in a real scenario, you would implement
    // proper authentication to get a valid session ID
    console.log('Using placeholder session ID for testing');
    return 's%3AXkLUQVtUXfBpkWVmxCxPQBDZHnZvdMZx.FvFQpDXGVdP%2FRGCOr7JgQ%2BnZ8sdkuUeRdW%2BnlQHpQDk';
  } catch (error) {
    console.error('Error getting session ID:', error);
    throw error;
  }
}

// Update the environment file with a valid session ID
async function updateEnvironment() {
  try {
    const envPath = path.join(__dirname, 'bcr-submissions-environment.json');
    const env = JSON.parse(fs.readFileSync(envPath, 'utf8'));
    
    // Get a valid session ID
    const sessionId = await getSessionId();
    
    // Update the session_id value in the environment
    env.values.find(v => v.key === 'session_id').value = sessionId;
    
    // Write the updated environment back to the file
    fs.writeFileSync(envPath, JSON.stringify(env, null, 2));
    
    console.log('Environment updated with valid session ID');
    return envPath;
  } catch (error) {
    console.error('Error updating environment:', error);
    throw error;
  }
}

// Run the tests using Newman
async function runTests() {
  try {
    // Update the environment with a valid session ID
    const envPath = await updateEnvironment();
    
    // Path to the collection
    const collectionPath = path.join(__dirname, 'bcr-submissions.postman_collection.json');
    
    // Run the tests
    newman.run({
      collection: require(collectionPath),
      environment: require(envPath),
      reporters: ['cli'],
      reporter: {
        cli: {
          noSummary: false,
          noFailures: false
        }
      }
    }, function (err, summary) {
      if (err) {
        console.error('Error running tests:', err);
        process.exit(1);
      }
      
      console.log('Newman run completed!');
      
      // Check if there were any failures
      const failures = summary.run.failures.length;
      if (failures > 0) {
        console.error(`${failures} test(s) failed!`);
        process.exit(1);
      } else {
        console.log('All tests passed!');
        process.exit(0);
      }
    });
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
