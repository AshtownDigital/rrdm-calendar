/**
 * Test and Deploy Script
 * 
 * This script tests the serverless functions locally before deploying to Vercel.
 * It ensures that the application works correctly in a serverless environment.
 */
const http = require('http');
const { execSync } = require('child_process');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Set environment variables for testing
process.env.NODE_ENV = 'staging';
process.env.VERCEL = '1';
process.env.PORT = '3336';

// Import the app
const app = require('../server');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Log with colors
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test endpoints to check
const testEndpoints = [
  { path: '/', name: 'Home Page', expectedStatus: 200 },
  { path: '/bcr/dashboard', name: 'BCR Dashboard', expectedStatus: 200 },
  { path: '/bcr/submissions', name: 'BCR Submissions', expectedStatus: 200 },
  { path: '/api/health', name: 'Health Check API', expectedStatus: 200 }
];

// Track test results
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: testEndpoints.length
};

// Create a simple HTTP server for testing
const PORT = process.env.PORT;
const server = http.createServer(app);

// Start the test server and run tests
async function runTests() {
  log('🚀 Starting serverless function tests...', 'cyan');
  log(`Environment: ${process.env.NODE_ENV} (Serverless: ${process.env.VERCEL === '1'})`, 'blue');
  
  return new Promise((resolve) => {
    server.listen(PORT, async () => {
      log(`Test server running on http://localhost:${PORT}`, 'green');
      
      try {
        // Run the tests
        await testAllEndpoints();
        
        // Print test summary
        log('\n📊 Test Summary:', 'cyan');
        log(`✅ Passed: ${testResults.passed}`, 'green');
        log(`❌ Failed: ${testResults.failed}`, 'red');
        log(`⏭️ Skipped: ${testResults.skipped}`, 'yellow');
        log(`📝 Total: ${testResults.total}`, 'blue');
        
        // Decide if we should proceed with deployment
        const shouldDeploy = testResults.failed === 0;
        
        if (shouldDeploy) {
          log('\n✅ All tests passed! Ready for deployment.', 'green');
          resolve(true);
        } else {
          log('\n❌ Some tests failed. Fix the issues before deploying.', 'red');
          resolve(false);
        }
      } catch (error) {
        log(`\n❌ Error running tests: ${error.message}`, 'red');
        resolve(false);
      } finally {
        // Close the server
        server.close();
      }
    });
  });
}

// Test all endpoints
async function testAllEndpoints() {
  log('\n🧪 Testing endpoints:', 'cyan');
  
  for (const endpoint of testEndpoints) {
    await testEndpoint(endpoint);
  }
}

// Test a single endpoint
async function testEndpoint({ path, name, expectedStatus }) {
  try {
    const url = `http://localhost:${PORT}${path}`;
    log(`\n📡 Testing ${name} (${url})...`, 'blue');
    
    const startTime = Date.now();
    const response = await fetch(url, {
      timeout: 10000 // 10 second timeout
    });
    const duration = Date.now() - startTime;
    
    if (response.status === expectedStatus) {
      log(`✅ ${name}: ${response.status} (${duration}ms)`, 'green');
      testResults.passed++;
    } else {
      log(`❌ ${name}: Expected ${expectedStatus}, got ${response.status} (${duration}ms)`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ ${name}: ${error.message}`, 'red');
    testResults.failed++;
  }
}

// Build the application for Vercel
async function buildForVercel() {
  log('\n🔨 Building application for Vercel...', 'cyan');
  
  try {
    // Run the build script
    execSync('npm run build', { stdio: 'inherit' });
    log('✅ Build completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Build failed: ${error.message}`, 'red');
    return false;
  }
}

// Deploy to Vercel
async function deployToVercel(isProd = false) {
  log(`\n🚀 Deploying to Vercel (${isProd ? 'production' : 'preview'})...`, 'cyan');
  
  return new Promise((resolve) => {
    const command = isProd ? 'vercel deploy --prod' : 'vercel deploy';
    
    const deploy = spawn(command, { shell: true, stdio: 'pipe' });
    
    let output = '';
    
    deploy.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    deploy.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });
    
    deploy.on('close', (code) => {
      if (code === 0) {
        log('✅ Deployment successful', 'green');
        
        // Extract deployment URL from output
        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+-[a-zA-Z0-9-]+-[a-zA-Z0-9-]+\.vercel\.app/);
        const deployUrl = urlMatch ? urlMatch[0] : 'Unknown URL';
        
        log(`🌐 Deployed to: ${deployUrl}`, 'green');
        resolve(true);
      } else {
        log(`❌ Deployment failed with code ${code}`, 'red');
        resolve(false);
      }
    });
  });
}

// Main function
async function main() {
  log('🚀 Starting test and deploy process...', 'cyan');
  
  // Run the tests
  const testsPass = await runTests();
  
  if (!testsPass) {
    log('❌ Tests failed. Deployment aborted.', 'red');
    process.exit(1);
  }
  
  // Build the application
  const buildSuccess = await buildForVercel();
  
  if (!buildSuccess) {
    log('❌ Build failed. Deployment aborted.', 'red');
    process.exit(1);
  }
  
  // Ask for confirmation before deploying
  log('\n⚠️ Ready to deploy to Vercel?', 'yellow');
  log('Press Enter to continue or Ctrl+C to abort...', 'yellow');
  
  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
  
  // Deploy to Vercel
  const deploySuccess = await deployToVercel(true); // true for production
  
  if (deploySuccess) {
    log('✅ Deployment process completed successfully', 'green');
    process.exit(0);
  } else {
    log('❌ Deployment failed', 'red');
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  log(`❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});
