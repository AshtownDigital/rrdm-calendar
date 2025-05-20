/**
 * Script to list users in the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log('Fetching users from database...');
    
    // Query users from the database
    const users = await prisma.users.findMany();
    
    console.log(`Found ${users.length} users`);
    
    // Display each user
    users.forEach((user, index) => {
      console.log(`\n--- User ${index + 1} ---`);
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log('------------------------');
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
listUsers();
