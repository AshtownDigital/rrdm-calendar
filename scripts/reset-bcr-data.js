/**
 * Reset BCR Data Script
 * 
 * This script deletes all existing BCR submissions and recreates seed data
 * that is compatible with the submission-details.njk template.
 */
require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Generate a BCR number in the format BCR-YYYY-NNNN
const generateBcrNumber = (index) => {
  const year = new Date().getFullYear();
  const number = String(index + 1).padStart(4, '0');
  return `BCR-${year}-${number}`;
};

// Generate a random date within the last 30 days
const getRandomDate = () => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  now.setDate(now.getDate() - daysAgo);
  return now;
};

// Create a history entry
const createHistoryEntry = (userId, action, date) => {
  return {
    userId,
    action,
    timestamp: date,
    details: {
      note: `Automated ${action} action from seed script`
    }
  };
};

// Create a workflow history entry
const createWorkflowHistoryEntry = (userId, fromPhase, toPhase, date) => {
  return {
    userId,
    fromPhase,
    toPhase,
    timestamp: date,
    note: `Moved from ${fromPhase} to ${toPhase}`
  };
};

// Sample BCR titles
const bcrTitles = [
  'Update User Authentication System',
  'Implement New Dashboard Features',
  'Migrate Database to Cloud Platform',
  'Add Export to CSV Functionality',
  'Enhance Security Protocols',
  'Optimize API Performance',
  'Implement Multi-factor Authentication',
  'Create New Reporting Module',
  'Refactor Legacy Code Base',
  'Integrate with Third-party Services'
];

// Sample BCR descriptions
const bcrDescriptions = [
  'This change request aims to improve the current authentication system by implementing more secure password policies and adding session management features.',
  'We need to add new visualization components to the dashboard to better represent user activity and system performance metrics.',
  'The current on-premise database needs to be migrated to a cloud platform to improve scalability and reduce maintenance overhead.',
  'Users have requested the ability to export data to CSV format for offline analysis and reporting.',
  'Security audit identified several vulnerabilities that need to be addressed with enhanced security protocols.',
  'Current API response times are too slow under high load. This BCR aims to optimize performance through caching and query improvements.',
  'To comply with new security requirements, we need to implement multi-factor authentication for all admin users.',
  'A new reporting module is needed to generate compliance reports required by regulatory agencies.',
  'The legacy code base has become difficult to maintain. This BCR proposes a refactoring to improve code quality and maintainability.',
  'We need to integrate our system with several third-party services to extend functionality and improve user experience.'
];

// Valid statuses from the database
const statuses = [
  'Draft',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Implemented'
];

// Valid priorities for the database
const priorities = [
  'Low',
  'Medium',
  'High',
  'Critical'
];

async function main() {
  try {
    console.log('Starting BCR data reset...');
    
    // Get admin user for assigning BCRs
    const adminUser = await prisma.users.findFirst({
      where: {
        role: 'admin'
      }
    });
    
    if (!adminUser) {
      throw new Error('Admin user not found. Please ensure there is at least one admin user in the database.');
    }
    
    console.log(`Found admin user: ${adminUser.name} (${adminUser.id})`);
    
    // Delete all existing BCRs
    console.log('Deleting all existing BCR submissions...');
    const deleteCount = await prisma.bcrs.deleteMany({});
    console.log(`Deleted ${deleteCount.count} BCR submissions`);
    
    // Create new BCRs with data compatible with the template
    console.log('Creating new BCR submissions...');
    
    const newBcrs = [];
    
    for (let i = 0; i < 20; i++) {
      const titleIndex = i % bcrTitles.length;
      const descIndex = i % bcrDescriptions.length;
      const statusIndex = i % statuses.length;
      const priorityIndex = i % priorities.length;
      
      const createdAt = getRandomDate();
      const updatedAt = new Date(createdAt);
      updatedAt.setDate(createdAt.getDate() + Math.floor(Math.random() * 5));
      
      // Create history array
      const history = [
        createHistoryEntry(adminUser.id, 'created', createdAt),
        createHistoryEntry(adminUser.id, 'updated', updatedAt)
      ];
      
      // Create workflow history array
      const workflowHistory = [
        createWorkflowHistoryEntry(adminUser.id, 'Draft', statuses[statusIndex], updatedAt)
      ];
      
      // Convert history and workflowHistory to JSON strings for storage
      const historyJson = JSON.stringify(history);
      const workflowHistoryJson = JSON.stringify(workflowHistory);
      
      // Create a unique ID for this BCR
      const bcrId = uuidv4();
      
      // Create the BCR record
      const bcr = await prisma.bcrs.create({
        data: {
          id: bcrId,
          title: `${bcrTitles[titleIndex]} ${i + 1}`,
          description: bcrDescriptions[descIndex],
          status: statuses[statusIndex],
          priority: priorities[priorityIndex],
          impact: String(Math.floor(Math.random() * 5) + 1),
          requestedBy: adminUser.id,
          assignedTo: adminUser.id,
          targetDate: new Date(createdAt.getFullYear(), createdAt.getMonth() + 1, createdAt.getDate()),
          implementationDate: null,
          notes: 'Created by seed script',
          createdAt,
          updatedAt,
          bcrNumber: generateBcrNumber(i)
        }
      });
      
      // Create a new BCR object with the additional properties needed for the template
      const enhancedBcr = {
        ...bcr,
        history: historyJson,
        workflowHistory: workflowHistoryJson,
        currentPhaseId: Math.floor(Math.random() * 3) + 1
      };
      
      // Store the enhanced BCR for reference
      newBcrs.push(enhancedBcr);
      
      // Now create a BcrHistory record to store the history
      try {
        await prisma.$executeRaw`
          UPDATE "Bcrs" 
          SET 
            "historyData" = ${historyJson}::jsonb,
            "workflowHistoryData" = ${workflowHistoryJson}::jsonb
          WHERE "id" = ${bcrId}
        `;
      } catch (historyError) {
        console.log(`Note: Could not store history data for BCR ${bcr.bcrNumber}. This is expected if these columns don't exist in the schema.`);
      }
      
      console.log(`Created BCR: ${bcr.bcrNumber} - ${bcr.title}`);
    }
    
    console.log('\nBCR data reset completed successfully!');
    console.log(`Created ${newBcrs.length} new BCR submissions`);
    
    // Display a sample BCR for verification
    if (newBcrs.length > 0) {
      console.log('\nSample BCR:');
      const sample = newBcrs[0];
      console.log(`ID: ${sample.id}`);
      console.log(`Number: ${sample.bcrNumber}`);
      console.log(`Title: ${sample.title}`);
      console.log(`Status: ${sample.status}`);
      console.log(`Requested By: ${adminUser.name}`);
      console.log(`History: ${sample.history}`);
      console.log(`Workflow History: ${sample.workflowHistory}`);
    }
    
  } catch (error) {
    console.error('Error resetting BCR data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
