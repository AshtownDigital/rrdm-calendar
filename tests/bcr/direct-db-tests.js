/**
 * Direct Database Tests for BCR Submissions
 * 
 * This script tests the BCR submission functionality by directly interacting with the database
 * using Prisma, bypassing the need for authentication through the web interface.
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Test data for BCR submissions
const testData = {
  standard: {
    description: 'Test BCR submission created via direct DB test',
    priority: 'medium',
    impact: 'Systems, Reporting',
    submitterName: 'Test User',
    submitterEmail: 'test@example.com'
  },
  critical: {
    description: 'Critical priority BCR submission via direct DB test',
    priority: 'critical',
    impact: 'Systems, Users, Training',
    submitterName: 'Test User',
    submitterEmail: 'test@example.com'
  }
};

// Store created BCR IDs
const createdBcrs = [];

// Helper function to generate a BCR code
async function generateBcrCode() {
  const now = new Date();
  const fiscalYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fiscalYearEnd = fiscalYearStart + 1;
  const shortYearStart = fiscalYearStart.toString().slice(-2);
  const shortYearEnd = fiscalYearEnd.toString().slice(-2);
  const fiscalYear = `${shortYearStart}/${shortYearEnd}`;
  
  // Find the highest BCR number for the current fiscal year
  const highestBcr = await prisma.bcrs.findFirst({
    where: {
      title: {
        contains: `BCR-${fiscalYear}`
      }
    },
    orderBy: {
      title: 'desc'
    }
  });
  
  let nextNumber = 1;
  if (highestBcr) {
    // Extract the number from the BCR code (e.g., BCR-25/26-0001 -> 1)
    const match = highestBcr.title.match(/BCR-\d{2}\/\d{2}-(\d{4})/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  
  // Format the BCR code with leading zeros
  const bcrNumber = nextNumber.toString().padStart(4, '0');
  return `BCR-${fiscalYear}-${bcrNumber}`;
}

// Test: Create a standard BCR submission
async function testCreateStandardBcr() {
  console.log('\n🧪 Testing: Create Standard BCR Submission');
  
  try {
    // Generate a BCR code
    const bcrCode = await generateBcrCode();
    
    // Create a BCR record
    const bcr = await prisma.bcrs.create({
      data: {
        id: uuidv4(),
        title: bcrCode,
        description: testData.standard.description,
        status: 'new_submission',
        priority: testData.standard.priority,
        impact: testData.standard.impact,
        submitterName: testData.standard.submitterName,
        submitterEmail: testData.standard.submitterEmail,
        notes: `Created by direct DB test at ${new Date().toISOString()}`
      }
    });
    
    console.log('✅ Test passed: BCR submission created successfully');
    console.log(`   📝 Created BCR ID: ${bcr.id}`);
    console.log(`   📝 BCR Code: ${bcr.title}`);
    
    createdBcrs.push(bcr.id);
    return bcr;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Test: Create a critical priority BCR
async function testCreateCriticalBcr() {
  console.log('\n🧪 Testing: Create Critical Priority BCR');
  
  try {
    // Generate a BCR code
    const bcrCode = await generateBcrCode();
    
    // Create a BCR record
    const bcr = await prisma.bcrs.create({
      data: {
        id: uuidv4(),
        title: bcrCode,
        description: testData.critical.description,
        status: 'new_submission',
        priority: testData.critical.priority,
        impact: testData.critical.impact,
        submitterName: testData.critical.submitterName,
        submitterEmail: testData.critical.submitterEmail,
        notes: `Created by direct DB test at ${new Date().toISOString()}`
      }
    });
    
    console.log('✅ Test passed: Critical BCR submission created successfully');
    console.log(`   📝 Created BCR ID: ${bcr.id}`);
    console.log(`   📝 BCR Code: ${bcr.title}`);
    
    createdBcrs.push(bcr.id);
    return bcr;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Test: Get BCR submission by ID
async function testGetBcrById(bcrId) {
  if (!bcrId) {
    console.log('\n⚠️ Skipping Get BCR test: No BCR ID available');
    return;
  }
  
  console.log(`\n🧪 Testing: Get BCR Submission by ID (${bcrId})`);
  
  try {
    const bcr = await prisma.bcrs.findUnique({
      where: {
        id: bcrId
      }
    });
    
    if (bcr) {
      console.log('✅ Test passed: BCR details retrieved successfully');
      console.log(`   📝 BCR Code: ${bcr.title}`);
      console.log(`   📝 Description: ${bcr.description}`);
      console.log(`   📝 Status: ${bcr.status}`);
      console.log(`   📝 Priority: ${bcr.priority}`);
      
      // Verify BCR code format
      const bcrCodeRegex = /BCR-\d{2}\/\d{2}-\d{4}/;
      if (bcrCodeRegex.test(bcr.title)) {
        console.log('   ✅ BCR code format is correct');
      } else {
        console.log('   ❌ BCR code format is incorrect');
      }
      
      // Verify status
      if (bcr.status === 'new_submission') {
        console.log('   ✅ Status is correct (new_submission)');
      } else {
        console.log(`   ❌ Status is incorrect: ${bcr.status}, expected: new_submission`);
      }
      
      return bcr;
    } else {
      console.log('❌ Test failed: BCR not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Test: Delete BCR submission
async function testDeleteBcr(bcrId) {
  if (!bcrId) {
    console.log('\n⚠️ Skipping Delete BCR test: No BCR ID available');
    return;
  }
  
  console.log(`\n🧪 Testing: Delete BCR Submission (${bcrId})`);
  
  try {
    await prisma.bcrs.delete({
      where: {
        id: bcrId
      }
    });
    
    console.log('✅ Test passed: BCR deleted successfully');
    
    // Verify deletion
    const bcr = await prisma.bcrs.findUnique({
      where: {
        id: bcrId
      }
    });
    
    if (!bcr) {
      console.log('   ✅ Verification passed: BCR no longer exists in the database');
    } else {
      console.log('   ❌ Verification failed: BCR still exists in the database');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting BCR Submissions Direct DB Tests');
  console.log('==========================================');
  
  try {
    // Create a standard BCR
    const standardBcr = await testCreateStandardBcr();
    
    // Create a critical BCR
    const criticalBcr = await testCreateCriticalBcr();
    
    // Get BCR by ID (using the first created BCR)
    if (standardBcr) {
      await testGetBcrById(standardBcr.id);
    }
    
    // Delete BCR (using the critical BCR if available, otherwise the standard one)
    const bcrToDelete = criticalBcr ? criticalBcr.id : (standardBcr ? standardBcr.id : null);
    if (bcrToDelete) {
      await testDeleteBcr(bcrToDelete);
    }
    
    console.log('\n==========================================');
    console.log('🏁 All tests completed');
    
    // Summary of test results
    console.log('\n📊 Test Summary:');
    console.log(`   BCRs created: ${createdBcrs.length}`);
    console.log(`   BCR IDs: ${createdBcrs.join(', ')}`);
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Disconnect from the database
    await prisma.$disconnect();
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  prisma.$disconnect();
});
