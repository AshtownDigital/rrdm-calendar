/**
 * Check if a specific BCR ID exists in the database
 */
require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bcrId = '2ad4d498-0a0f-497e-a6d6-de97dfa8a910';

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
        },
        take: 10 // Limit to 10 records
      });
      
      console.log(`Found ${allBcrs.length} BCRs in the database (showing first 10):`);
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
