/**
 * Debug BCR View Route
 * 
 * This script simulates the request handling for a BCR view route
 * to identify issues in the process.
 */
require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

// Configure Nunjucks
const viewsDir = path.join(__dirname, '..', 'views');
const env = nunjucks.configure(viewsDir, {
  autoescape: true,
  express: null
});

// Test BCR ID
const bcrId = '5508b605-d4f9-43f0-9ca9-acedf842dd25';

async function debugBcrViewRoute() {
  try {
    console.log('=== DEBUG BCR VIEW ROUTE ===');
    console.log(`Testing BCR view for ID: ${bcrId}`);
    
    // Step 1: Check if the BCR exists in the database
    console.log('\n--- STEP 1: Check if BCR exists ---');
    const bcr = await prisma.bcrs.findUnique({
      where: { id: bcrId }
    });
    
    if (!bcr) {
      console.error(`❌ BCR not found with ID: ${bcrId}`);
      return;
    }
    
    console.log('✅ BCR found:', {
      id: bcr.id,
      bcrNumber: bcr.bcrNumber,
      title: bcr.title,
      status: bcr.status
    });
    
    // Step 2: Check if the template exists
    console.log('\n--- STEP 2: Check if template exists ---');
    const templatePath = path.join(viewsDir, 'modules', 'bcr', 'submission-details.njk');
    if (!fs.existsSync(templatePath)) {
      console.error(`❌ Template not found: ${templatePath}`);
      return;
    }
    console.log(`✅ Template found: ${templatePath}`);
    
    // Step 3: Try to get the BCR with relations using the service method
    console.log('\n--- STEP 3: Get BCR with relations using service method ---');
    const bcrService = require('../services/bcrService');
    const bcrWithRelations = await bcrService.getBcrById(bcrId);
    
    if (!bcrWithRelations) {
      console.error('❌ Failed to get BCR with relations using service method');
    } else {
      console.log('✅ BCR retrieved with service method');
      console.log('Relations included:', {
        requestedBy: bcrWithRelations.Users_Bcrs_requestedByToUsers ? 'Yes' : 'No',
        assignedTo: bcrWithRelations.Users_Bcrs_assignedToToUsers ? 'Yes' : 'No'
      });
    }
    
    // Step 4: Try to get the BCR with relations directly using Prisma
    console.log('\n--- STEP 4: Get BCR with relations directly using Prisma ---');
    const bcrWithRelationsDirect = await prisma.bcrs.findUnique({
      where: { id: bcrId },
      include: {
        Users_Bcrs_requestedByToUsers: true,
        Users_Bcrs_assignedToToUsers: true
      }
    });
    
    if (!bcrWithRelationsDirect) {
      console.error('❌ Failed to get BCR with relations directly using Prisma');
    } else {
      console.log('✅ BCR retrieved directly with Prisma');
      console.log('Relations included:', {
        requestedBy: bcrWithRelationsDirect.Users_Bcrs_requestedByToUsers ? 'Yes' : 'No',
        assignedTo: bcrWithRelationsDirect.Users_Bcrs_assignedToToUsers ? 'Yes' : 'No'
      });
    }
    
    // Step 5: Check if the controller function is correctly implemented
    console.log('\n--- STEP 5: Check controller implementation ---');
    const submissionsController = require('../controllers/bcr/submissionsController');
    console.log('✅ Controller loaded successfully');
    console.log('Controller functions:', Object.keys(submissionsController));
    
    if (typeof submissionsController.viewSubmission !== 'function') {
      console.error('❌ viewSubmission function not found in controller');
      return;
    }
    
    console.log('✅ viewSubmission function exists in controller');
    
    // Step 6: Check if the route is correctly defined
    console.log('\n--- STEP 6: Check route definition ---');
    const bcrRoutes = require('../routes/bcr/index');
    console.log('✅ Routes loaded successfully');
    
    // Step 7: Try to render the template
    console.log('\n--- STEP 7: Try to render the template ---');
    try {
      // Get statuses for the UI
      const statuses = await prisma.bcrConfigs.findMany({
        where: { type: 'status' },
        orderBy: { displayOrder: 'asc' }
      });
      
      // Get users for assignee dropdown
      const users = await prisma.users.findMany({
        orderBy: { name: 'asc' }
      });
      
      const html = nunjucks.render('modules/bcr/submission-details.njk', {
        title: `BCR: ${bcrWithRelationsDirect.title}`,
        bcr: bcrWithRelationsDirect,
        statuses,
        users,
        user: { name: 'Test User', role: 'admin' }
      });
      
      console.log('✅ Template rendered successfully');
      
      // Save the rendered HTML to a file for inspection
      const outputPath = path.join(__dirname, 'bcr-view-output.html');
      fs.writeFileSync(outputPath, html);
      console.log(`✅ Rendered HTML saved to: ${outputPath}`);
    } catch (renderError) {
      console.error('❌ Error rendering template:', renderError);
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Error debugging BCR view route:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBcrViewRoute();
