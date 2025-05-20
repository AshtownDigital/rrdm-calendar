/**
 * Test BCR Database Connection
 * 
 * This script tests the database connection and queries for BCR-related tables
 * to help diagnose issues with the BCR module.
 */
require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Starting BCR database test...');
  
  try {
    // Test 1: Check if we can connect to the database
    console.log('Test 1: Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test 2: Check if the BCRs table exists and count records
    console.log('\nTest 2: Checking BCRs table...');
    const bcrCount = await prisma.bcrs.count();
    console.log(`✅ BCRs table exists with ${bcrCount} records`);
    
    // Test 3: Check if BcrConfigs table exists and count records
    console.log('\nTest 3: Checking BcrConfigs table...');
    const configCount = await prisma.bcrConfigs.count();
    console.log(`✅ BcrConfigs table exists with ${configCount} records`);
    
    // Test 4: Try to fetch a specific BCR by ID
    console.log('\nTest 4: Fetching specific BCR by ID...');
    const testId = 'd7b7f6db-ef5d-424b-8657-b51e061276de';
    const bcr = await prisma.bcrs.findUnique({
      where: { id: testId },
      include: {
        Users_Bcrs_requestedByToUsers: true,
        Users_Bcrs_assignedToToUsers: true
      }
    });
    
    if (bcr) {
      console.log(`✅ Successfully found BCR with ID: ${testId}`);
      console.log('BCR details:');
      console.log({
        id: bcr.id,
        title: bcr.title || 'Untitled',
        status: bcr.status,
        bcrNumber: bcr.bcrNumber,
        requestedBy: bcr.Users_Bcrs_requestedByToUsers ? bcr.Users_Bcrs_requestedByToUsers.name : 'Unknown',
        assignedTo: bcr.Users_Bcrs_assignedToToUsers ? bcr.Users_Bcrs_assignedToToUsers.name : 'Unassigned',
        hasHistory: Array.isArray(bcr.history),
        historyLength: Array.isArray(bcr.history) ? bcr.history.length : 'N/A',
        hasWorkflowHistory: Array.isArray(bcr.workflowHistory),
        workflowHistoryLength: Array.isArray(bcr.workflowHistory) ? bcr.workflowHistory.length : 'N/A',
      });
    } else {
      console.log(`❌ BCR with ID ${testId} not found`);
    }
    
    // Test 5: Check BCR schema
    console.log('\nTest 5: Checking BCR schema...');
    const dmmf = await prisma._getDmmf();
    const bcrModel = dmmf.datamodel.models.find(model => model.name === 'Bcrs');
    
    if (bcrModel) {
      console.log('✅ BCR model found in Prisma schema');
      console.log('Fields:');
      bcrModel.fields.forEach(field => {
        console.log(`- ${field.name}: ${field.type} (${field.isRequired ? 'required' : 'optional'})`);
      });
    } else {
      console.log('❌ BCR model not found in Prisma schema');
    }
    
  } catch (error) {
    console.error('Error during database tests:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\nTests completed. Database connection closed.');
  }
}

main();
