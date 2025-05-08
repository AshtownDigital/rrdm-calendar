/**
 * Create a test user for RRDM
 * This script creates a test user with known credentials for testing
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const now = new Date();
    
    // Create a password hash for 'password123'
    const password = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create the test user
    const user = await prisma.users.create({
      data: {
        id: uuidv4(),
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'admin',
        active: true,
        createdAt: now,
        updatedAt: now
      }
    });
    
    console.log('Test user created successfully:');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    
    return true;
  } catch (error) {
    console.error('Error creating test user:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createTestUser();
