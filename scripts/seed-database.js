/**
 * Seed Database Script
 * 
 * This script inserts initial data into the PostgreSQL database for testing purposes.
 * It creates sample BCR configurations, funding requirements, and funding history.
 */
const { 
  sequelize, 
  User, 
  Bcr, 
  FundingRequirement, 
  FundingHistory,
  BcrConfig
} = require('../models');
const { v4: uuidv4 } = require('uuid');

// Seed BCR configuration data
const seedBcrConfig = async () => {
  try {
    console.log('Seeding BCR configuration data...');
    
    // Clear existing data
    await BcrConfig.destroy({ where: {} });
    
    // Define phases
    const phases = [
      { name: 'Draft', value: '1', displayOrder: 1, description: 'Initial draft phase', metadata: { color: 'grey' } },
      { name: 'Submitted', value: '2', displayOrder: 2, description: 'Submitted for review', metadata: { color: 'blue' } },
      { name: 'Under Review', value: '3', displayOrder: 3, description: 'Currently being reviewed', metadata: { color: 'light-blue' } },
      { name: 'Approved', value: '4', displayOrder: 4, description: 'Approved for implementation', metadata: { color: 'green' } },
      { name: 'Rejected', value: '5', displayOrder: 5, description: 'Rejected', metadata: { color: 'red' } },
      { name: 'Implemented', value: '6', displayOrder: 6, description: 'Successfully implemented', metadata: { color: 'purple' } }
    ];
    
    // Define statuses
    const statuses = [
      { name: 'draft', value: '1', displayOrder: 1, description: 'Initial draft', metadata: { color: 'grey' } },
      { name: 'submitted', value: '2', displayOrder: 2, description: 'Submitted for review', metadata: { color: 'blue' } },
      { name: 'under_review', value: '3', displayOrder: 3, description: 'Under review by team', metadata: { color: 'light-blue' } },
      { name: 'approved', value: '4', displayOrder: 4, description: 'Approved for implementation', metadata: { color: 'green' } },
      { name: 'rejected', value: '5', displayOrder: 5, description: 'Rejected', metadata: { color: 'red' } },
      { name: 'implemented', value: '6', displayOrder: 6, description: 'Successfully implemented', metadata: { color: 'purple' } }
    ];
    
    // Define impact areas
    const impactAreas = [
      { name: 'Technical', value: 'Technical', displayOrder: 1 },
      { name: 'Business', value: 'Business', displayOrder: 2 },
      { name: 'Policy', value: 'Policy', displayOrder: 3 },
      { name: 'User Experience', value: 'User Experience', displayOrder: 4 },
      { name: 'Security', value: 'Security', displayOrder: 5 }
    ];
    
    // Define urgency levels
    const urgencyLevels = [
      { name: 'low', value: 'low', displayOrder: 1 },
      { name: 'medium', value: 'medium', displayOrder: 2 },
      { name: 'high', value: 'high', displayOrder: 3 },
      { name: 'critical', value: 'critical', displayOrder: 4 }
    ];
    
    // Insert phases
    for (const phase of phases) {
      await BcrConfig.create({
        id: uuidv4(),
        type: 'phase',
        name: phase.name,
        value: phase.value,
        displayOrder: phase.displayOrder,
        description: phase.description,
        metadata: phase.metadata
      });
    }
    
    // Insert statuses
    for (const status of statuses) {
      await BcrConfig.create({
        id: uuidv4(),
        type: 'status',
        name: status.name,
        value: status.value,
        displayOrder: status.displayOrder,
        description: status.description,
        metadata: status.metadata
      });
    }
    
    // Insert impact areas
    for (const area of impactAreas) {
      await BcrConfig.create({
        id: uuidv4(),
        type: 'impactArea',
        name: area.name,
        value: area.value,
        displayOrder: area.displayOrder
      });
    }
    
    // Insert urgency levels
    for (const level of urgencyLevels) {
      await BcrConfig.create({
        id: uuidv4(),
        type: 'urgencyLevel',
        name: level.name,
        value: level.value,
        displayOrder: level.displayOrder
      });
    }
    
    console.log('BCR configuration data seeded successfully');
  } catch (error) {
    console.error('Error seeding BCR configuration data:', error);
  }
};

