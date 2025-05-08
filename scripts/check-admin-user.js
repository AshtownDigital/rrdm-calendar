/**
 * Check if admin user exists in the database
 * This script verifies if the admin user exists and prints details
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    // Find the admin user
    const adminUser = await prisma.users.findUnique({
      where: { email: 'admin@example.com' }
    });
    
    if (adminUser) {
      console.log('Admin user found in database:');
      console.log('ID:', adminUser.id);
      console.log('Email:', adminUser.email);
      console.log('Name:', adminUser.name);
      console.log('Role:', adminUser.role);
      console.log('Active:', adminUser.active);
      console.log('Password hash length:', adminUser.password.length);
      console.log('Password hash prefix:', adminUser.password.substring(0, 10) + '...');
    } else {
      console.log('Admin user not found in database');
    }
    
    return true;
  } catch (error) {
    console.error('Error checking admin user:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
checkAdminUser();
