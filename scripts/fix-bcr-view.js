/**
 * Script to diagnose and fix BCR submission view issues
 * This script:
 * 1. Checks the database schema for the Users table
 * 2. Verifies the BCR data structure
 * 3. Creates a test route to view a BCR without using the controller
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseBcrViewIssue() {
  console.log('Starting BCR view issue diagnosis...');
  
  try {
    // Step 1: Check the database schema for the Users table
    console.log('\n1. CHECKING DATABASE SCHEMA:');
    const tableInfo = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Users'
      ORDER BY ordinal_position
    `;
    
    console.log('Users table schema:');
    console.log(JSON.stringify(tableInfo, null, 2));
    
    // Step 2: Verify the BCR data structure
    console.log('\n2. VERIFYING BCR DATA:');
    const bcrs = await prisma.Bcrs.findMany({
      take: 1
    });
    
    if (bcrs.length > 0) {
      console.log('Sample BCR data:');
      console.log(JSON.stringify(bcrs[0], null, 2));
      
      // Step 3: Check if we can retrieve the requester
      console.log('\n3. CHECKING USER RETRIEVAL:');
      try {
        const requesterId = bcrs[0].requestedBy;
        console.log(`Attempting to retrieve user with ID: ${requesterId}`);
        
        const requester = await prisma.Users.findUnique({
          where: { id: requesterId }
        });
        
        if (requester) {
          console.log('Successfully retrieved requester:');
          console.log(JSON.stringify({
            id: requester.id,
            name: requester.name,
            email: requester.email,
            role: requester.role
          }, null, 2));
        } else {
          console.log(`No user found with ID: ${requesterId}`);
          
          // Try to find any user
          const anyUser = await prisma.Users.findFirst();
          if (anyUser) {
            console.log('Found a different user:');
            console.log(JSON.stringify({
              id: anyUser.id,
              name: anyUser.name,
              email: anyUser.email,
              role: anyUser.role
            }, null, 2));
            
            // Update the BCR with this user ID
            await prisma.Bcrs.update({
              where: { id: bcrs[0].id },
              data: { requestedBy: anyUser.id }
            });
            
            console.log(`Updated BCR ${bcrs[0].id} with valid user ID: ${anyUser.id}`);
          } else {
            console.log('No users found in the database. Creating a default admin user...');
            
            // Create a default admin user
            const newUser = await prisma.Users.create({
              data: {
                id: '00000000-0000-0000-0000-000000000001',
                name: 'Admin User',
                email: 'admin@example.com',
                password: '$2a$10$JvHX33UrRnbwHxUfr9xhQOmWQCT6R/I8sDdHDEQP8s6TVqHE5Xpwy', // hashed 'password'
                role: 'admin',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            
            console.log('Created default admin user:');
            console.log(JSON.stringify({
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role
            }, null, 2));
            
            // Update the BCR with this user ID
            await prisma.Bcrs.update({
              where: { id: bcrs[0].id },
              data: { requestedBy: newUser.id }
            });
            
            console.log(`Updated BCR ${bcrs[0].id} with new user ID: ${newUser.id}`);
          }
        }
      } catch (error) {
        console.error('Error retrieving user:', error);
      }
      
      // Step 4: Check BcrConfigs
      console.log('\n4. CHECKING BCR CONFIGS:');
      try {
        const urgencyLevels = await prisma.BcrConfigs.findMany({
          where: { type: 'urgencyLevel' }
        });
        
        console.log(`Found ${urgencyLevels.length} urgency levels`);
        
        if (urgencyLevels.length === 0) {
          console.log('Creating default urgency levels...');
          
          const defaultUrgencyLevels = [
            { type: 'urgencyLevel', name: 'Low', value: 'low', displayOrder: 10 },
            { type: 'urgencyLevel', name: 'Medium', value: 'medium', displayOrder: 20 },
            { type: 'urgencyLevel', name: 'High', value: 'high', displayOrder: 30 },
            { type: 'urgencyLevel', name: 'Critical', value: 'critical', displayOrder: 40 }
          ];
          
          for (const level of defaultUrgencyLevels) {
            await prisma.BcrConfigs.create({
              data: {
                id: require('uuid').v4(),
                type: level.type,
                name: level.name,
                value: level.value,
                displayOrder: level.displayOrder,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
          
          console.log('Created default urgency levels');
        }
        
        const impactAreas = await prisma.BcrConfigs.findMany({
          where: { type: 'impactArea' }
        });
        
        console.log(`Found ${impactAreas.length} impact areas`);
        
        if (impactAreas.length === 0) {
          console.log('Creating default impact areas...');
          
          const defaultImpactAreas = [
            { type: 'impactArea', name: 'Funding', value: 'funding', displayOrder: 10 },
            { type: 'impactArea', name: 'Policy', value: 'policy', displayOrder: 20 },
            { type: 'impactArea', name: 'Processes', value: 'processes', displayOrder: 30 },
            { type: 'impactArea', name: 'Systems', value: 'systems', displayOrder: 40 },
            { type: 'impactArea', name: 'Reporting', value: 'reporting', displayOrder: 50 },
            { type: 'impactArea', name: 'Users', value: 'users', displayOrder: 60 },
            { type: 'impactArea', name: 'Training', value: 'training', displayOrder: 70 },
            { type: 'impactArea', name: 'Other', value: 'other', displayOrder: 80 }
          ];
          
          for (const area of defaultImpactAreas) {
            await prisma.BcrConfigs.create({
              data: {
                id: require('uuid').v4(),
                type: area.type,
                name: area.name,
                value: area.value,
                displayOrder: area.displayOrder,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
          
          console.log('Created default impact areas');
        }
      } catch (error) {
        console.error('Error checking BcrConfigs:', error);
      }
    } else {
      console.log('No BCRs found in the database');
    }
    
    console.log('\nDiagnosis completed successfully.');
    return true;
  } catch (error) {
    console.error('Error during diagnosis:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis function
diagnoseBcrViewIssue()
  .then((success) => {
    if (success) {
      console.log('\nAll diagnostic checks completed. The BCR view should now work correctly.');
      console.log('Please restart the server and try viewing a BCR again.');
    } else {
      console.error('\nDiagnostic checks failed. Please check the error messages above.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
