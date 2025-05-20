/**
 * Test script to render the phase-status-mapping template directly
 * This bypasses authentication for testing purposes
 */
const path = require('path');
const express = require('express');
const nunjucks = require('nunjucks');
const { PrismaClient } = require('@prisma/client');
const bcrConfigService = require('../services/bcrConfigService');

const app = express();
const prisma = new PrismaClient();
const port = 3001;

// Configure Nunjucks
const viewsPath = path.join(__dirname, '../views');
nunjucks.configure(viewsPath, {
  autoescape: true,
  express: app
});

app.set('view engine', 'njk');

// Serve static files
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));
app.use('/stylesheets', express.static(path.join(__dirname, '../public/stylesheets')));
app.use('/scripts', express.static(path.join(__dirname, '../public/scripts')));

// Test route to render the phase-status-mapping template
app.get('/', async (req, res) => {
  try {
    // Get configuration data from database using services
    const phases = await bcrConfigService.getConfigsByType('phase');
    const statuses = await bcrConfigService.getConfigsByType('status');
    
    // Create a mapping of phases to statuses for the UI
    const phaseStatusMapping = {};
    
    // Initialize the mapping with empty arrays for each phase
    phases.forEach(phase => {
      phaseStatusMapping[phase.id] = [];
    });
    
    // Populate the mapping with statuses
    statuses.forEach(status => {
      const phaseId = status.value;
      if (phaseStatusMapping[phaseId]) {
        phaseStatusMapping[phaseId].push(status);
      }
    });
    
    // Add nextPhase property to each phase for the workflow diagram
    phases.forEach((phase, index) => {
      // If not the last phase, set nextPhase to the next phase's id
      if (index < phases.length - 1) {
        phase.nextPhase = phases[index + 1].id;
      } else {
        phase.nextPhase = null;
      }
      
      // Add a description if missing
      if (!phase.description) {
        phase.description = `Phase ${phase.id}: ${phase.name}`;
      }
    });
    
    // Render the template with data
    res.render('modules/bcr/phase-status-mapping.njk', {
      title: 'BCR Phase-Status Mapping',
      phases,
      statuses,
      phaseStatusMapping,
      user: { name: 'Test User', email: 'test@example.com' }
    });
  } catch (error) {
    console.error('Error loading BCR phase-status mapping:', error);
    res.status(500).send('Error loading BCR phase-status mapping');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});