// Seed funding requirements data
const seedFundingRequirements = async () => {
  try {
    console.log('Seeding funding requirements data...');
    
    // Get admin user for attribution
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminUser) {
      console.error('No admin user found for attribution');
      return;
    }
    
    // Clear existing data
    await FundingRequirement.destroy({ where: {} });
    
    // Define sample funding requirements
    const requirements = [
      { route: 'Primary', year: 2025, amount: 25000.00, description: 'Funding for primary teacher training' },
      { route: 'Secondary', year: 2025, amount: 30000.00, description: 'Funding for secondary teacher training' },
      { route: 'Early Years', year: 2025, amount: 22000.00, description: 'Funding for early years teacher training' },
      { route: 'Primary', year: 2024, amount: 24000.00, description: 'Funding for primary teacher training' },
      { route: 'Secondary', year: 2024, amount: 29000.00, description: 'Funding for secondary teacher training' },
      { route: 'Early Years', year: 2024, amount: 21000.00, description: 'Funding for early years teacher training' }
    ];
    
    // Insert funding requirements
    for (const req of requirements) {
      await FundingRequirement.create({
        id: uuidv4(),
        route: req.route,
        year: req.year,
        amount: req.amount,
        description: req.description,
        createdBy: adminUser.id,
        lastUpdatedBy: adminUser.id
      });
    }
    
    console.log(`Seeded ${requirements.length} funding requirements`);
  } catch (error) {
    console.error('Error seeding funding requirements:', error);
  }
};

// Seed funding history data
const seedFundingHistory = async () => {
  try {
    console.log('Seeding funding history data...');
    
    // Get admin user for attribution
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminUser) {
      console.error('No admin user found for attribution');
      return;
    }
    
    // Clear existing data
    await FundingHistory.destroy({ where: {} });
    
    // Define sample funding history
    const historyItems = [
      { year: 2025, route: 'Primary', change: 'increase', amount: 1000.00, reason: 'Inflation adjustment' },
      { year: 2025, route: 'Secondary', change: 'increase', amount: 1000.00, reason: 'Inflation adjustment' },
      { year: 2025, route: 'Early Years', change: 'increase', amount: 1000.00, reason: 'Inflation adjustment' },
      { year: 2024, route: 'Primary', change: 'increase', amount: 2000.00, reason: 'Policy change' },
      { year: 2024, route: 'Secondary', change: 'increase', amount: 2000.00, reason: 'Policy change' },
      { year: 2024, route: 'Early Years', change: 'increase', amount: 2000.00, reason: 'Policy change' }
    ];
    
    // Insert funding history
    for (const history of historyItems) {
      await FundingHistory.create({
        id: uuidv4(),
        year: history.year,
        route: history.route,
        change: history.change,
        amount: history.amount,
        reason: history.reason,
        createdBy: adminUser.id
      });
    }
    
    console.log(`Seeded ${historyItems.length} funding history items`);
  } catch (error) {
    console.error('Error seeding funding history:', error);
  }
};

// Seed BCR data
const seedBcrData = async () => {
  try {
    console.log('Seeding BCR data...');
    
    // Get admin user for attribution
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminUser) {
      console.error('No admin user found for attribution');
      return;
    }
    
    // Define sample BCRs
    const bcrs = [
      { 
        bcrNumber: 'BCR-2025-0001', 
        title: 'Update User Interface', 
        description: 'Update the user interface to improve usability',
        status: 'approved',
        priority: 'medium',
        impact: 'Technical, User Experience',
        notes: 'This BCR aims to improve the overall user experience by updating the UI.'
      },
      { 
        bcrNumber: 'BCR-2025-0002', 
        title: 'Add New Reporting Feature', 
        description: 'Add a new reporting feature to generate custom reports',
        status: 'under_review',
        priority: 'high',
        impact: 'Business, Technical',
        notes: 'This feature will allow users to generate custom reports based on their needs.'
      },
      { 
        bcrNumber: 'BCR-2025-0003', 
        title: 'Security Enhancement', 
        description: 'Enhance security measures to protect user data',
        status: 'submitted',
        priority: 'critical',
        impact: 'Security, Technical',
        notes: 'This BCR addresses critical security concerns identified in the latest audit.'
      }
    ];
    
    // Insert BCRs
    for (const bcr of bcrs) {
      // Generate a UUID for the BCR
      const bcrId = uuidv4();
      
      await Bcr.create({
        id: bcrId, // Use UUID for database ID
        title: bcr.title,
        description: bcr.description,
        status: bcr.status,
        priority: bcr.priority,
        impact: bcr.impact,
        requestedBy: adminUser.id,
        assignedTo: adminUser.id,
        notes: `${bcr.bcrNumber}: ${bcr.notes}` // Include BCR number in notes
      });
    }
    
    console.log(`Seeded ${bcrs.length} BCRs`);
  } catch (error) {
    console.error('Error seeding BCR data:', error);
  }
};

// Run the seeding process
const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    
    // Connect to the database
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Run seeding functions
    await seedBcrConfig();
    await seedFundingRequirements();
    await seedFundingHistory();
    await seedBcrData();
    
    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

// Run the seeding process if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  seedBcrConfig,
  seedFundingRequirements,
  seedFundingHistory,
  seedBcrData
};
