/**
 * Test BCR View Script
 * 
 * This script tests the BCR view functionality by directly accessing the database
 * and rendering the template with the retrieved data.
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
const bcrId = '2ad4d498-0a0f-497e-a6d6-de97dfa8a910';

async function testBcrView() {
  try {
    console.log(`Testing BCR view for ID: ${bcrId}`);
    
    // Check if the template exists
    const templatePath = path.join(viewsDir, 'modules', 'bcr', 'submission-details.njk');
    if (!fs.existsSync(templatePath)) {
      console.error(`❌ Template not found: ${templatePath}`);
      return;
    }
    console.log(`✅ Template found: ${templatePath}`);
    
    // Try to get the BCR directly from the database
    const bcr = await prisma.bcrs.findUnique({
      where: { id: bcrId },
      include: {
        requestedByUser: true,
        assignedToUser: true
      }
    });
    
    if (!bcr) {
      console.error(`❌ BCR not found with ID: ${bcrId}`);
      return;
    }
    
    console.log(`✅ BCR found: ${bcr.bcrNumber} - ${bcr.title}`);
    
    // For backward compatibility with templates
    bcr.Users_Bcrs_requestedByToUsers = bcr.requestedByUser;
    bcr.Users_Bcrs_assignedToToUsers = bcr.assignedToUser;
    
    // Get statuses for the UI
    const statuses = await prisma.bcrConfigs.findMany({
      where: { type: 'status' },
      orderBy: { displayOrder: 'asc' }
    });
    
    console.log(`✅ Found ${statuses.length} status configurations`);
    
    // Get users for assignee dropdown
    const users = await prisma.users.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`✅ Found ${users.length} users`);
    
    // Try to render the template
    try {
      const html = nunjucks.render('modules/bcr/submission-details.njk', {
        title: `BCR: ${bcr.title}`,
        bcr,
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
    
  } catch (error) {
    console.error('❌ Error testing BCR view:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBcrView();
