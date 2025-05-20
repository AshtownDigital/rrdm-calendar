
/**
 * Standalone server for testing the direct BCR submission route
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const nunjucks = require('nunjucks');

const app = express();
const port = 3001;

// Set up view engine
app.set('view engine', 'njk');
app.set('views', path.join(__dirname, '..', 'views'));

// Configure Nunjucks
const env = nunjucks.configure(path.join(__dirname, '..', 'views'), {
  autoescape: true,
  express: app
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Direct access route for viewing individual BCR submissions
app.get('/direct/bcr-submissions/:id', async (req, res) => {
  try {
    console.log('Direct BCR submission view route called for ID:', req.params.id);
    
    // Create a mock user with admin privileges
    req.user = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    };
    
    // Get the BCR directly to check if it exists
    let bcr = null;
    try {
      bcr = await prisma.Bcrs.findUnique({
        where: { id: req.params.id }
      });
    } catch (error) {
      console.log('Error with Bcrs model:', error.message);
    }
    
    if (!bcr) {
      console.log(`BCR with ID ${req.params.id} not found`);
      return res.status(404).send({
        title: 'Not Found',
        message: `BCR with ID ${req.params.id} not found.`
      });
    }
    
    // Create submission and workflow objects directly from BCR data
    const submission = {
      bcrId: bcr.id,
      bcrCode: bcr.bcrNumber,
      description: bcr.description,
      priority: bcr.priority,
      impact: bcr.impact,
      requestedBy: bcr.requestedBy,
      createdAt: bcr.createdAt,
      updatedAt: bcr.updatedAt
    };
    
    const workflow = {
      bcrId: bcr.id,
      status: bcr.status,
      assignedTo: bcr.assignedTo,
      targetDate: bcr.targetDate,
      implementationDate: bcr.implementationDate,
      notes: bcr.notes,
      createdAt: bcr.createdAt,
      updatedAt: bcr.updatedAt
    };
    
    // Get the user who requested the BCR
    let requester = null;
    try {
      requester = await prisma.Users.findUnique({
        where: { id: bcr.requestedBy }
      });
    } catch (error) {
      console.log('Error retrieving requester:', error.message);
    }
    
    // Get the user who is assigned to the BCR
    let assignee = null;
    if (bcr.assignedTo) {
      try {
        assignee = await prisma.Users.findUnique({
          where: { id: bcr.assignedTo }
        });
      } catch (error) {
        console.log('Error retrieving assignee:', error.message);
      }
    }
    
    // Get urgency levels and impact areas
    let urgencyLevels = [];
    let impactAreas = [];
    try {
      urgencyLevels = await prisma.BcrConfigs.findMany({
        where: { type: 'urgencyLevel' },
        orderBy: { displayOrder: 'asc' }
      });
      
      impactAreas = await prisma.BcrConfigs.findMany({
        where: { type: 'impactArea' },
        orderBy: { displayOrder: 'asc' }
      });
    } catch (error) {
      console.log('Error retrieving BCR configs:', error.message);
    }
    
    // Render the template with all available data
    return res.render('modules/bcr/submission-details', {
      title: `BCR ${bcr.bcrNumber || bcr.id}`,
      bcr,
      submission,
      workflow,
      requester,
      assignee,
      urgencyLevels,
      impactAreas,
      user: req.user
    });
  } catch (error) {
    console.error('Error in direct BCR submission view route:', error);
    res.status(500).send({
      title: 'Error',
      message: 'An unexpected error occurred while trying to view the BCR submission.',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Standalone server running at http://localhost:${port}`);
  console.log(`Test the direct route at: http://localhost:${port}/direct/bcr-submissions/d2b31bc1-e659-4d01-a09c-ae60a18851ee`);
});
