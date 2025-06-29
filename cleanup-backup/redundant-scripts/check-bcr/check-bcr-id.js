/**
 * Check if a specific BCR ID exists in the database
 */
require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bcrId = '6f2d48b3-ebe3-4298-bbee-1ab3f0be5bbf';

async function checkBcrId() {
  try {
    console.log(`Checking if BCR with ID ${bcrId} exists...`);
    
    // Try to find the BCR directly by ID
    const bcr = await prisma.bcrs.findUnique({
      where: { id: bcrId }
    });
    
    if (bcr) {
      console.log('✅ BCR found:', {
        id: bcr.id,
        bcrNumber: bcr.bcrNumber,
        title: bcr.title,
        status: bcr.status
      });
    } else {
      console.log('❌ BCR not found with that ID');
      
      // List all BCRs to help identify the correct ID
      console.log('\nListing all BCRs in the database:');
      const allBcrs = await prisma.bcrs.findMany({
        select: {
          id: true,
          bcrNumber: true,
          title: true,
          status: true
        }
      });
      
      console.log(`Found ${allBcrs.length} BCRs in the database:`);
      allBcrs.forEach((bcr, index) => {
        console.log(`${index + 1}. ${bcr.bcrNumber} - ${bcr.title} (${bcr.status}) - ID: ${bcr.id}`);
      });
    }
  } catch (error) {
    console.error('Error checking BCR ID:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBcrId();
