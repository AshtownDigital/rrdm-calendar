/**
 * Migration script to transfer data from JSON files to PostgreSQL database
 * This script reads the archived JSON files and populates the database tables
 */
const fs = require('fs');
const path = require('path');
const { 
  sequelize, 
  User, 
  Bcr, 
  FundingRequirement, 
  FundingHistory,
  BcrConfig
} = require('../models');

// Path to archived JSON files
const ARCHIVE_PATH = path.join(__dirname, '../archived_json_files');

// Helper function to read JSON files
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return null;
  }
};

// Migrate funding requirements
const migrateFundingRequirements = async () => {
  try {
    console.log('Migrating funding requirements...');
    const requirementsPath = path.join(ARCHIVE_PATH, 'requirements.json');
    const requirementsData = readJsonFile(requirementsPath);
    
    if (!requirementsData) {
      console.log('No requirements data found');
      return;
    }
    
    // Get admin user for attribution
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminUser) {
      console.error('No admin user found for attribution');
      return;
    }
    
    // Clear existing data
    await FundingRequirement.destroy({ where: {} });
    
    // Insert new data
    const requirements = Array.isArray(requirementsData) ? requirementsData : [];
    
    for (const requirement of requirements) {
      await FundingRequirement.create({
        route: requirement.route,
        year: requirement.year,
        amount: requirement.amount,
        description: requirement.description || '',
        createdBy: adminUser.id,
        lastUpdatedBy: adminUser.id
      });
    }
    
    console.log(`Migrated ${requirements.length} funding requirements`);
  } catch (error) {
    console.error('Error migrating funding requirements:', error);
  }
};

// Migrate funding history
const migrateFundingHistory = async () => {
  try {
    console.log('Migrating funding history...');
    const historyPath = path.join(ARCHIVE_PATH, 'history.json');
    const historyData = readJsonFile(historyPath);
    
    if (!historyData) {
      console.log('No history data found');
      return;
    }
    
    // Get admin user for attribution
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminUser) {
      console.error('No admin user found for attribution');
      return;
    }
    
    // Clear existing data
    await FundingHistory.destroy({ where: {} });
    
    // Insert new data
    const historyItems = Array.isArray(historyData) ? historyData : [];
    
    for (const history of historyItems) {
      await FundingHistory.create({
        year: history.year,
        route: history.route,
        change: history.change,
        amount: history.amount,
        reason: history.reason || '',
        createdBy: adminUser.id
      });
    }
    
    console.log(`Migrated ${historyItems.length} funding history items`);
  } catch (error) {
    console.error('Error migrating funding history:', error);
  }
};

// Migrate BCR config
const migrateBcrConfig = async () => {
  try {
    console.log('Migrating BCR configuration...');
    const configPath = path.join(ARCHIVE_PATH, 'config.json');
    const configData = readJsonFile(configPath);
    
    if (!configData) {
      console.log('No BCR config data found');
      return;
    }
    
    // Clear existing data
    await BcrConfig.destroy({ where: {} });
    
    // Migrate phases
    if (configData.phases) {
      for (let i = 0; i < configData.phases.length; i++) {
        const phase = configData.phases[i];
        await BcrConfig.create({
          type: 'phase',
          name: phase.name,
          value: String(phase.id),
          displayOrder: i,
          description: phase.description || '',
          metadata: { color: phase.color || '' }
        });
      }
      console.log(`Migrated ${configData.phases.length} BCR phases`);
    }
    
    // Migrate statuses
    if (configData.statuses) {
      for (let i = 0; i < configData.statuses.length; i++) {
        const status = configData.statuses[i];
        await BcrConfig.create({
          type: 'status',
          name: status.name,
          value: String(status.phase || '1'),
          displayOrder: i,
          description: status.description || '',
          metadata: { color: status.color || '' }
        });
      }
      console.log(`Migrated ${configData.statuses.length} BCR statuses`);
    }
    
    // Migrate impact areas
    if (configData.impactAreas) {
      for (let i = 0; i < configData.impactAreas.length; i++) {
        const area = configData.impactAreas[i];
        await BcrConfig.create({
          type: 'impactArea',
          name: area,
          value: area,
          displayOrder: i
        });
      }
      console.log(`Migrated ${configData.impactAreas.length} BCR impact areas`);
    }
    
    // Migrate urgency levels
    if (configData.urgencyLevels) {
      for (let i = 0; i < configData.urgencyLevels.length; i++) {
        const level = configData.urgencyLevels[i];
        await BcrConfig.create({
          type: 'urgencyLevel',
          name: level,
          value: level,
          displayOrder: i
        });
      }
      console.log(`Migrated ${configData.urgencyLevels.length} BCR urgency levels`);
    }
  } catch (error) {
    console.error('Error migrating BCR config:', error);
  }
};

// Migrate BCR submissions to the Bcr model
const migrateBcrSubmissions = async () => {
  try {
    console.log('Migrating BCR submissions...');
    const submissionsPath = path.join(ARCHIVE_PATH, 'submissions.json');
    const submissionsData = readJsonFile(submissionsPath);
    
    if (!submissionsData) {
      console.log('No BCR submissions data found');
      return;
    }
    
    // Get admin user for attribution
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminUser) {
      console.error('No admin user found for attribution');
      return;
    }
    
    // Extract submissions array
    const submissions = submissionsData.submissions || [];
    
    // Insert new data (don't clear existing data to avoid conflicts)
    let migratedCount = 0;
    for (const submission of submissions) {
      try {
        // Map the status to the Bcr model's status enum
        let status = 'draft';
        if (submission.status) {
          const statusLower = submission.status.toLowerCase();
          if (statusLower.includes('submit')) status = 'submitted';
          else if (statusLower.includes('review')) status = 'under_review';
          else if (statusLower.includes('approve')) status = 'approved';
          else if (statusLower.includes('reject')) status = 'rejected';
          else if (statusLower.includes('implement')) status = 'implemented';
        }
        
        // Create the BCR
        await Bcr.create({
          id: submission.id,
          title: submission.title || 'Untitled BCR',
          description: submission.description || '',
          status: status,
          priority: submission.urgency || 'medium',
          impact: submission.impactAreas ? (Array.isArray(submission.impactAreas) ? submission.impactAreas.join(', ') : submission.impactAreas) : '',
          requestedBy: adminUser.id,
          assignedTo: null,
          notes: `Migrated from JSON: ${submission.justification || ''}`
        });
        
        migratedCount++;
      } catch (error) {
        console.error(`Error migrating BCR submission ${submission.id}:`, error);
        // Continue with next submission
      }
    }
    
    console.log(`Migrated ${migratedCount} BCR submissions`);
  } catch (error) {
    console.error('Error migrating BCR submissions:', error);
  }
};

// Run the migration
const runMigration = async () => {
  try {
    console.log('Starting migration from JSON to PostgreSQL...');
    
    // Connect to the database
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Run migrations
    await migrateFundingRequirements();
    await migrateFundingHistory();
    await migrateBcrConfig();
    await migrateBcrSubmissions();
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  runMigration,
  migrateFundingRequirements,
  migrateFundingHistory,
  migrateBcrConfig,
  migrateBcrSubmissions
};
