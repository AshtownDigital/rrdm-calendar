/**
 * Script to populate sample BCR submissions
 * Run with: node scripts/populate-bcr-submissions.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { Submission, Bcr, BcrConfig, Phase, Status } = require('../models/modules/bcr/model');
const User = require('../models/user');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Sample BCR data
const sampleBcrs = [
  {
    title: 'Update Funding Calculation System',
    description: 'The current funding calculation system needs to be updated to accommodate new policy changes.',
    urgencyLevel: 'high',
    impactAreas: ['funding', 'systems']
  },
  {
    title: 'Implement New Reporting Requirements',
    description: 'New reporting requirements have been introduced that need to be implemented in our systems.',
    urgencyLevel: 'medium',
    impactAreas: ['reporting', 'policy']
  },
  {
    title: 'Staff Training for New Process',
    description: 'Staff need to be trained on the new process for handling funding applications.',
    urgencyLevel: 'low',
    impactAreas: ['training', 'users']
  },
  {
    title: 'Critical System Security Update',
    description: 'A critical security vulnerability has been identified in our systems that needs to be addressed immediately.',
    urgencyLevel: 'critical',
    impactAreas: ['systems']
  },
  {
    title: 'Process Optimization for Efficiency',
    description: 'Current processes need to be optimized to improve efficiency and reduce manual work.',
    urgencyLevel: 'medium',
    impactAreas: ['processes', 'users']
  }
];

// Function to generate a BCR number
const generateBcrNumber = (index) => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `BCR-${year}${month}-${(index + 1).toString().padStart(3, '0')}`;
};

// Function to generate a submission code
const generateSubmissionCode = (index) => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const nextYear = (parseInt(year) + 1).toString();
  return `SUB-${year}/${nextYear}-${(index + 1).toString().padStart(3, '0')}`;
};

// Main function to create BCRs
async function createBcrs() {
  try {
    // Get admin user (or create one if not exists)
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      adminUser = new User({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        password: 'password123' // In a real app, this would be hashed
      });
      await adminUser.save();
      console.log('Created admin user');
    }

    // Get phases and statuses
    const phases = await Phase.find({});
    const statuses = await Status.find({});
    
    // Default phase and status if none exist
    let defaultPhase = phases.find(p => p.value === 'initial') || phases[0];
    let defaultStatus = statuses.find(s => s.value === 'pending') || statuses[0];
    
    if (!defaultPhase) {
      defaultPhase = new Phase({
        name: 'Initial',
        value: 'initial',
        displayOrder: 10
      });
      await defaultPhase.save();
      console.log('Created default phase');
    }
    
    if (!defaultStatus) {
      defaultStatus = new Status({
        name: 'Pending',
        value: 'pending',
        displayOrder: 10,
        type: 'standard'
      });
      await defaultStatus.save();
      console.log('Created default status');
    }

    // Create BCRs
    for (let i = 0; i < sampleBcrs.length; i++) {
      const bcrData = sampleBcrs[i];
      
      // Create submission
      const submission = new Submission({
        recordNumber: i + 1,
        submissionCode: generateSubmissionCode(i),
        title: bcrData.title,                // Required field
        description: bcrData.description,     // Required field
        fullName: `${adminUser.firstName} ${adminUser.lastName}`,
        emailAddress: adminUser.email,
        submissionSource: 'Internal',
        organisation: 'RRDM',
        briefDescription: bcrData.title,
        justification: bcrData.description,
        urgencyLevel: bcrData.urgencyLevel,
        impactAreas: bcrData.impactAreas,
        affectedReferenceDataArea: 'Various',
        technicalDependencies: 'None',
        relatedDocuments: 'None',
        attachments: 'No',
        additionalNotes: `Sample BCR submission created for testing - ${bcrData.title}`,
        declaration: true,
        reviewOutcome: 'Pending',
        submittedById: adminUser._id,
        status: 'Pending'
      });
      
      await submission.save();
      console.log(`Created submission: ${submission.title}`);
      
      // Create BCR
      const bcr = new Bcr({
        bcrNumber: generateBcrNumber(i),
        title: bcrData.title,
        description: bcrData.description,
        submissionId: submission._id,
        currentPhaseId: defaultPhase._id,
        currentStatusId: defaultStatus._id
      });
      
      await bcr.save();
      console.log(`Created BCR: ${bcr.bcrNumber} - ${bcr.title}`);
      
      // Update submission with BCR ID
      submission.bcrId = bcr._id;
      await submission.save();
    }
    
    console.log('Sample BCRs created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample BCRs:', error);
    process.exit(1);
  }
}

// Run the function
createBcrs();
