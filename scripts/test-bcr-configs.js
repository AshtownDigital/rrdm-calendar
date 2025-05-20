/**
 * Script to test BCR configurations and database connection
 * This script tests access to the BcrConfigs table and prints out the results
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBcrConfigs() {
  try {
    console.log('Testing database connection and BCR configurations...');
    
    // Test database connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test BcrConfigs table
    console.log('\nTesting BcrConfigs table...');
    const configCount = await prisma.bcrConfigs.count();
    console.log(`Total BcrConfigs: ${configCount}`);
    
    // Test phase configurations
    console.log('\nTesting phase configurations...');
    const phases = await prisma.bcrConfigs.findMany({
      where: { type: 'phase' },
      orderBy: { displayOrder: 'asc' }
    });
    console.log(`Found ${phases.length} phases`);
    if (phases.length > 0) {
      console.log('Sample phase:', phases[0]);
    } else {
      console.log('⚠️ No phases found');
    }
    
    // Test status configurations
    console.log('\nTesting status configurations...');
    const statuses = await prisma.bcrConfigs.findMany({
      where: { type: 'status' },
      orderBy: { displayOrder: 'asc' }
    });
    console.log(`Found ${statuses.length} statuses`);
    if (statuses.length > 0) {
      console.log('Sample status:', statuses[0]);
    } else {
      console.log('⚠️ No statuses found');
    }
    
    // Test impact area configurations
    console.log('\nTesting impact area configurations...');
    const impactAreas = await prisma.bcrConfigs.findMany({
      where: { type: 'impact_area' },
      orderBy: { displayOrder: 'asc' }
    });
    console.log(`Found ${impactAreas.length} impact areas`);
    if (impactAreas.length > 0) {
      console.log('Sample impact area:', impactAreas[0]);
    } else {
      console.log('⚠️ No impact areas found');
    }
    
    // Test Bcrs table
    console.log('\nTesting Bcrs table...');
    const bcrs = await prisma.bcrs.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Found ${bcrs.length} BCRs`);
    if (bcrs.length > 0) {
      console.log('Sample BCR:', {
        id: bcrs[0].id,
        title: bcrs[0].title,
        status: bcrs[0].status,
        bcrNumber: bcrs[0].bcrNumber
      });
    } else {
      console.log('⚠️ No BCRs found');
    }
    
    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testBcrConfigs();
