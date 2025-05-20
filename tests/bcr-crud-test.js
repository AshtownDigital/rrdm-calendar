/**
 * Automated BCR CRUD Test Script
 * 
 * This script tests the BCR module's CRUD operations
 * Run with: node tests/bcr-crud-test.js
 */
require('dotenv').config({ path: '.env.development' });
const { prisma } = require('../config/database');
const bcrService = require('../services/bcrService');
const { v4: uuidv4 } = require('uuid');

// Test configuration
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000'; // Default test user ID
const TEST_PREFIX = 'UAT-TEST-';

// Test data
const testBcr = {
  title: `${TEST_PREFIX}Automated Test BCR`,
  description: 'This BCR was created by an automated test script',
  priority: 'medium',
  impact: 'Testing, Automation',
  status: 'draft',
  requestedBy: TEST_USER_ID
};

// Store created BCR ID for later tests
let createdBcrId = null;

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting BCR CRUD Tests');
  console.log('======================');
  
  try {
    // Test database connection
    await testDatabaseConnection();
    
    // Test BCR creation
    await testCreateBcr();
    
    // Test BCR retrieval
    await testGetBcr();
    
    // Test BCR update
    await testUpdateBcr();
    
    // Test BCR listing and filtering
    await testListBcrs();
    
    // Test BCR deletion (if needed)
    // Uncomment to test deletion
    // await testDeleteBcr();
    
    console.log('\nAll tests completed successfully! ✅');
  } catch (error) {
    console.error('\nTest failed:', error);
  } finally {
    // Clean up test data
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

/**
 * Test database connection
 */
async function testDatabaseConnection() {
  console.log('\n1. Testing database connection...');
  
  try {
    await prisma.$queryRaw`SELECT 1 as result`;
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw new Error('Database connection test failed');
  }
}

/**
 * Test BCR creation
 */
async function testCreateBcr() {
  console.log('\n2. Testing BCR creation...');
  
  try {
    // Add a unique identifier to avoid duplicates
    const uniqueTestBcr = {
      ...testBcr,
      title: `${testBcr.title} ${new Date().toISOString()}`,
      notes: `Test BCR created at ${new Date().toISOString()}`
    };
    
    const newBcr = await bcrService.createBcr(uniqueTestBcr);
    
    // Store the created BCR ID for later tests
    createdBcrId = newBcr.id;
    
    console.log(`✅ BCR created successfully with ID: ${newBcr.id}`);
    console.log(`   BCR Number: ${newBcr.bcrNumber}`);
    console.log(`   Title: ${newBcr.title}`);
    
    // Verify required fields
    if (!newBcr.title || !newBcr.bcrNumber || !newBcr.status) {
      throw new Error('BCR missing required fields');
    }
    
    return newBcr;
  } catch (error) {
    console.error('❌ BCR creation failed:', error.message);
    throw new Error('BCR creation test failed');
  }
}

/**
 * Test BCR retrieval
 */
async function testGetBcr() {
  console.log('\n3. Testing BCR retrieval...');
  
  if (!createdBcrId) {
    console.warn('⚠️ No BCR ID available for retrieval test');
    return;
  }
  
  try {
    // Get BCR by ID
    const bcr = await bcrService.getBcrById(createdBcrId);
    
    if (!bcr) {
      throw new Error(`BCR with ID ${createdBcrId} not found`);
    }
    
    console.log(`✅ BCR retrieved successfully: ${bcr.title}`);
    
    // Verify BCR data
    if (bcr.id !== createdBcrId) {
      throw new Error('Retrieved BCR has incorrect ID');
    }
    
    return bcr;
  } catch (error) {
    console.error('❌ BCR retrieval failed:', error.message);
    throw new Error('BCR retrieval test failed');
  }
}

/**
 * Test BCR update
 */
async function testUpdateBcr() {
  console.log('\n4. Testing BCR update...');
  
  if (!createdBcrId) {
    console.warn('⚠️ No BCR ID available for update test');
    return;
  }
  
  try {
    // Update data
    const updateData = {
      title: `${testBcr.title} (Updated)`,
      description: 'This BCR was updated by an automated test script',
      priority: 'high',
      notes: `Test BCR updated at ${new Date().toISOString()}`
    };
    
    // Update BCR
    const updatedBcr = await bcrService.updateBcr(createdBcrId, updateData);
    
    console.log(`✅ BCR updated successfully: ${updatedBcr.title}`);
    
    // Verify update
    if (updatedBcr.title !== updateData.title || 
        updatedBcr.priority !== updateData.priority) {
      throw new Error('BCR update verification failed');
    }
    
    return updatedBcr;
  } catch (error) {
    console.error('❌ BCR update failed:', error.message);
    throw new Error('BCR update test failed');
  }
}

/**
 * Test BCR listing and filtering
 */
async function testListBcrs() {
  console.log('\n5. Testing BCR listing and filtering...');
  
  try {
    // Get all BCRs
    const allBcrs = await bcrService.getAllBcrs();
    console.log(`✅ Retrieved ${allBcrs.length} BCRs`);
    
    // Filter BCRs by status
    const draftBcrs = await bcrService.getAllBcrs({ status: 'draft' });
    console.log(`✅ Retrieved ${draftBcrs.length} draft BCRs`);
    
    // Verify our test BCR is in the results if it's a draft
    if (createdBcrId) {
      const testBcrInResults = allBcrs.some(bcr => bcr.id === createdBcrId);
      if (!testBcrInResults) {
        console.warn('⚠️ Test BCR not found in results');
      } else {
        console.log('✅ Test BCR found in results');
      }
    }
    
    return { allBcrs, draftBcrs };
  } catch (error) {
    console.error('❌ BCR listing failed:', error.message);
    throw new Error('BCR listing test failed');
  }
}

/**
 * Test BCR deletion
 */
async function testDeleteBcr() {
  console.log('\n6. Testing BCR deletion...');
  
  if (!createdBcrId) {
    console.warn('⚠️ No BCR ID available for deletion test');
    return;
  }
  
  try {
    // Delete BCR
    const deletedBcr = await bcrService.deleteBcr(createdBcrId);
    
    console.log(`✅ BCR deleted successfully: ${deletedBcr.title}`);
    
    // Verify deletion
    const bcr = await bcrService.getBcrById(createdBcrId);
    if (bcr) {
      throw new Error('BCR still exists after deletion');
    }
    
    // Clear the ID since it's been deleted
    createdBcrId = null;
    
    return deletedBcr;
  } catch (error) {
    console.error('❌ BCR deletion failed:', error.message);
    throw new Error('BCR deletion test failed');
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('\nCleaning up test data...');
  
  try {
    // Only delete test BCRs created by this script
    if (createdBcrId) {
      console.log(`Deleting test BCR: ${createdBcrId}`);
      await bcrService.deleteBcr(createdBcrId);
    }
    
    // Optionally delete all test BCRs
    // Uncomment to delete all test BCRs
    /*
    const testBcrs = await prisma.bcrs.findMany({
      where: {
        title: {
          startsWith: TEST_PREFIX
        }
      }
    });
    
    for (const bcr of testBcrs) {
      console.log(`Deleting test BCR: ${bcr.id} - ${bcr.title}`);
      await bcrService.deleteBcr(bcr.id);
    }
    */
    
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('⚠️ Test data cleanup failed:', error.message);
    // Don't throw here to allow the script to exit cleanly
  }
}

// Run the tests
runTests()
  .then(() => {
    console.log('\nTest script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nTest script failed:', error);
    process.exit(1);
  });
