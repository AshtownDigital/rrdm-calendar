// Script to check if a BCR exists in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBcr() {
  try {
    const bcrId = '092178f0-c551-4ee5-8414-bc5a67ada52f';
    console.log(`Checking if BCR with ID ${bcrId} exists...`);
    
    const bcr = await prisma.bcrs.findUnique({
      where: { id: bcrId }
    });
    
    console.log('BCR found:', bcr ? 'Yes' : 'No');
    
    if (bcr) {
      console.log(JSON.stringify(bcr, null, 2));
    } else {
      console.log('BCR not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBcr();
