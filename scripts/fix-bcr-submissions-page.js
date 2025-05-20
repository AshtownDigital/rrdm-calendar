/**
 * Script to fix the BCR submissions page
 * This script:
 * 1. Diagnoses the issue with the BCR submissions page
 * 2. Checks the database connection and model capitalization
 * 3. Creates a test BCR if none exist
 * 4. Verifies the impact areas are properly configured
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBcrSubmissionsPage() {
  console.log('Starting BCR submissions page fix...');
  
  try {
    // Step 1: Check database connection
    console.log('\n1. CHECKING DATABASE CONNECTION');
    try {
      const userCount = await prisma.Users.count();
      console.log(`Database connection successful. Found ${userCount} users.`);
    } catch (error) {
      console.error('Database connection error:', error.message);
      return false;
    }
    
    // Step 2: Check BCR model capitalization
    console.log('\n2. CHECKING BCR MODEL CAPITALIZATION');
    
    let bcrCountLowercase = 0;
    let bcrCountCapitalized = 0;
    
    try {
      // @ts-ignore - Testing lowercase model name
      bcrCountLowercase = await prisma.bcrs.count();
      console.log(`Found ${bcrCountLowercase} BCRs using lowercase 'bcrs' model`);
    } catch (error) {
      console.log(`Error with lowercase 'bcrs' model: ${error.message}`);
    }
    
    try {
      bcrCountCapitalized = await prisma.Bcrs.count();
      console.log(`Found ${bcrCountCapitalized} BCRs using capitalized 'Bcrs' model`);
    } catch (error) {
      console.log(`Error with capitalized 'Bcrs' model: ${error.message}`);
    }
    
    // Step 3: Check if BCRs exist, create one if not
    console.log('\n3. CHECKING IF BCRS EXIST');
    
    if (bcrCountCapitalized === 0) {
      console.log('No BCRs found. Creating a test BCR...');
      
      // Get the first admin user
      const adminUser = await prisma.Users.findFirst({
        where: { role: 'admin' }
      });
      
      if (!adminUser) {
        console.log('No admin user found. Creating a test user...');
        
        // Create a test admin user
        const testUser = await prisma.Users.create({
          data: {
            name: 'Test Admin',
            email: 'test.admin@example.com',
            role: 'admin'
          }
        });
        
        console.log(`Created test user with ID: ${testUser.id}`);
      }
      
      const userId = adminUser ? adminUser.id : (await prisma.Users.findFirst()).id;
      
      // Generate a BCR number
      const currentYear = new Date().getFullYear();
      const bcrNumber = `BCR-${currentYear}-0001`;
      
      // Create a test BCR
      const testBcr = await prisma.Bcrs.create({
        data: {
          bcrNumber,
          title: 'Test BCR for Submissions Page',
          description: 'This is a test BCR created to fix the submissions page',
          status: 'new_submission',
          priority: 'Medium',
          impact: 'Systems',
          requestedBy: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`Created test BCR with ID: ${testBcr.id}`);
    } else {
      console.log(`Found ${bcrCountCapitalized} existing BCRs. No need to create a test BCR.`);
    }
    
    // Step 4: Check impact areas
    console.log('\n4. CHECKING IMPACT AREAS');
    
    const impactAreas = await prisma.BcrConfigs.findMany({
      where: { type: 'impact_area' }
    });
    
    if (impactAreas.length === 0) {
      console.log('No impact areas found. Creating standard impact areas...');
      
      const standardImpactAreas = [
        { name: 'Funding', value: 'funding', displayOrder: 1 },
        { name: 'Policy', value: 'policy', displayOrder: 2 },
        { name: 'Processes', value: 'processes', displayOrder: 3 },
        { name: 'Systems', value: 'systems', displayOrder: 4 },
        { name: 'Reporting', value: 'reporting', displayOrder: 5 },
        { name: 'Users', value: 'users', displayOrder: 6 },
        { name: 'Training', value: 'training', displayOrder: 7 },
        { name: 'Other', value: 'other', displayOrder: 8 }
      ];
      
      for (const area of standardImpactAreas) {
        await prisma.BcrConfigs.create({
          data: {
            type: 'impact_area',
            name: area.name,
            value: area.value,
            displayOrder: area.displayOrder
          }
        });
      }
      
      console.log(`Created ${standardImpactAreas.length} standard impact areas`);
    } else {
      console.log(`Found ${impactAreas.length} existing impact areas`);
    }
    
    // Step 5: Check status configurations
    console.log('\n5. CHECKING STATUS CONFIGURATIONS');
    
    const statusConfigs = await prisma.BcrConfigs.findMany({
      where: { type: 'status' }
    });
    
    if (statusConfigs.length === 0) {
      console.log('No status configurations found. Creating standard statuses...');
      
      const standardStatuses = [
        { name: 'New Submission', value: 'new_submission', displayOrder: 1 },
        { name: 'Under Review', value: 'under_review', displayOrder: 2 },
        { name: 'Approved', value: 'approved', displayOrder: 3 },
        { name: 'Rejected', value: 'rejected', displayOrder: 4 },
        { name: 'Implemented', value: 'implemented', displayOrder: 5 }
      ];
      
      for (const status of standardStatuses) {
        await prisma.BcrConfigs.create({
          data: {
            type: 'status',
            name: status.name,
            value: status.value,
            displayOrder: status.displayOrder
          }
        });
      }
      
      console.log(`Created ${standardStatuses.length} standard statuses`);
    } else {
      console.log(`Found ${statusConfigs.length} existing status configurations`);
    }
    
    // Step 6: Check phase configurations
    console.log('\n6. CHECKING PHASE CONFIGURATIONS');
    
    const phaseConfigs = await prisma.BcrConfigs.findMany({
      where: { type: 'phase' }
    });
    
    if (phaseConfigs.length === 0) {
      console.log('No phase configurations found. Creating standard phases...');
      
      const standardPhases = [
        { name: 'Submission', value: 'submission', displayOrder: 1 },
        { name: 'Review', value: 'review', displayOrder: 2 },
        { name: 'Implementation', value: 'implementation', displayOrder: 3 },
        { name: 'Closure', value: 'closure', displayOrder: 4 }
      ];
      
      for (const phase of standardPhases) {
        await prisma.BcrConfigs.create({
          data: {
            type: 'phase',
            name: phase.name,
            value: phase.value,
            displayOrder: phase.displayOrder
          }
        });
      }
      
      console.log(`Created ${standardPhases.length} standard phases`);
    } else {
      console.log(`Found ${phaseConfigs.length} existing phase configurations`);
    }
    
    // Step 7: Create a fix for the bcrService.js file
    console.log('\n7. CREATING FIX FOR BCRSERVICE.JS');
    
    const fs = require('fs');
    const path = require('path');
    
    const bcrServicePath = path.join(__dirname, '..', 'services', 'bcrService.js');
    const bcrServiceContent = fs.readFileSync(bcrServicePath, 'utf8');
    
    // Replace all instances of prisma.bcrs with prisma.Bcrs
    const fixedBcrServiceContent = bcrServiceContent.replace(/prisma\.bcrs\./g, 'prisma.Bcrs.');
    
    // Write the fixed content to a new file
    const fixedBcrServicePath = path.join(__dirname, 'bcrService.js.fixed');
    fs.writeFileSync(fixedBcrServicePath, fixedBcrServiceContent);
    
    console.log(`Created fixed bcrService.js at: ${fixedBcrServicePath}`);
    console.log('To apply the fix, run:');
    console.log(`cp ${fixedBcrServicePath} ${bcrServicePath}`);
    
    // Step 8: Create a fix for the submissionsController.js file
    console.log('\n8. CREATING FIX FOR SUBMISSIONSCONTROLLER.JS');
    
    const submissionsControllerPath = path.join(__dirname, '..', 'controllers', 'bcr', 'submissionsController.js');
    const submissionsControllerContent = fs.readFileSync(submissionsControllerPath, 'utf8');
    
    // Check if there are any references to lowercase bcrs
    const hasLowercaseBcrs = submissionsControllerContent.includes('prisma.bcrs.');
    
    if (hasLowercaseBcrs) {
      console.log('Found lowercase bcrs references in submissionsController.js');
      
      // Replace all instances of prisma.bcrs with prisma.Bcrs
      const fixedSubmissionsControllerContent = submissionsControllerContent.replace(/prisma\.bcrs\./g, 'prisma.Bcrs.');
      
      // Write the fixed content to a new file
      const fixedSubmissionsControllerPath = path.join(__dirname, 'submissionsController.js.fixed');
      fs.writeFileSync(fixedSubmissionsControllerPath, fixedSubmissionsControllerContent);
      
      console.log(`Created fixed submissionsController.js at: ${fixedSubmissionsControllerPath}`);
      console.log('To apply the fix, run:');
      console.log(`cp ${fixedSubmissionsControllerPath} ${submissionsControllerPath}`);
    } else {
      console.log('No lowercase bcrs references found in submissionsController.js');
    }
    
    console.log('\nFix completed successfully.');
    return true;
  } catch (error) {
    console.error('Error fixing BCR submissions page:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix function
fixBcrSubmissionsPage()
  .then((success) => {
    if (success) {
      console.log('\nAll fixes completed. Please apply the fixes and restart the server.');
    } else {
      console.error('\nFix failed. Please check the error messages above.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
