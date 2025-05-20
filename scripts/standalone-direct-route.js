
/**
 * Standalone direct route handler for BCR submissions
 * This can be used to test the direct route without modifying server.js
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const port = 3001;

// Set up view engine
app.set('view engine', 'njk');
app.set('views', './views');

// Direct access route for viewing individual BCR submissions
app.get('/direct/bcr-submissions/:id', async (req, res) => {
  try {
    console.log('Direct BCR submission view route called for ID:', req.params.id);
    
    // Create a mock user with admin privileges
    const user = {
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
      console.log('Error with capitalized Bcrs model:', error.message);
      try {
        bcr = await prisma.bcrs.findUnique({
          where: { id: req.params.id }
        });
      } catch (error) {
        console.log('Error with lowercase bcrs model:', error.message);
      }
    }
    
    if (!bcr) {
      console.log(`BCR with ID ${req.params.id} not found`);
      return res.status(404).send({
        title: 'Not Found',
        message: `BCR with ID ${req.params.id} not found.`
      });
    }
    
    // Return the BCR data as JSON
    return res.json({
      title: `BCR ${bcr.bcrNumber || bcr.id}`,
      bcr,
      submission: {
        bcrId: bcr.id,
        bcrCode: bcr.bcrNumber,
        description: bcr.description,
        priority: bcr.priority,
        impact: bcr.impact,
        requestedBy: bcr.requestedBy,
        createdAt: bcr.createdAt,
        updatedAt: bcr.updatedAt
      },
      workflow: {
        bcrId: bcr.id,
        status: bcr.status,
        assignedTo: bcr.assignedTo,
        targetDate: bcr.targetDate,
        implementationDate: bcr.implementationDate,
        notes: bcr.notes,
        createdAt: bcr.createdAt,
        updatedAt: bcr.updatedAt
      },
      user
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
  console.log(`Standalone direct route handler running at http://localhost:${port}`);
  console.log(`Test the route at: http://localhost:${port}/direct/bcr-submissions/d2b31bc1-e659-4d01-a09c-ae60a18851ee`);
});
