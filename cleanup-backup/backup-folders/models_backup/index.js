/**
 * Models index for RRDM application
 * Exports all models and handles database synchronization
 */
const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Bcr = require('./Bcr');
const ReferenceData = require('./ReferenceData');
const Funding = require('./Funding');
const ReleaseNote = require('./ReleaseNote');

// Import new models for JSON migration
const FundingRequirement = require('./FundingRequirement');
const FundingHistory = require('./FundingHistory');
const BcrConfig = require('./BcrConfig');

// Define model relationships

// BCR relationships
User.hasMany(Bcr, { as: 'requestedBcrs', foreignKey: 'requestedBy' });
User.hasMany(Bcr, { as: 'assignedBcrs', foreignKey: 'assignedTo' });
// Note: We're not defining these relationships here because they're already defined in the Bcr model
// Bcr.belongsTo(User, { as: 'requester', foreignKey: 'requestedBy' });
// Bcr.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });

// ReferenceData relationships
User.hasMany(ReferenceData, { as: 'createdReferenceData', foreignKey: 'createdBy' });
User.hasMany(ReferenceData, { as: 'updatedReferenceData', foreignKey: 'lastUpdatedBy' });
ReferenceData.belongsTo(User, { as: 'refDataCreator', foreignKey: 'createdBy' });
ReferenceData.belongsTo(User, { as: 'refDataUpdater', foreignKey: 'lastUpdatedBy' });

// Funding relationships
User.hasMany(Funding, { as: 'createdFunding', foreignKey: 'createdBy' });
User.hasMany(Funding, { as: 'updatedFunding', foreignKey: 'lastUpdatedBy' });
Funding.belongsTo(User, { as: 'fundingCreator', foreignKey: 'createdBy' });
Funding.belongsTo(User, { as: 'fundingUpdater', foreignKey: 'lastUpdatedBy' });

// ReleaseNote relationships
User.hasMany(ReleaseNote, { as: 'createdReleaseNotes', foreignKey: 'createdBy' });
User.hasMany(ReleaseNote, { as: 'approvedReleaseNotes', foreignKey: 'approvedBy' });
ReleaseNote.belongsTo(User, { as: 'releaseCreator', foreignKey: 'createdBy' });
ReleaseNote.belongsTo(User, { as: 'releaseApprover', foreignKey: 'approvedBy' });

// Function to sync all models with the database
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('Database synchronized successfully');
    return true;
  } catch (error) {
    console.error('Error synchronizing database:', error);
    return false;
  }
};

// Function to seed initial data
const seedDatabase = async () => {
  try {
    // Check if admin user exists
    const adminCount = await User.count({ where: { role: 'admin' } });
    
    if (adminCount === 0) {
      // Create default admin user
      await User.create({
        email: 'admin@email.com',
        password: 'Password1254', // This will be hashed by the model hook
        name: 'Admin User',
        role: 'admin'
      });
      console.log('Default admin user created');
      
      // Create a test business user
      await User.create({
        email: 'user@email.com',
        password: 'Password1234',
        name: 'Business User',
        role: 'business'
      });
      console.log('Default business user created');
    }
    
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  User,
  Bcr,
  ReferenceData,
  Funding,
  ReleaseNote,
  FundingRequirement,
  FundingHistory,
  BcrConfig,
  syncDatabase,
  seedDatabase
};
