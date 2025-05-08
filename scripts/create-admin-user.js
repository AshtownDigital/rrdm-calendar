/**
 * Create an admin user for RRDM
 * This script creates an admin user with specified credentials
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const now = new Date();
    
    // Create a password hash for 'password123'
    const password = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: 'admin@example.com' }
    });
    
    if (existingUser) {
      // Update the existing user
      const updatedUser = await prisma.users.update({
        where: { email: 'admin@example.com' },
        data: {
          password: hashedPassword,
          name: 'Admin User',
          role: 'admin',
          active: true,
          updatedAt: now
        }
      });
      
      console.log('Admin user updated successfully:');
      console.log('Email: admin@example.com');
      console.log('Password: password123');
    } else {
      // Create the admin user
      const user = await prisma.users.create({
        data: {
          id: uuidv4(),
          email: 'admin@example.com',
          password: hashedPassword,
          name: 'Admin User',
          role: 'admin',
          active: true,
          createdAt: now,
          updatedAt: now
        }
      });
      
      console.log('Admin user created successfully:');
      console.log('Email: admin@example.com');
      console.log('Password: password123');
    }
    
    return true;
  } catch (error) {
    console.error('Error creating/updating admin user:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createAdminUser();
