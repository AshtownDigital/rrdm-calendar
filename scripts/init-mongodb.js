/**
 * Initialize MongoDB with test data
 * 
 * This script creates test users and BCR configurations in the MongoDB database.
 * 
 * Usage: node scripts/init-mongodb.js [--force]
 * 
 * Options:
 *   --force: Force creation of data even if it already exists
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/database.mongo');
const { User, BcrConfig } = db.models;

// Flag to control whether to force creation of data
const force = process.argv.includes('--force');

/**
 * Create test users
 */
async function createTestUsers() {
  try {
    console.log('Creating test users...');
    
    // Test users data
    const users = [
      {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin',
        active: true
      },
      {
        email: 'user@example.com',
        password: 'password123',
        name: 'Regular User',
        role: 'business',
        active: true
      }
    ];
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const userData of users) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      
      if (existingUser && !force) {
        console.log(`Skipping existing user: ${userData.email}`);
        skippedCount++;
        continue;
      }
      
      if (existingUser && force) {
        console.log(`Updating existing user: ${userData.email}`);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        existingUser.name = userData.name;
        existingUser.password = hashedPassword;
        existingUser.role = userData.role;
        existingUser.active = userData.active;
        existingUser.updatedAt = new Date();
        
        await existingUser.save();
        createdCount++;
      } else {
        console.log(`Creating new user: ${userData.email}`);
        
        // Create new user
        const user = new User({
          email: userData.email.toLowerCase(),
          password: userData.password, // Will be hashed by model pre-save hook
          name: userData.name,
          role: userData.role,
          active: userData.active,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await user.save();
        createdCount++;
      }
    }
    
    console.log(`Test users: ${createdCount} created/updated, ${skippedCount} skipped`);
    return true;
  } catch (error) {
    console.error('Error creating test users:', error);
    return false;
  }
}

/**
 * Create BCR configurations
 */
async function createBcrConfigs() {
  try {
    console.log('Creating BCR configurations...');
    
    // BCR configurations data
    const configs = [
      // Phases
      { type: 'phase', name: 'Draft', value: { description: 'Initial draft phase' }, displayOrder: 1 },
      { type: 'phase', name: 'Submitted', value: { description: 'Submitted for review' }, displayOrder: 2 },
      { type: 'phase', name: 'Under Review', value: { description: 'Currently being reviewed' }, displayOrder: 3 },
      { type: 'phase', name: 'Approved', value: { description: 'Approved for implementation' }, displayOrder: 4 },
      { type: 'phase', name: 'Implemented', value: { description: 'Successfully implemented' }, displayOrder: 5 },
      { type: 'phase', name: 'Rejected', value: { description: 'Rejected' }, displayOrder: 6 },
      
      // Statuses
      { type: 'status', name: 'Not Started', value: { color: 'gray' }, displayOrder: 1 },
      { type: 'status', name: 'In Progress', value: { color: 'blue' }, displayOrder: 2 },
      { type: 'status', name: 'On Hold', value: { color: 'orange' }, displayOrder: 3 },
      { type: 'status', name: 'Completed', value: { color: 'green' }, displayOrder: 4 },
      { type: 'status', name: 'Cancelled', value: { color: 'red' }, displayOrder: 5 },
      
      // Impact Areas
      { type: 'impactArea', name: 'Process', value: null, displayOrder: 1 },
      { type: 'impactArea', name: 'Technology', value: null, displayOrder: 2 },
      { type: 'impactArea', name: 'People', value: null, displayOrder: 3 },
      { type: 'impactArea', name: 'Policy', value: null, displayOrder: 4 },
      
      // Urgency Levels
      { type: 'urgencyLevel', name: 'Low', value: { color: 'green' }, displayOrder: 1 },
      { type: 'urgencyLevel', name: 'Medium', value: { color: 'yellow' }, displayOrder: 2 },
      { type: 'urgencyLevel', name: 'High', value: { color: 'orange' }, displayOrder: 3 },
      { type: 'urgencyLevel', name: 'Critical', value: { color: 'red' }, displayOrder: 4 },
      
      // Roles
      { type: 'role', name: 'Requester', value: null, displayOrder: 1 },
      { type: 'role', name: 'Reviewer', value: null, displayOrder: 2 },
      { type: 'role', name: 'Approver', value: null, displayOrder: 3 },
      { type: 'role', name: 'Implementer', value: null, displayOrder: 4 }
    ];
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const configData of configs) {
      // Check if config already exists
      const existingConfig = await BcrConfig.findOne({
        type: configData.type,
        name: configData.name
      });
      
      if (existingConfig && !force) {
        console.log(`Skipping existing config: ${configData.type} - ${configData.name}`);
        skippedCount++;
        continue;
      }
      
      if (existingConfig && force) {
        console.log(`Updating existing config: ${configData.type} - ${configData.name}`);
        existingConfig.value = configData.value;
        existingConfig.displayOrder = configData.displayOrder;
        existingConfig.updatedAt = new Date();
        await existingConfig.save();
        createdCount++;
      } else {
        console.log(`Creating new config: ${configData.type} - ${configData.name}`);
        const config = new BcrConfig({
          type: configData.type,
          name: configData.name,
          value: configData.value,
          displayOrder: configData.displayOrder,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await config.save();
        createdCount++;
      }
    }
    
    console.log(`BCR configs: ${createdCount} created/updated, ${skippedCount} skipped`);
    return true;
  } catch (error) {
    console.error('Error creating BCR configurations:', error);
    return false;
  }
}

/**
 * Initialize the database
 */
async function initializeDatabase() {
  try {
    console.log('Initializing MongoDB database...');
    console.log(`Force mode: ${force ? 'ON' : 'OFF'}`);
    
    // Connect to MongoDB
    await db.connect();
    
    // Create test users
    const usersCreated = await createTestUsers();
    
    // Create BCR configurations
    const configsCreated = await createBcrConfigs();
    
    console.log('Database initialization completed!');
    console.log(`Users creation: ${usersCreated ? 'SUCCESS' : 'FAILED'}`);
    console.log(`BCR configs creation: ${configsCreated ? 'SUCCESS' : 'FAILED'}`);
    
    return usersCreated && configsCreated;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  } finally {
    // Close database connection
    await db.disconnect();
  }
}

// Run the initialization
initializeDatabase()
  .then(success => {
    console.log(`Database initialization ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error during database initialization:', error);
    process.exit(1);
  });
