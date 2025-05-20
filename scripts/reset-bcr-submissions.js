/**
 * Reset BCR Submissions Script
 * 
 * This script deletes all existing BCR submissions and creates new ones with proper academic year formatting.
 * Run with: node scripts/reset-bcr-submissions.js
 */
require('dotenv').config();
const { prisma } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Get current academic year (e.g., '25/26' for 2025-2026)
const getCurrentAcademicYear = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Academic year starts in September, so if we're before September, use previous year
  const academicYearStart = currentMonth >= 9 ? currentYear : currentYear - 1;
  const academicYearEnd = academicYearStart + 1;
  
  // Format as YY/YY (e.g., 25/26)
  return `${(academicYearStart % 100).toString().padStart(2, '0')}/${(academicYearEnd % 100).toString().padStart(2, '0')}`;
};

// Sample user IDs - will be updated with actual users from database
const USERS = {
  ADMIN: null,
  BUSINESS: null,
  TECHNICAL: null,
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

// Sample BCR data with statuses that match the In Progress statuses from phases
const SAMPLE_BCRS = [
  {
    title: 'Implement Single Sign-On (SSO)',
    description: 'Implement SSO across all company applications to improve security and user experience.',
    status: 'Submission',
    urgency: 'High',
    impactArea: 'Security',
    submitterOrganisation: 'IT Department',
    submitterName: 'John Smith',
    submitterEmail: 'john.smith@example.com',
    notes: 'Initial submission for SSO implementation across all applications.'
  },
  {
    title: 'Enhance Data Analytics Dashboard',
    description: 'Add new visualizations and filtering capabilities to the analytics dashboard to improve business insights.',
    status: 'Prioritisation',
    urgency: 'Medium',
    impactArea: 'Reporting',
    submitterOrganisation: 'Data Team',
    submitterName: 'Emily Johnson',
    submitterEmail: 'emily.johnson@example.com',
    notes: 'Need to improve data visualization capabilities for better decision making.'
  },
  {
    title: 'Upgrade Database to Latest Version',
    description: 'Upgrade the PostgreSQL database to the latest version to leverage new features and improve performance.',
    status: 'Technical Review and Analysis',
    urgency: 'High',
    impactArea: 'Infrastructure',
    submitterOrganisation: 'Database Team',
    submitterName: 'Michael Brown',
    submitterEmail: 'michael.brown@example.com',
    notes: 'Current database version is becoming outdated and lacks important security features.'
  },
  {
    title: 'Implement GDPR Compliance Features',
    description: 'Add features to ensure compliance with GDPR regulations, including data export, anonymization, and consent management.',
    status: 'Governance Playback',
    urgency: 'Critical',
    impactArea: 'Compliance',
    submitterOrganisation: 'Legal Department',
    submitterName: 'Sarah Williams',
    submitterEmail: 'sarah.williams@example.com',
    notes: 'Regulatory requirement that needs to be implemented by next quarter.'
  },
  {
    title: 'Mobile Application Enhancement',
    description: 'Add new features to the mobile application to improve user experience and functionality.',
    status: 'Stakeholder Consultation',
    urgency: 'Medium',
    impactArea: 'User Interface',
    submitterOrganisation: 'Mobile Team',
    submitterName: 'David Jones',
    submitterEmail: 'david.jones@example.com',
    notes: 'User feedback indicates need for improved mobile experience.'
  },
  {
    title: 'Implement API Rate Limiting',
    description: 'Add rate limiting to public APIs to prevent abuse and ensure fair usage.',
    status: 'Final Drafting',
    urgency: 'Low',
    impactArea: 'Security',
    submitterOrganisation: 'API Team',
    submitterName: 'Jennifer Davis',
    submitterEmail: 'jennifer.davis@example.com',
    notes: 'Recent increase in API abuse requires implementation of rate limiting.'
  },
  {
    title: 'Customer Feedback System',
    description: 'Implement a new customer feedback system to collect and analyze user feedback.',
    status: 'Final Approval',
    urgency: 'Medium',
    impactArea: 'Customer Experience',
    submitterOrganisation: 'Customer Success',
    submitterName: 'Robert Wilson',
    submitterEmail: 'robert.wilson@example.com',
    notes: 'Need better ways to collect and analyze customer feedback.'
  },
  {
    title: 'Data Archiving Solution',
    description: 'Implement a data archiving solution to manage historical data and improve application performance.',
    status: 'Implementation',
    urgency: 'Medium',
    impactArea: 'Data Management',
    submitterOrganisation: 'Data Team',
    submitterName: 'Lisa Miller',
    submitterEmail: 'lisa.miller@example.com',
    notes: 'Database performance is degrading due to large volume of historical data.'
  },
  {
    title: 'Security Vulnerability Patching',
    description: 'Apply security patches to address vulnerabilities identified in recent security audit.',
    status: 'Validation & Testing',
    urgency: 'Critical',
    impactArea: 'Security',
    submitterOrganisation: 'Security Team',
    submitterName: 'Thomas Anderson',
    submitterEmail: 'thomas.anderson@example.com',
    notes: 'Critical security vulnerabilities need to be addressed immediately.'
  },
  {
    title: 'New User Onboarding Workflow',
    description: 'Redesign the user onboarding workflow to improve user experience and reduce drop-off rates.',
    status: 'Go Live',
    urgency: 'High',
    impactArea: 'User Interface',
    submitterOrganisation: 'UX Team',
    submitterName: 'Amanda Clark',
    submitterEmail: 'amanda.clark@example.com',
    notes: 'Current onboarding process has high drop-off rate and needs improvement.'
  }
];

/**
 * Reset BCR submissions data
 */
async function resetBcrSubmissions() {
  try {
    console.log('Starting BCR submissions reset...');
    
    // Get actual users from database
    await validateUsers();
    
    // Ensure BCR configurations exist
    await ensureBcrConfigs();
    
    // Check if we have at least one user to associate with the BCRs
    if (!USERS.ADMIN) {
      console.error('Error: No users found in the database. Cannot create BCRs without a user.');
      return;
    }
    
    // Delete all existing BCRs
    console.log('Deleting existing BCR submissions...');
    const deletedCount = await prisma.bcrs.deleteMany({});
    console.log(`Deleted ${deletedCount.count} existing BCR submissions.`);
    
    // Create new BCRs
    console.log('\nCreating new BCR submissions...');
    
    const academicYear = getCurrentAcademicYear();
    console.log(`Using academic year: ${academicYear}`);
    
    let createdCount = 0;
    
    for (let i = 0; i < SAMPLE_BCRS.length; i++) {
      const bcrData = SAMPLE_BCRS[i];
      
      // Format BCR number with academic year and sequential number
      const recordId = (i + 1).toString().padStart(3, '0');
      const bcrNumber = `BCR-${academicYear}-${recordId}`;
      
      // Map the urgency to the enum_Bcrs_priority values
      const priorityMap = {
        'Critical': 'critical',
        'High': 'high',
        'Medium': 'medium',
        'Low': 'low'
      };
      
      // Create BCR
      await prisma.bcrs.create({
        data: {
          id: uuidv4(),
          bcrNumber: bcrNumber,
          title: bcrData.title,
          description: bcrData.description,
          // Use a default status that matches the enum_Bcrs_status
          status: 'draft',
          priority: priorityMap[bcrData.urgency] || 'medium',
          impact: bcrData.impactArea,
          notes: `${bcrData.notes}\n\nStatus: ${bcrData.status}\nSubmitter: ${bcrData.submitterName} (${bcrData.submitterEmail})\nOrganisation: ${bcrData.submitterOrganisation}`,
          targetDate: new Date(Date.now() + Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000), // Random date within next 90 days
          createdAt: new Date(),
          updatedAt: new Date(),
          // Connect to an existing user
          Users_Bcrs_requestedByToUsers: {
            connect: { id: USERS.ADMIN }
          }
        }
      });
      
      console.log(`Created BCR: ${bcrNumber} - ${bcrData.title}`);
      createdCount++;
    }
    
    console.log(`\nBCR submissions reset completed!`);
    console.log(`Created: ${createdCount} new BCR submissions`);
    
  } catch (error) {
    console.error('Error resetting BCR submissions:', error);
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
    },
    take: 3
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
      type: 'impact_area'
    }
  });
  
  if (impactAreaConfigs.length === 0) {
    console.log('Creating impact area configurations...');
    
    // Create impact area configs
    for (const impactArea of IMPACT_AREAS) {
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'impact_area',
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
  
  // Get the phase statuses to ensure we're using valid status values
  const phaseStatuses = await prisma.bcrConfigs.findMany({
    where: {
      type: 'status',
      NOT: {
        name: {
          startsWith: 'completed:'
        }
      }
    },
    orderBy: {
      displayOrder: 'asc'
    }
  });
  
  if (phaseStatuses.length > 0) {
    console.log(`Found ${phaseStatuses.length} phase statuses.`);
    
    // Update sample BCRs with actual phase status names if available
    for (let i = 0; i < Math.min(SAMPLE_BCRS.length, phaseStatuses.length); i++) {
      SAMPLE_BCRS[i].status = phaseStatuses[i].name;
    }
  }
}

// Run the reset function
resetBcrSubmissions()
  .then(() => {
    console.log('Reset script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Reset script failed:', error);
    process.exit(1);
  });
