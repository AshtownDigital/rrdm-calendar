const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Generate UUID v4
    const id = crypto.randomUUID();
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password1254', salt);
    
    // Create admin user
    const user = await prisma.users.create({
      data: {
        id,
        email: 'admin@email.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('Admin user created successfully:', user.email);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
