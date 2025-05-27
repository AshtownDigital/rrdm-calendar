/**
 * Script to initialize workflow phases and statuses for the BCR process
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Phase = require('../models/Phase');
const Status = require('../models/Status');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Initial workflow statuses
const initialStatuses = [
  {
    name: 'Submitted',
    description: 'BCR has been submitted and is awaiting review',
    displayOrder: 1,
    color: 'blue'
  },
  {
    name: 'In Review',
    description: 'BCR is currently being reviewed',
    displayOrder: 2,
    color: 'purple'
  },
  {
    name: 'Approved',
    description: 'BCR has been approved',
    displayOrder: 3,
    color: 'green'
  },
  {
    name: 'Rejected',
    description: 'BCR has been rejected',
    displayOrder: 4,
    color: 'red'
  },
  {
    name: 'Implementation Started',
    description: 'Implementation of the BCR has started',
    displayOrder: 5,
    color: 'orange'
  },
  {
    name: 'Implementation Complete',
    description: 'Implementation of the BCR is complete',
    displayOrder: 6,
    color: 'green'
  },
  {
    name: 'Deployed to Production',
    description: 'Changes have been deployed to production',
    displayOrder: 7,
    color: 'turquoise'
  },
  {
    name: 'Closed',
    description: 'BCR process is complete and closed',
    displayOrder: 8,
    color: 'grey'
  }
];

// Initial workflow phases
const initialPhases = [
  {
    name: 'Submission',
    description: 'Initial submission phase',
    displayOrder: 1,
    color: 'blue'
  },
  {
    name: 'Review',
    description: 'Review phase',
    displayOrder: 2,
    color: 'purple'
  },
  {
    name: 'Implementation',
    description: 'Implementation phase',
    displayOrder: 3,
    color: 'orange'
  },
  {
    name: 'Deployment',
    description: 'Deployment phase',
    displayOrder: 4,
    color: 'turquoise'
  },
  {
    name: 'Closure',
    description: 'Closure phase',
    displayOrder: 5,
    color: 'grey'
  }
];

// Function to initialize workflow data
async function initWorkflowData() {
  try {
    console.log('Initializing workflow data...');
    
    // Create statuses
    console.log('Creating workflow statuses...');
    const statusMap = {};
    for (const statusData of initialStatuses) {
      // Check if status already exists
      const existingStatus = await Status.findOne({ name: statusData.name });
      if (existingStatus) {
        console.log(`Status "${statusData.name}" already exists, skipping...`);
        statusMap[statusData.name] = existingStatus._id;
        continue;
      }
      
      // Create new status
      const status = new Status(statusData);
      await status.save();
      console.log(`Created status: ${status.name}`);
      statusMap[status.name] = status._id;
    }
    
    // Create phases and link to statuses
    console.log('\nCreating workflow phases...');
    for (const phaseData of initialPhases) {
      // Check if phase already exists
      const existingPhase = await Phase.findOne({ name: phaseData.name });
      if (existingPhase) {
        console.log(`Phase "${phaseData.name}" already exists, skipping...`);
        continue;
      }
      
      // Set appropriate statuses for each phase
      let inProgressStatusId, completedStatusId;
      
      switch (phaseData.name) {
        case 'Submission':
          inProgressStatusId = statusMap['Submitted'];
          completedStatusId = statusMap['In Review'];
          break;
        case 'Review':
          inProgressStatusId = statusMap['In Review'];
          completedStatusId = statusMap['Approved'];
          break;
        case 'Implementation':
          inProgressStatusId = statusMap['Implementation Started'];
          completedStatusId = statusMap['Implementation Complete'];
          break;
        case 'Deployment':
          inProgressStatusId = statusMap['Implementation Complete'];
          completedStatusId = statusMap['Deployed to Production'];
          break;
        case 'Closure':
          inProgressStatusId = statusMap['Deployed to Production'];
          completedStatusId = statusMap['Closed'];
          break;
        default:
          inProgressStatusId = null;
          completedStatusId = null;
      }
      
      // Create new phase
      const phase = new Phase({
        ...phaseData,
        inProgressStatusId,
        completedStatusId
      });
      
      await phase.save();
      console.log(`Created phase: ${phase.name}`);
      
      // Update statuses with phase ID
      if (inProgressStatusId) {
        await Status.findByIdAndUpdate(inProgressStatusId, { phaseId: phase._id });
      }
      if (completedStatusId) {
        await Status.findByIdAndUpdate(completedStatusId, { phaseId: phase._id });
      }
    }
    
    console.log('\nWorkflow data initialization complete!');
    
  } catch (error) {
    console.error('Error initializing workflow data:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the initialization function
initWorkflowData();
