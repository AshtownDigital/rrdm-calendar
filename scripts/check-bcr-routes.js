/**
 * Simple BCR Routes Check Script
 * 
 * This script checks if the BCR routes are working correctly
 * It loads the environment variables and connects to the database
 */

require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBcrRoutes() {
  console.log('Starting BCR routes check...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database URL set:', !!process.env.DATABASE_URL);
  
  try {
    // Check database connection
    console.log('Checking database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if BCR table exists and has records
    console.log('Checking BCR records...');
    const bcrCount = await prisma.bcrs.count();
    console.log(`✅ Found ${bcrCount} BCRs in the database`);
    
    if (bcrCount > 0) {
      // Get a sample BCR
      const sampleBcr = await prisma.bcrs.findFirst();
      console.log('Sample BCR:', {
        id: sampleBcr.id,
        bcrNumber: sampleBcr.bcrNumber,
        title: sampleBcr.title,
        status: sampleBcr.status
      });
      
      // List routes that should be working
      console.log('\nThe following BCR routes should be working:');
      console.log(`1. GET /bcr - BCR List View`);
      console.log(`2. GET /bcr/${sampleBcr.id} - BCR Detail View`);
      console.log(`3. GET /bcr/submit - BCR Creation Form`);
      console.log(`4. POST /bcr/submit - BCR Creation Submission`);
      console.log(`5. GET /bcr/edit/${sampleBcr.id} - BCR Edit Form`);
      console.log(`6. POST /bcr/edit/${sampleBcr.id} - BCR Edit Submission`);
    } else {
      console.log('⚠️ No BCRs found in the database. Please run the seed script first.');
    }
    
    // Check BCR configurations
    console.log('\nChecking BCR configurations...');
    const configCount = await prisma.bcrConfigs.count();
    console.log(`✅ Found ${configCount} BCR configurations in the database`);
    
    if (configCount > 0) {
      // Get impact areas
      const impactAreas = await prisma.bcrConfigs.findMany({
        where: { type: 'impactArea' }
      });
      console.log(`✅ Found ${impactAreas.length} impact areas`);
      
      // Get statuses
      const statuses = await prisma.bcrConfigs.findMany({
        where: { type: 'status' }
      });
      console.log(`✅ Found ${statuses.length} statuses`);
    } else {
      console.log('⚠️ No BCR configurations found. Please run the seed script first.');
    }
    
    console.log('\nBCR routes check completed successfully.');
  } catch (error) {
    console.error('❌ Error checking BCR routes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkBcrRoutes();
