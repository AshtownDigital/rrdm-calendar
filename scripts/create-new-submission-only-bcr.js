/**
 * Script to create a BCR with new_submission status only
 * This enforces the business rule that all BCRs must use new_submission status
 * and draft status is not allowed
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function createNewSubmissionBcr() {
  try {
    console.log('Creating a BCR with new_submission status...');
    
    // Get a sample user
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
    
    // Find the highest BCR number for the current fiscal year
    let nextId = 1000;
    try {
      const highestBcr = await prisma.bcrs.findFirst({
        where: {
          bcrNumber: {
            startsWith: `BCR-${shortYearStart}/${shortYearEnd}-`
          }
        },
        orderBy: {
          bcrNumber: 'desc'
        }
      });
      
      if (highestBcr && highestBcr.bcrNumber) {
        const parts = highestBcr.bcrNumber.split('-');
        const lastPart = parts[parts.length - 1];
        const lastId = parseInt(lastPart, 10);
        if (!isNaN(lastId)) {
          nextId = lastId + 1;
        }
      }
    } catch (error) {
      console.error('Error finding highest BCR number:', error);
      // If there's an error, just use the default nextId value
    }
    
    const bcrCode = `BCR-${shortYearStart}/${shortYearEnd}-${nextId.toString().padStart(4, '0')}`;
    
    // Create a new BCR with 'new_submission' status
    const bcr = await prisma.bcrs.create({
      data: {
        id: uuidv4(),
        title: bcrCode,
        description: 'This is a BCR created with new_submission status following the business rule.',
        status: 'new_submission', // BUSINESS RULE: All BCRs must use 'new_submission' status, 'draft' status is not allowed
        priority: 'medium',
        impact: 'Systems, Reporting, Users',
        requestedBy: user.id,
        notes: `Created at ${now.toISOString()} following the business rule that all BCRs must use new_submission status.`,
        createdAt: now,
        updatedAt: now,
        bcrNumber: bcrCode
      }
    });
    
    console.log('Successfully created BCR with new_submission status:');
    console.log({
      id: bcr.id,
      title: bcr.title,
      bcrNumber: bcr.bcrNumber,
      status: bcr.status
    });
    
    console.log('To view this BCR, visit:');
    console.log(`http://localhost:3000/direct/bcr-submissions/${bcr.id}`);
    
    return bcr;
  } catch (error) {
    console.error('Error creating BCR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
createNewSubmissionBcr()
  .then(() => {
    console.log('Operation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create BCR:', error);
    process.exit(1);
  });
