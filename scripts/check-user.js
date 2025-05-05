const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.users.findUnique({
      where: {
        email: 'admin@email.com'
      }
    });
    
    console.log('User found:', user);
  } catch (error) {
    console.error('Error finding user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
