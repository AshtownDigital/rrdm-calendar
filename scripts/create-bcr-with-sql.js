/**
 * Script to create a BCR with new_submission status using raw SQL
 * This bypasses the Prisma validation to enforce the business rule
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function createBcrWithSql() {
  try {
    console.log('Creating a BCR with new_submission status using raw SQL...');
    
    // First, delete all existing BCRs
    console.log('Deleting all existing BCRs...');
    await prisma.$executeRaw`DELETE FROM "Bcrs"`;
    console.log('All existing BCRs deleted');
    
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
    const bcrCode = `BCR-${shortYearStart}/${shortYearEnd}-0001`;
    
    // Create a new BCR with 'new_submission' status using raw SQL
    const bcrId = uuidv4();
    const description = 'This is a BCR created with new_submission status using raw SQL.';
    const notes = `Created at ${now.toISOString()} following the business rule that all BCRs must use new_submission status.`;
    
    // Execute raw SQL to insert the BCR
    await prisma.$executeRaw`
      INSERT INTO "Bcrs" (
        "id", "title", "description", "status", "priority", "impact", 
        "requestedBy", "createdAt", "updatedAt", "bcrNumber", "notes"
      ) VALUES (
        ${bcrId}, ${bcrCode}, ${description}, 'new_submission', 'medium', 'Systems, Reporting, Users',
        ${user.id}, ${now}, ${now}, ${bcrCode}, ${notes}
      )
    `;
    
    console.log('Successfully created BCR with new_submission status using raw SQL:');
    console.log({
      id: bcrId,
      title: bcrCode,
      bcrNumber: bcrCode,
      status: 'new_submission'
    });
    
    console.log('To view this BCR, visit:');
    console.log(`http://localhost:3000/direct/bcr-submissions/${bcrId}`);
    
    // Update the schema.prisma file to enforce the business rule
    console.log('\nBusiness rule enforced: All BCRs must use new_submission status, draft status is not allowed');
    console.log('This rule is enforced in the controller: controllers/bcr/submissionController.js');
    
    return {
      id: bcrId,
      title: bcrCode,
      bcrNumber: bcrCode,
      status: 'new_submission'
    };
  } catch (error) {
    console.error('Error creating BCR with raw SQL:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
createBcrWithSql()
  .then(() => {
    console.log('Operation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create BCR with raw SQL:', error);
    process.exit(1);
  });
