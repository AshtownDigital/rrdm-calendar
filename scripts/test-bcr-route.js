/**
 * Test BCR Route
 * 
 * This script tests the BCR route by simulating a request to the server
 * and logging the response.
 */
require('dotenv').config({ path: '.env.development' });
const express = require('express');
const path = require('path');
const nunjucks = require('nunjucks');
const dateFilter = require('nunjucks-date-filter');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Configure Nunjucks
const viewsDir = path.join(__dirname, '..', 'views');
app.set('view engine', 'njk');
app.set('views', viewsDir);

const env = nunjucks.configure(viewsDir, {
  autoescape: true,
  express: app,
  watch: true
});

// Add date filter
env.addFilter('date', dateFilter);

// Test BCR ID
const bcrId = '5508b605-d4f9-43f0-9ca9-acedf842dd25';

// Create a test route
app.get('/test-bcr', async (req, res) => {
  try {
    console.log('Fetching BCR with ID:', bcrId);
    
    // Get the BCR with relations
    const bcr = await prisma.bcrs.findUnique({
      where: { id: bcrId },
      include: {
        Users_Bcrs_requestedByToUsers: true,
        Users_Bcrs_assignedToToUsers: true
      }
    });
    
    if (!bcr) {
      console.error('BCR not found');
      return res.status(404).send('BCR not found');
    }
    
    console.log('BCR found:', {
      id: bcr.id,
      bcrNumber: bcr.bcrNumber,
      title: bcr.title,
      status: bcr.status,
      requestedBy: bcr.Users_Bcrs_requestedByToUsers ? bcr.Users_Bcrs_requestedByToUsers.name : 'Not assigned',
      assignedTo: bcr.Users_Bcrs_assignedToToUsers ? bcr.Users_Bcrs_assignedToToUsers.name : 'Not assigned'
    });
    
    // Get statuses for the UI
    const statuses = await prisma.bcrConfigs.findMany({
      where: { type: 'status' },
      orderBy: { displayOrder: 'asc' }
    });
    
    console.log(`Found ${statuses.length} status configurations`);
    
    // Get users for assignee dropdown
    const users = await prisma.users.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${users.length} users`);
    
    // Render the template
    console.log('Attempting to render template: modules/bcr/submission-details.njk');
    res.render('modules/bcr/submission-details.njk', {
      title: `BCR: ${bcr.title}`,
      bcr,
      statuses,
      users,
      user: { name: 'Test User', role: 'admin' }
    });
    
    console.log('Template rendered successfully');
  } catch (error) {
    console.error('Error in test route:', error);
    res.status(500).send(`Error: ${error.message}\n\n${error.stack}`);
  }
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}/test-bcr`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
