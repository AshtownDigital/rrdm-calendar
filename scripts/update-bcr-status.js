/**
 * Script to update the BCR status enum and set the default status to 'new_submission'
 * This script will:
 * 1. Delete all existing BCRs
 * 2. Create the enum_Bcrs_status type if it doesn't exist
 * 3. Create a sample BCR with 'new_submission' status
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');
const prisma = new PrismaClient();

async function updateBcrStatus() {
  try {
    console.log('Starting BCR status update...');
    
    // Step 1: Delete all existing BCRs
    console.log('Deleting all existing BCRs...');
    const beforeCount = await prisma.bcrs.count();
    console.log(`Current BCR count: ${beforeCount}`);
    
    const deleteResult = await prisma.bcrs.deleteMany({});
    console.log(`Successfully deleted ${deleteResult.count} BCR records`);
    
    // Step 2: Update the database schema to include 'new_submission' status
    console.log('Updating database schema...');
    try {
      // Create the enum type with all statuses including 'new_submission'
      const createEnumSQL = `
        DO $$
        BEGIN
          -- Check if the enum type exists
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_bcrs_status') THEN
            -- Create the enum type with all statuses
            CREATE TYPE "enum_Bcrs_status" AS ENUM (
              'new',
              'new_submission',
              'being_prioritised',
              'under_technical_review',
              'in_governance_review',
              'consulting_stakeholders',
              'drafting_in_progress',
              'awaiting_final_approval',
              'being_implemented',
              'testing_in_progress',
              'preparing_for_go_live',
              'under_post_implementation_review',
              'closing',
              'draft',
              'submitted',
              'under_review',
              'approved',
              'rejected',
              'implemented'
            );
            
            -- Set the default status for the Bcrs table
            ALTER TABLE "Bcrs" ALTER COLUMN "status" SET DEFAULT 'new_submission'::"enum_Bcrs_status";
            
            RAISE NOTICE 'Created enum_Bcrs_status type and set default to new_submission';
          ELSE
            -- Update the default status for the Bcrs table
            ALTER TABLE "Bcrs" ALTER COLUMN "status" SET DEFAULT 'new_submission'::"enum_Bcrs_status";
            
            RAISE NOTICE 'Updated default status to new_submission';
          END IF;
        END
        $$;
      `;
      
      // Execute the SQL directly using psql
      execSync(`psql -U postgres -d rrdm_local -c "${createEnumSQL.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
      console.log('Database schema updated successfully');
    } catch (error) {
      console.error('Error updating database schema:', error);
      // Continue with the script even if this step fails
    }
    
    // Step 3: Create a sample BCR with 'new_submission' status
    console.log('Creating a sample BCR with new_submission status...');
    
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
    
    // Create a new BCR with 'new_submission' status
    try {
      const bcr = await prisma.bcrs.create({
        data: {
          id: uuidv4(),
          title: bcrCode,
          description: 'This is a sample BCR created with new_submission status.',
          status: 'new_submission',
          priority: 'medium',
          impact: 'Systems, Reporting, Users',
          requestedBy: user.id,
          notes: `Created at ${now.toISOString()} as a test BCR with new_submission status.`,
          createdAt: now,
          updatedAt: now,
          bcrNumber: bcrCode
        }
      });
      
      console.log('Successfully created sample BCR:');
      console.log({
        id: bcr.id,
        title: bcr.title,
        bcrNumber: bcr.bcrNumber,
        status: bcr.status
      });
      
      console.log('To view this BCR, visit:');
      console.log(`http://localhost:3000/direct/bcr-submissions/${bcr.id}`);
      console.log(`http://localhost:3000/direct/bcr-edit/${bcr.id}`);
    } catch (error) {
      console.error('Error creating sample BCR:', error);
      
      // If we can't create with 'new_submission', try with 'draft'
      console.log('Trying to create BCR with draft status instead...');
      const bcr = await prisma.bcrs.create({
        data: {
          id: uuidv4(),
          title: bcrCode,
          description: 'This is a sample BCR created with draft status.',
          status: 'draft',
          priority: 'medium',
          impact: 'Systems, Reporting, Users',
          requestedBy: user.id,
          notes: `Created at ${now.toISOString()} as a test BCR with draft status.`,
          createdAt: now,
          updatedAt: now,
          bcrNumber: bcrCode
        }
      });
      
      console.log('Successfully created sample BCR with draft status:');
      console.log({
        id: bcr.id,
        title: bcr.title,
        bcrNumber: bcr.bcrNumber,
        status: bcr.status
      });
      
      console.log('To view this BCR, visit:');
      console.log(`http://localhost:3000/direct/bcr-submissions/${bcr.id}`);
      console.log(`http://localhost:3000/direct/bcr-edit/${bcr.id}`);
    }
    
    console.log('Operation completed successfully');
    return true;
  } catch (error) {
    console.error('Error updating BCR status:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
updateBcrStatus()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Failed to update BCR status:', error);
    process.exit(1);
  });
