/**
 * BCR Test Data Generator
 * 
 * This script generates a variety of BCRs with different statuses, priorities,
 * and other attributes to help with UAT testing.
 * 
 * Usage: node scripts/generate-bcr-test-data.js
 */

require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

// Configuration
const NUM_BCRS_TO_GENERATE = 20;

// Sample data for BCR generation
const TITLES = [
  'Implement Single Sign-On',
  'Upgrade Database System',
  'Migrate to Cloud Infrastructure',
  'Enhance Security Protocols',
  'Implement New API Gateway',
  'Update User Interface',
  'Optimize Backend Performance',
  'Add Mobile Application Support',
  'Implement Data Analytics Dashboard',
  'Integrate with Third-party Services',
  'Implement Automated Testing Framework',
  'Update Compliance Documentation',
  'Enhance Reporting Capabilities',
  'Implement Disaster Recovery Plan',
  'Upgrade Network Infrastructure',
  'Implement Microservices Architecture',
  'Enhance User Authentication',
  'Implement Real-time Notifications',
  'Update Payment Processing System',
  'Implement Customer Feedback System'
];

const DESCRIPTIONS = [
  'This change will improve system security and user experience by implementing a centralized authentication mechanism.',
  'Upgrading our database system to improve performance, scalability, and reliability.',
  'Moving our infrastructure to the cloud to reduce costs and improve scalability.',
  'Enhancing security protocols to protect against emerging threats and ensure compliance with industry standards.',
  'Implementing a new API gateway to improve API management, security, and performance.',
  'Updating the user interface to improve usability, accessibility, and visual appeal.',
  'Optimizing backend performance to reduce latency and improve system responsiveness.',
  'Adding support for mobile applications to reach a wider audience and improve user experience.',
  'Implementing a data analytics dashboard to provide insights into system usage and business metrics.',
  'Integrating with third-party services to extend functionality and improve user experience.',
  'Implementing an automated testing framework to improve code quality and reduce regression bugs.',
  'Updating compliance documentation to ensure adherence to regulatory requirements.',
  'Enhancing reporting capabilities to provide better insights into business operations.',
  'Implementing a disaster recovery plan to ensure business continuity in case of system failures.',
  'Upgrading network infrastructure to improve performance, reliability, and security.',
  'Implementing a microservices architecture to improve scalability, maintainability, and deployment flexibility.',
  'Enhancing user authentication to improve security and user experience.',
  'Implementing real-time notifications to keep users informed about important events.',
  'Updating the payment processing system to support new payment methods and improve security.',
  'Implementing a customer feedback system to gather insights and improve user satisfaction.'
];

const STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'implemented'
];

const PRIORITIES = [
  'low',
  'medium',
  'high',
  'critical'
];

const IMPACT_AREAS = [
  'security',
  'performance',
  'user-interface',
  'infrastructure',
  'compliance',
  'reporting',
  'customer-experience',
  'business-process',
  'data-management',
  'integration'
];

/**
 * Generate a random date between start and end dates
 */
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generate a random array of impact areas
 */
function randomImpactAreas() {
  const numAreas = Math.floor(Math.random() * 3) + 1; // 1 to 3 areas
  const areas = [];
  
  while (areas.length < numAreas) {
    const area = IMPACT_AREAS[Math.floor(Math.random() * IMPACT_AREAS.length)];
    if (!areas.includes(area)) {
      areas.push(area);
    }
  }
  
  return areas.join(', ');
}

/**
 * Generate notes based on BCR status
 */
function generateNotes(status, requestedBy, assignedTo) {
  const now = new Date();
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(now.getMonth() - 2);
  
  let notes = `${randomDate(twoMonthsAgo, now).toISOString()} - ${requestedBy}: Initial submission\n`;
  
  if (status !== 'draft') {
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    notes += `${randomDate(oneMonthAgo, now).toISOString()} - Admin: Submitted for review\n`;
  }
  
  if (['under_review', 'approved', 'rejected', 'implemented'].includes(status)) {
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(now.getDate() - 21);
    notes += `${randomDate(threeWeeksAgo, now).toISOString()} - ${assignedTo}: Under review\n`;
  }
  
  if (['approved', 'implemented'].includes(status)) {
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);
    notes += `${randomDate(twoWeeksAgo, now).toISOString()} - Admin: Approved for implementation\n`;
  }
  
  if (status === 'rejected') {
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    notes += `${randomDate(oneWeekAgo, now).toISOString()} - ${assignedTo}: Rejected due to budget constraints\n`;
  }
  
  if (status === 'implemented') {
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    notes += `${randomDate(oneWeekAgo, now).toISOString()} - ${assignedTo}: Implementation completed\n`;
  }
  
  return notes;
}

/**
 * Generate BCR test data
 */
async function generateBcrTestData() {
  console.log('Starting BCR test data generation...');
  
  try {
    // Get admin user for BCR creation
    const adminUser = await prisma.users.findFirst();
    
    if (!adminUser) {
      console.error('No admin user found in the database. Please create a user first.');
      return;
    }
    
    console.log(`Using user as admin: ${adminUser.name} (${adminUser.email})`);
    
    // Get highest BCR number to avoid duplicates
    const highestBcr = await prisma.bcrs.findFirst({
      orderBy: {
        bcrNumber: 'desc'
      }
    });
    
    // Extract the sequence number from the highest BCR number or start from 1000
    let startingSequence = 1000;
    const currentYear = new Date().getFullYear();
    
    if (highestBcr && highestBcr.bcrNumber) {
      const match = highestBcr.bcrNumber.match(/BCR-\d{4}-(\d{4})/);
      if (match && match[1]) {
        startingSequence = parseInt(match[1], 10) + 1;
      }
    }
    
    // Create BCRs
    let createdCount = 0;
    
    for (let i = 0; i < NUM_BCRS_TO_GENERATE; i++) {
      const titleIndex = Math.floor(Math.random() * TITLES.length);
      const descriptionIndex = Math.floor(Math.random() * DESCRIPTIONS.length);
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
      const impact = randomImpactAreas();
      
      // Generate dates
      const now = new Date();
      const sixMonthsLater = new Date(now);
      sixMonthsLater.setMonth(now.getMonth() + 6);
      
      const targetDate = randomDate(now, sixMonthsLater);
      let implementationDate = null;
      
      if (status === 'implemented') {
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        implementationDate = randomDate(oneMonthAgo, now);
      }
      
      // Generate notes
      const notes = generateNotes(status, adminUser.name, adminUser.name);
      
      // Generate BCR number
      const bcrNumber = `BCR-${currentYear}-${(startingSequence + createdCount).toString().padStart(4, '0')}`;
      
      // Create BCR
      const bcr = await prisma.bcrs.create({
        data: {
          id: uuidv4(),
          bcrNumber,
          title: `${TITLES[titleIndex]} ${i + 1}`,
          description: DESCRIPTIONS[descriptionIndex],
          status,
          priority,
          impact,
          requestedBy: adminUser.id,
          assignedTo: adminUser.id,
          targetDate,
          implementationDate,
          notes,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`Created BCR: ${bcr.bcrNumber} - ${bcr.title}`);
      createdCount++;
    }
    
    console.log(`\nBCR test data generation completed!`);
    console.log(`Created: ${createdCount} BCRs`);
  } catch (error) {
    console.error('Error generating BCR test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the generator
generateBcrTestData();
