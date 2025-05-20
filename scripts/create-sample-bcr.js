// Script to create a sample BCR record in the database
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function createSampleBcr() {
  try {
    console.log('Creating a sample BCR record...');
    
    // Create a sample user if none exists
    let user = await prisma.users.findFirst();
    
    if (!user) {
      console.log('No users found. Creating a sample user...');
      user = await prisma.users.create({
        data: {
          id: uuidv4(),
          email: 'admin@example.com',
          password: '$2a$10$JvHX/ORZ3yfAu2TqUf6xc.6QkxV5OoRPzDkwAWctUNQnW9WNc0V7e', // hashed 'password'
          name: 'Admin User',
          role: 'admin',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('Sample user created:', user.email);
    } else {
      console.log('Using existing user:', user.email);
    }
    
    // Generate a proper BCR code in the format BCR-YY/YY-XXXX
    const now = new Date();
    const fiscalYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fiscalYearEnd = fiscalYearStart + 1;
    const shortYearStart = fiscalYearStart.toString().slice(-2);
    const shortYearEnd = fiscalYearEnd.toString().slice(-2);
    const bcrCode = `BCR-${shortYearStart}/${shortYearEnd}-0001`;
    
    // Create a new BCR with the new format and status
    const bcr = await prisma.bcrs.create({
      data: {
        id: uuidv4(),
        title: bcrCode,
        description: 'This is a sample BCR created for testing the new BCR submission workflow.',
        status: 'draft', // Using an existing status value
        priority: 'medium',
        impact: 'Systems, Reporting, Users',
        requestedBy: user.id,
        notes: `Created at ${now.toISOString()} as a test BCR with the new submission workflow.`,
        createdAt: now,
        updatedAt: now,
        bcrNumber: bcrCode // Store the BCR code in the bcrNumber field as well
      }
    });
    
    console.log('Successfully created sample BCR:');
    console.log({
      id: bcr.id,
      title: bcr.title,
      bcrNumber: bcr.bcrNumber,
      status: bcr.status
    });
    
    return bcr;
  } catch (error) {
    console.error('Error creating sample BCR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
createSampleBcr()
  .then((bcr) => {
    console.log('Operation completed successfully');
    console.log('To view this BCR, visit:');
    console.log(`http://localhost:3000/direct/bcr-submissions/${bcr.id}`);
    console.log(`http://localhost:3000/direct/bcr-edit/${bcr.id}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create sample BCR:', error);
    process.exit(1);
  });
