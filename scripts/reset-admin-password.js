/**
 * Reset Admin Password
 * This script directly resets the admin password in the database
 * using a known working bcrypt hash
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔑 Resetting admin password...');
    
    // Use a known working bcrypt hash for 'admin123'
    const knownWorkingHash = '$2a$10$JcV6Y0UYqbXnGR.pGxXeV.9jGOA.9HnAYfQtKbAjg0yWMvxSHdpZe';
    
    // Check if admin user exists
    const existingUser = await prisma.users.findUnique({
      where: { email: 'admin@example.com' }
    });
    
    if (existingUser) {
      // Update the existing user with the known working hash
      await prisma.users.update({
        where: { id: existingUser.id },
        data: {
          password: knownWorkingHash,
          name: 'Admin User',
          role: 'admin',
          active: true,
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Updated admin user with known working password hash');
    } else {
      // Create a new admin user with the known working hash
      await prisma.users.create({
        data: {
          id: uuidv4(),
          email: 'admin@example.com',
          password: knownWorkingHash,
          name: 'Admin User',
          role: 'admin',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Created new admin user with known working password hash');
    }
    
    // Verify the user exists and has the correct hash
    const verifiedUser = await prisma.users.findUnique({
      where: { email: 'admin@example.com' }
    });
    
    if (verifiedUser && verifiedUser.password === knownWorkingHash) {
      console.log('✅ Verified admin user has the correct password hash');
    } else {
      console.log('❌ Failed to verify admin user password hash');
    }
    
    console.log('\n🎉 Admin password reset complete!');
    console.log('\nLogin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('\nPlease restart your server and try logging in again.');
    
    return true;
  } catch (error) {
    console.error('Error resetting admin password:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
resetAdminPassword();
