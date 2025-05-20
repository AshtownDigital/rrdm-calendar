/**
 * BCR Seed Data Script
 * 
 * This script populates the database with sample BCR data for testing and development.
 * Run with: node scripts/seed-bcr-data.js
 */
require('dotenv').config({ path: '.env.development' });
const { prisma } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Sample user IDs - update these to match existing users in your database
const USERS = {
  ADMIN: '00000000-0000-0000-0000-000000000000', // Default admin user
  BUSINESS: '00000000-0000-0000-0000-000000000000', // Use admin user as business user
  TECHNICAL: '00000000-0000-0000-0000-000000000000', // Use admin user as technical user
};

// Sample impact areas
const IMPACT_AREAS = [
  'Business Process',
  'Customer Experience',
  'Data Management',
  'Infrastructure',
  'Security',
  'Compliance',
  'Reporting',
  'User Interface',
  'Performance',
  'Integration'
];

// Sample BCR data
const SAMPLE_BCRS = [
  {
    title: 'Implement Single Sign-On (SSO)',
    description: 'Implement SSO across all company applications to improve security and user experience.',
    status: 'approved',
    priority: 'high',
    impact: 'Security, User Interface',
    requestedBy: USERS.BUSINESS,
    assignedTo: USERS.TECHNICAL,
    notes: '2025-01-15T10:30:00Z - Admin User: Initial submission\n2025-01-16T14:45:00Z - Technical User: Assigned to development team\n2025-01-20T09:15:00Z - Admin User: Approved for implementation',
    targetDate: new Date('2025-06-30'),
    implementationDate: null
  },
  {
    title: 'Enhance Data Analytics Dashboard',
    description: 'Add new visualizations and filtering capabilities to the analytics dashboard to improve business insights.',
    status: 'under_review',
    priority: 'medium',
    impact: 'Reporting, Business Process, Data Management',
    requestedBy: USERS.BUSINESS,
    assignedTo: USERS.TECHNICAL,
    notes: '2025-02-05T11:20:00Z - Business User: Initial submission\n2025-02-07T13:30:00Z - Admin User: Approved for development\n2025-02-10T09:45:00Z - Technical User: Development started',
    targetDate: new Date('2025-05-15'),
    implementationDate: null
  },
  {
    title: 'Upgrade Database to Latest Version',
    description: 'Upgrade the PostgreSQL database to the latest version to leverage new features and improve performance.',
    status: 'draft',
    priority: 'high',
    impact: 'Infrastructure, Performance, Data Management',
    requestedBy: USERS.TECHNICAL,
    assignedTo: null,
    notes: '2025-03-10T15:45:00Z - Technical User: Initial draft',
    targetDate: new Date('2025-07-01'),
    implementationDate: null
  },
  {
    title: 'Implement GDPR Compliance Features',
    description: 'Add features to ensure compliance with GDPR regulations, including data export, anonymization, and consent management.',
    status: 'submitted',
    priority: 'high',
    impact: 'Compliance, Data Management, Security',
    requestedBy: USERS.BUSINESS,
    assignedTo: null,
    notes: '2025-03-15T09:30:00Z - Business User: Initial submission\n2025-03-16T14:20:00Z - Admin User: Requested additional details',
    targetDate: new Date('2025-06-01'),
    implementationDate: null
  },
  {
    title: 'Mobile Application Enhancement',
    description: 'Add new features to the mobile application to improve user experience and functionality.',
    status: 'implemented',
    priority: 'medium',
    impact: 'User Interface, Customer Experience',
    requestedBy: USERS.BUSINESS,
    assignedTo: USERS.TECHNICAL,
    notes: '2025-01-05T10:15:00Z - Business User: Initial submission\n2025-01-07T11:30:00Z - Admin User: Approved\n2025-02-20T14:45:00Z - Technical User: Implementation completed',
    targetDate: new Date('2025-02-28'),
    implementationDate: new Date('2025-02-20')
  },
  {
    title: 'Implement API Rate Limiting',
    description: 'Add rate limiting to public APIs to prevent abuse and ensure fair usage.',
    status: 'rejected',
    priority: 'low',
    impact: 'Security, Performance',
    requestedBy: USERS.TECHNICAL,
    assignedTo: null,
    notes: '2025-03-01T13:45:00Z - Technical User: Initial submission\n2025-03-05T10:30:00Z - Admin User: Rejected due to current priorities',
    targetDate: new Date('2025-05-15'),
    implementationDate: null
  },
  {
    title: 'Customer Feedback System',
    description: 'Implement a new customer feedback system to collect and analyze user feedback.',
    status: 'draft',
    priority: 'medium',
    impact: 'Customer Experience, Reporting',
    requestedBy: USERS.BUSINESS,
    assignedTo: null,
    notes: '2025-04-10T11:20:00Z - Business User: Initial draft',
    targetDate: new Date('2025-08-01'),
    implementationDate: null
  },
  {
    title: 'Automated Testing Framework',
    description: 'Implement an automated testing framework to improve code quality and reduce regression bugs.',
    status: 'under_review',
    priority: 'high',
    impact: 'Infrastructure, Performance',
    requestedBy: USERS.TECHNICAL,
    assignedTo: USERS.TECHNICAL,
    notes: '2025-02-15T09:30:00Z - Technical User: Initial submission\n2025-02-17T14:15:00Z - Admin User: Approved\n2025-02-20T10:45:00Z - Technical User: Implementation started',
    targetDate: new Date('2025-04-30'),
    implementationDate: null
  },
  {
    title: 'Data Archiving Solution',
    description: 'Implement a data archiving solution to manage historical data and improve application performance.',
    status: 'approved',
    priority: 'medium',
    impact: 'Data Management, Performance',
    requestedBy: USERS.TECHNICAL,
    assignedTo: USERS.TECHNICAL,
    notes: '2025-03-20T13:45:00Z - Technical User: Initial submission\n2025-03-25T10:30:00Z - Admin User: Approved for implementation',
    targetDate: new Date('2025-06-15'),
    implementationDate: null
  },
  {
    title: 'User Role Management Enhancement',
    description: 'Enhance the user role management system to provide more granular access control.',
    status: 'submitted',
    priority: 'medium',
    impact: 'Security, User Interface',
    requestedBy: USERS.BUSINESS,
    assignedTo: null,
    notes: '2025-04-05T11:15:00Z - Business User: Initial submission',
    targetDate: new Date('2025-07-15'),
    implementationDate: null
  }
];

