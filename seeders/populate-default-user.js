/**
 * Seed script to populate a default admin user
 * 
 * This script creates a default admin user for testing purposes.
 * 
 * Usage: node seeders/populate-default-user.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

// Default admin user data
const adminUser = {
  id: '00000000-0000-0000-0000-000000000001', // Using a predictable ID for the admin user
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  password: 'admin123', // Default password, should be changed in production
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * Seed the default admin user
 */
async function seedDefaultUser() {
  console.log('Starting to seed default admin user...');
  
  try {
    // Check if the admin user already exists
    const existingUser = await prisma.users.findUnique({
      where: {
        id: adminUser.id
      }
    });
    
    if (existingUser) {
      console.log('Default admin user already exists.');
      return;
    }
    
    // Create the admin user
    await prisma.users.create({
      data: adminUser
    });
    
    console.log('Default admin user created successfully!');
  } catch (error) {
    console.error('Error seeding default admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDefaultUser()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
