/**
 * Script to create a test admin user for debugging purposes
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createTestAdmin() {
  try {
    console.log('Checking for existing admin users...');
    
    // Check if admin user already exists
    const existingAdmin = await prisma.users.findFirst({
      where: {
        role: 'admin'
      }
    });
    
    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`- Email: ${existingAdmin.email}`);
      console.log(`- Name: ${existingAdmin.name}`);
      console.log(`- ID: ${existingAdmin.id}`);
      console.log('\nYou can use this account to log in for testing.');
      console.log('Default password for testing: "password123" (unless changed)');
      return;
    }
    
    // Create a new admin user
    console.log('No admin user found. Creating test admin user...');
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Create the user
    const newAdmin = await prisma.users.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Test Admin',
        role: 'admin',
        active: true
      }
    });
    
    console.log('Test admin user created successfully:');
    console.log(`- Email: ${newAdmin.email}`);
    console.log(`- Name: ${newAdmin.name}`);
    console.log(`- ID: ${newAdmin.id}`);
    console.log('\nYou can now log in with:');
    console.log('Email: admin@example.com');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('Error creating test admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createTestAdmin();
