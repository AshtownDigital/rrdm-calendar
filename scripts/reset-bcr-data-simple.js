/**
 * Reset BCR Data Script (Simple Version)
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
    
    // First, create a simple BCR to see what values are accepted
    try {
      const testBcr = await prisma.bcrs.create({
        data: {
          id: uuidv4(),
          title: 'Test BCR',
          description: 'Test description',
          status: 'draft', // Try lowercase first
          priority: 'low', // Try lowercase first
          impact: '3',
          requestedBy: adminUser.id,
          assignedTo: adminUser.id,
          targetDate: new Date(),
          implementationDate: null,
          notes: 'Test BCR',
          createdAt: new Date(),
          updatedAt: new Date(),
          bcrNumber: 'BCR-2025-TEST'
        }
      });
      
      console.log('Successfully created test BCR with status "draft" and priority "low"');
      console.log(testBcr);
      
      // Use these values for all other BCRs
      const status = 'draft';
      const priority = 'low';
      
      // Create 10 more BCRs
      for (let i = 0; i < 10; i++) {
        const titleIndex = i % bcrTitles.length;
        const descIndex = i % bcrDescriptions.length;
        
        const bcr = await prisma.bcrs.create({
          data: {
            id: uuidv4(),
            title: `${bcrTitles[titleIndex]} ${i + 1}`,
            description: bcrDescriptions[descIndex],
            status,
            priority,
            impact: String(Math.floor(Math.random() * 5) + 1),
            requestedBy: adminUser.id,
            assignedTo: adminUser.id,
            targetDate: new Date(),
            implementationDate: null,
            notes: 'Created by seed script',
            createdAt: new Date(),
            updatedAt: new Date(),
            bcrNumber: generateBcrNumber(i)
          }
        });
        
        newBcrs.push(bcr);
        console.log(`Created BCR: ${bcr.bcrNumber} - ${bcr.title}`);
      }
      
    } catch (error) {
      console.error('Error creating BCR with lowercase status/priority:', error);
      
      // Try with uppercase first letter
      try {
        const testBcr = await prisma.bcrs.create({
          data: {
            id: uuidv4(),
            title: 'Test BCR',
            description: 'Test description',
            status: 'Draft', // Try with first letter uppercase
            priority: 'Low', // Try with first letter uppercase
            impact: '3',
            requestedBy: adminUser.id,
            assignedTo: adminUser.id,
            targetDate: new Date(),
            implementationDate: null,
            notes: 'Test BCR',
            createdAt: new Date(),
            updatedAt: new Date(),
            bcrNumber: 'BCR-2025-TEST2'
          }
        });
        
        console.log('Successfully created test BCR with status "Draft" and priority "Low"');
        console.log(testBcr);
        
        // Use these values for all other BCRs
        const status = 'Draft';
        const priority = 'Low';
        
        // Create 10 more BCRs
        for (let i = 0; i < 10; i++) {
          const titleIndex = i % bcrTitles.length;
          const descIndex = i % bcrDescriptions.length;
          
          const bcr = await prisma.bcrs.create({
            data: {
              id: uuidv4(),
              title: `${bcrTitles[titleIndex]} ${i + 1}`,
              description: bcrDescriptions[descIndex],
              status,
              priority,
              impact: String(Math.floor(Math.random() * 5) + 1),
              requestedBy: adminUser.id,
              assignedTo: adminUser.id,
              targetDate: new Date(),
              implementationDate: null,
              notes: 'Created by seed script',
              createdAt: new Date(),
              updatedAt: new Date(),
              bcrNumber: generateBcrNumber(i)
            }
          });
          
          newBcrs.push(bcr);
          console.log(`Created BCR: ${bcr.bcrNumber} - ${bcr.title}`);
        }
        
      } catch (upperCaseError) {
        console.error('Error creating BCR with uppercase status/priority:', upperCaseError);
        
        // Try with numeric status/priority
        try {
          // Query BcrConfigs to get valid status and priority IDs
          const statusConfig = await prisma.bcrConfigs.findFirst({
            where: {
              type: 'status'
            }
          });
          
          const priorityConfig = await prisma.bcrConfigs.findFirst({
            where: {
              type: 'priority'
            }
          });
          
          if (statusConfig && priorityConfig) {
            console.log(`Using status ID: ${statusConfig.id} and priority ID: ${priorityConfig.id}`);
            
            const testBcr = await prisma.bcrs.create({
              data: {
                id: uuidv4(),
                title: 'Test BCR',
                description: 'Test description',
                status: statusConfig.id, // Try with ID
                priority: priorityConfig.id, // Try with ID
                impact: '3',
                requestedBy: adminUser.id,
                assignedTo: adminUser.id,
                targetDate: new Date(),
                implementationDate: null,
                notes: 'Test BCR',
                createdAt: new Date(),
                updatedAt: new Date(),
                bcrNumber: 'BCR-2025-TEST3'
              }
            });
            
            console.log('Successfully created test BCR with status and priority IDs');
            console.log(testBcr);
          } else {
            console.error('Could not find status or priority configs');
          }
        } catch (idError) {
          console.error('Error creating BCR with status/priority IDs:', idError);
        }
      }
    }
    
    console.log('\nBCR data reset completed!');
    console.log(`Created ${newBcrs.length} new BCR submissions`);
    
  } catch (error) {
    console.error('Error resetting BCR data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
