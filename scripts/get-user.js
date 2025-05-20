// Script to get a user ID for testing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUser() {
  try {
    const user = await prisma.users.findFirst();
    console.log('User found:');
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    return user;
  } catch (error) {
    console.error('Error finding user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
getUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to get user:', error);
    process.exit(1);
  });
