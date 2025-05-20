/**
 * Fix Authentication for Deployment
 * 
 * This script addresses authentication issues in the deployed version of RRDM
 * by ensuring user credentials are properly migrated and compatible with the
 * Prisma/Neon PostgreSQL implementation.
 */
require('dotenv').config({ path: '.env.development' });
const { prisma } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Default admin user to create if none exists
const DEFAULT_ADMIN = {
  email: 'admin@example.com',
  password: 'Password123!',
  name: 'Admin User',
  role: 'admin'
};

/**
 * Fix user authentication issues
 */
async function fixAuthIssues() {
  console.log('Starting authentication fix for deployment...');
  
  try {
    // 1. Check database connection
    console.log('Testing database connection...');
    await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Database connection successful');
    
    // 2. Check if users table exists and has the correct structure
    console.log('Checking users table structure...');
    const userTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Users'
      );
    `;
    
    if (!userTableExists) {
      console.error('Users table does not exist!');
      console.log('Please run prisma migrate to create the required tables');
      return;
    }
    
    // 3. Check if any users exist
    console.log('Checking for existing users...');
    const userCount = await prisma.users.count();
    console.log(`Found ${userCount} users in the database`);
    
    // 4. Create default admin user if no users exist
    if (userCount === 0) {
      console.log('No users found. Creating default admin user...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, salt);
      
      // Create admin user
      await prisma.users.create({
        data: {
          id: uuidv4(),
          email: DEFAULT_ADMIN.email.toLowerCase(),
          password: hashedPassword,
          name: DEFAULT_ADMIN.name,
          role: DEFAULT_ADMIN.role,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`Created default admin user: ${DEFAULT_ADMIN.email}`);
      console.log(`Password: ${DEFAULT_ADMIN.password}`);
    }
    
    // 5. Verify password hashing for existing users
    console.log('Verifying password hashing for existing users...');
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        password: true
      }
    });
    
    let fixedUsers = 0;
    
    for (const user of users) {
      // Check if password is properly hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (!user.password.startsWith('$2')) {
        console.log(`Fixing password hash for user: ${user.email}`);
        
        // Hash the password (assuming it's in plain text, which is unlikely but possible)
        // or set a default password if the hash is invalid
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('TemporaryPassword123!', salt);
        
        // Update the user with the new password hash
        await prisma.users.update({
          where: { id: user.id },
          data: { 
            password: hashedPassword,
            updatedAt: new Date()
          }
        });
        
        fixedUsers++;
        console.log(`Reset password for user: ${user.email}`);
        console.log(`New temporary password: TemporaryPassword123!`);
      }
    }
    
    console.log(`Fixed password hashing for ${fixedUsers} users`);
    
    // 6. Check for case sensitivity issues in email addresses
    console.log('Checking for case sensitivity issues in email addresses...');
    const emailCounts = await prisma.$queryRaw`
      SELECT LOWER(email) as lower_email, COUNT(*) 
      FROM "Users" 
      GROUP BY LOWER(email) 
      HAVING COUNT(*) > 1
    `;
    
    if (emailCounts.length > 0) {
      console.log(`Found ${emailCounts.length} email addresses with case sensitivity issues`);
      
      for (const item of emailCounts) {
        const duplicateUsers = await prisma.users.findMany({
          where: {
            email: {
              contains: item.lower_email,
              mode: 'insensitive'
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        });
        
        // Keep the oldest user, update or delete the others
        const primaryUser = duplicateUsers[0];
        const duplicatesToFix = duplicateUsers.slice(1);
        
        console.log(`Fixing duplicates for email: ${item.lower_email}`);
        console.log(`Primary user: ${primaryUser.email} (${primaryUser.id})`);
        
        for (const dupUser of duplicatesToFix) {
          console.log(`Handling duplicate: ${dupUser.email} (${dupUser.id})`);
          
          // Option 1: Delete the duplicate
          await prisma.users.delete({
            where: { id: dupUser.id }
          });
          
          console.log(`Deleted duplicate user: ${dupUser.email}`);
        }
      }
    } else {
      console.log('No case sensitivity issues found in email addresses');
    }
    
    console.log('\n✅ Authentication fix completed successfully!');
    console.log('\nIf you still have issues logging in, please use these credentials:');
    console.log(`Email: ${DEFAULT_ADMIN.email}`);
    console.log(`Password: ${DEFAULT_ADMIN.password}`);
    
  } catch (error) {
    console.error('Error fixing authentication issues:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixAuthIssues()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