/**
 * Seed BCR data
 */
async function seedBcrData() {
  console.log('Starting BCR data seeding...');
  
  try {
    // Check if users exist
    await validateUsers();
    
    // Check if BCR configs exist
    await ensureBcrConfigs();
    
    // Create BCRs
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const bcrData of SAMPLE_BCRS) {
      // Check if a similar BCR already exists
      const existingBcr = await prisma.bcrs.findFirst({
        where: {
          title: bcrData.title
        }
      });
      
      if (existingBcr) {
        console.log(`Skipping existing BCR: ${bcrData.title}`);
        skippedCount++;
        continue;
      }
      
      // Generate BCR number
      const currentYear = new Date().getFullYear();
      const bcrCount = await prisma.bcrs.count();
      const bcrNumber = `BCR-${currentYear}-${(bcrCount + createdCount + 1).toString().padStart(4, '0')}`;
      
      // Create BCR
      await prisma.bcrs.create({
        data: {
          id: uuidv4(),
          bcrNumber,
          title: bcrData.title,
          description: bcrData.description,
          status: bcrData.status,
          priority: bcrData.priority,
          impact: bcrData.impact,
          requestedBy: bcrData.requestedBy,
          assignedTo: bcrData.assignedTo,
          notes: bcrData.notes,
          targetDate: bcrData.targetDate,
          implementationDate: bcrData.implementationDate,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // Random date within last 30 days
          updatedAt: new Date()
        }
      });
      
      console.log(`Created BCR: ${bcrNumber} - ${bcrData.title}`);
      createdCount++;
    }
    
    console.log(`\nBCR data seeding completed!`);
    console.log(`Created: ${createdCount} BCRs`);
    console.log(`Skipped: ${skippedCount} BCRs (already exist)`);
    
  } catch (error) {
    console.error('Error seeding BCR data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Validate that the user IDs exist in the database
 */
async function validateUsers() {
  console.log('Validating user IDs...');
  
  // Get actual users from database
  const users = await prisma.users.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
  
  if (users.length === 0) {
    console.warn('⚠️ No users found in the database. Using default user IDs.');
    return;
  }
  
  console.log(`Found ${users.length} users in the database.`);
  
  // Update user IDs with actual values from database
  if (users.length >= 1) {
    USERS.ADMIN = users[0].id;
    console.log(`Using user as ADMIN: ${users[0].name} (${users[0].email})`);
  }
  
  if (users.length >= 2) {
    USERS.BUSINESS = users[1].id;
    console.log(`Using user as BUSINESS: ${users[1].name} (${users[1].email})`);
  }
  
  if (users.length >= 3) {
    USERS.TECHNICAL = users[2].id;
    console.log(`Using user as TECHNICAL: ${users[2].name} (${users[2].email})`);
  }
}

/**
 * Ensure BCR configuration data exists
 */
async function ensureBcrConfigs() {
  console.log('Checking BCR configuration data...');
  
  // Check if impactArea configs exist
  const impactAreaConfigs = await prisma.bcrConfigs.findMany({
    where: {
      type: 'impactArea'
    }
  });
  
  if (impactAreaConfigs.length === 0) {
    console.log('Creating impact area configurations...');
    
    // Create impact area configs
    for (const impactArea of IMPACT_AREAS) {
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'impactArea',
          name: impactArea,
          value: impactArea.toLowerCase().replace(/\s+/g, '-'),
          displayOrder: IMPACT_AREAS.indexOf(impactArea),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    console.log(`Created ${IMPACT_AREAS.length} impact area configurations.`);
  } else {
    console.log(`Found ${impactAreaConfigs.length} existing impact area configurations.`);
  }
  
  // Check if status configs exist
  const statusConfigs = await prisma.bcrConfigs.findMany({
    where: {
      type: 'status'
    }
  });
  
  if (statusConfigs.length === 0) {
    console.log('Creating status configurations...');
    
    // Create status configs
    const statuses = [
      { name: 'Draft', value: 'draft' },
      { name: 'Submitted', value: 'submitted' },
      { name: 'Under Review', value: 'under_review' },
      { name: 'Approved', value: 'approved' },
      { name: 'Rejected', value: 'rejected' },
      { name: 'Implemented', value: 'implemented' }
    ];
    
    for (const status of statuses) {
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'status',
          name: status.name,
          value: status.value,
          displayOrder: statuses.indexOf(status),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    console.log(`Created ${statuses.length} status configurations.`);
  } else {
    console.log(`Found ${statusConfigs.length} existing status configurations.`);
  }
}

// Run the seed function
seedBcrData()
  .then(() => {
    console.log('Seed script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
