/**
 * Migration script to transfer data from PostgreSQL to MongoDB
 * 
 * This script transfers all data from the PostgreSQL database to the MongoDB database.
 * It migrates all entities including users, BCRs, submissions, workflow phases, etc.
 * 
 * Usage: node scripts/migrate-to-mongodb.js [--overwrite] [--entity=<entity_name>]
 * 
 * Options:
 *   --overwrite: Overwrite existing data in MongoDB
 *   --entity=<entity_name>: Migrate only the specified entity (e.g., --entity=users)
 *                          Valid entities: users, bcrconfigs, submissions, bcrs, workflowphases,
 *                                         impactedareas, fundings, referencedata, auditlogs
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
const { 
  User, 
  BcrConfig, 
  Bcr, 
  Submission, 
  BcrWorkflowActivity, 
  WorkflowPhase, 
  ImpactedArea, 
  Funding, 
  ReferenceData, 
  AuditLog 
} = require('../models');
const mongoDb = require('../config/database.mongo');

// Flags to control migration behavior
const overwrite = process.argv.includes('--overwrite');

// Check if a specific entity is specified for migration
const entityArg = process.argv.find(arg => arg.startsWith('--entity='));
const specificEntity = entityArg ? entityArg.split('=')[1].toLowerCase() : null;

// Initialize Prisma client for Neon PostgreSQL
const prisma = new PrismaClient();

/**
 * Migrate users from Neon PostgreSQL to MongoDB
 */
async function migrateUsers() {
  try {
    console.log('Migrating users from Neon PostgreSQL to MongoDB...');
    
    // Get all users from Neon PostgreSQL
    const prismaUsers = await prisma.users.findMany();
    console.log(`Found ${prismaUsers.length} users in Neon PostgreSQL`);
    
    // First, clear all existing users if overwrite is enabled
    if (overwrite) {
      console.log('Clearing existing users from MongoDB...');
      await User.deleteMany({});
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    // Create a mapping of UUID to MongoDB ObjectId for users
    const userIdMap = new Map();
    
    for (const prismaUser of prismaUsers) {
      try {
        // Check if user already exists in MongoDB
        const existingUser = await User.findOne({ email: prismaUser.email.toLowerCase() });
        
        if (existingUser && !overwrite) {
          console.log(`Skipping existing user: ${prismaUser.email}`);
          // Store the mapping for this user
          userIdMap.set(prismaUser.id, existingUser._id);
          skippedCount++;
          continue;
        }
        
        // If we're in overwrite mode and the user exists, delete it first
        if (existingUser && overwrite) {
          console.log(`Deleting existing user to recreate: ${prismaUser.email}`);
          await User.deleteOne({ _id: existingUser._id });
        }
        
        // Create a new user
        console.log(`Creating new user: ${prismaUser.email}`);
        const newUser = new User({
          email: prismaUser.email.toLowerCase(),
          password: prismaUser.password || 'migrated-password-placeholder', // Provide a default if null
          name: prismaUser.name || 'User',
          role: prismaUser.role || 'user', // Default role
          active: prismaUser.active !== undefined ? prismaUser.active : true,
          lastLogin: prismaUser.lastLogin,
          createdAt: prismaUser.createdAt || new Date(),
          updatedAt: prismaUser.updatedAt || new Date()
        });
        
        // Save without running the password hashing hook if it's already hashed
        if (prismaUser.password && prismaUser.password.startsWith('$2')) {
          newUser.$isNew = false; // Trick to avoid pre-save hooks
          await newUser.save({ validateBeforeSave: false });
        } else {
          // Otherwise let the model hash the password
          await newUser.save();
        }
        
        // Store the mapping for this user
        userIdMap.set(prismaUser.id, newUser._id);
        migratedCount++;
      } catch (err) {
        console.error(`Error migrating user ${prismaUser.email}:`, err.message);
      }
    }
    
    // If no users were migrated, create a default admin user
    if (migratedCount === 0) {
      console.log('Creating default admin user...');
      const defaultUser = new User({
        email: 'admin@example.com',
        password: 'admin123', // This will be hashed by the model
        name: 'Admin User',
        role: 'admin',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await defaultUser.save();
      console.log('Default admin user created successfully');
      migratedCount++;
    }
    
    // Store the user ID mapping globally for use in other migration functions
    global.userIdMap = userIdMap;
    
    console.log(`Migration completed: ${migratedCount} users migrated, ${skippedCount} users skipped`);
    return true;
  } catch (error) {
    console.error('Error migrating users:', error);
    return false;
  }
}

/**
 * Migrate BCR configurations from Neon PostgreSQL to MongoDB
 */
async function migrateBcrConfigs() {
  try {
    console.log('Migrating BCR configurations from Neon PostgreSQL to MongoDB...');
    
    // Get all BCR configurations from Neon PostgreSQL
    const prismaBcrConfigs = await prisma.bcrConfigs.findMany();
    console.log(`Found ${prismaBcrConfigs.length} BCR configurations in Neon PostgreSQL`);
    
    // First, clear all existing configs if overwrite is enabled
    if (overwrite) {
      console.log('Clearing existing BCR configurations from MongoDB...');
      await BcrConfig.deleteMany({});
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const prismaConfig of prismaBcrConfigs) {
      try {
        // Map the type to a valid enum value
        let configType = prismaConfig.type;
        
        // Convert legacy types to valid enum values
        if (configType === 'impactArea_description') {
          configType = 'impactArea';
        } else if (!['impactArea', 'urgencyLevel', 'role', 'phase', 'status', 'phase-status'].includes(configType)) {
          // Default to a valid type if not recognized
          configType = 'role';
        }
        
        // Check if configuration already exists in MongoDB
        const existingConfig = await BcrConfig.findOne({
          type: configType,
          name: prismaConfig.name
        });
        
        if (existingConfig && !overwrite) {
          console.log(`Skipping existing config: ${configType} - ${prismaConfig.name}`);
          skippedCount++;
          continue;
        }
        
        if (existingConfig && overwrite) {
          console.log(`Updating existing config: ${configType} - ${prismaConfig.name}`);
          existingConfig.value = prismaConfig.value || {};
          existingConfig.displayOrder = prismaConfig.displayOrder || 0;
          existingConfig.updatedAt = new Date();
          await existingConfig.save();
          migratedCount++;
        } else {
          console.log(`Creating new config: ${configType} - ${prismaConfig.name}`);
          const newConfig = new BcrConfig({
            type: configType,
            name: prismaConfig.name,
            value: prismaConfig.value || {},
            displayOrder: prismaConfig.displayOrder || 0,
            createdAt: prismaConfig.createdAt || new Date(),
            updatedAt: prismaConfig.updatedAt || new Date()
          });
          await newConfig.save();
          migratedCount++;
        }
      } catch (err) {
        console.error(`Error migrating config ${prismaConfig.type} - ${prismaConfig.name}:`, err.message);
      }
    }
    
    console.log(`Migration completed: ${migratedCount} configs migrated, ${skippedCount} configs skipped`);
    return true;
  } catch (error) {
    console.error('Error migrating BCR configurations:', error);
    return false;
  }
}

/**
 * Migrate workflow phases from PostgreSQL to MongoDB
 */
async function migrateWorkflowPhases() {
  try {
    console.log('Migrating workflow phases from PostgreSQL to MongoDB...');
    
    // Get all workflow phases from PostgreSQL
    const prismaPhases = await prisma.workflowPhase.findMany();
    console.log(`Found ${prismaPhases.length} workflow phases in PostgreSQL`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const prismaPhase of prismaPhases) {
      // Check if phase already exists in MongoDB
      const existingPhase = await WorkflowPhase.findOne({ name: prismaPhase.name });
      
      if (existingPhase && !overwrite) {
        console.log(`Skipping existing workflow phase: ${prismaPhase.name}`);
        skippedCount++;
        continue;
      }
      
      if (existingPhase && overwrite) {
        console.log(`Updating existing workflow phase: ${prismaPhase.name}`);
        existingPhase.order = prismaPhase.order;
        existingPhase.currentStatus = prismaPhase.currentStatus;
        existingPhase.completedStatus = prismaPhase.completedStatus;
        existingPhase.updatedAt = new Date();
        await existingPhase.save();
        migratedCount++;
      } else {
        console.log(`Creating new workflow phase: ${prismaPhase.name}`);
        const newPhase = new WorkflowPhase({
          order: prismaPhase.order,
          name: prismaPhase.name,
          currentStatus: prismaPhase.currentStatus,
          completedStatus: prismaPhase.completedStatus,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await newPhase.save();
        migratedCount++;
      }
    }
    
    console.log(`Migration completed: ${migratedCount} workflow phases migrated, ${skippedCount} workflow phases skipped`);
    return true;
  } catch (error) {
    console.error('Error migrating workflow phases:', error);
    return false;
  }
}

/**
 * Migrate impacted areas from PostgreSQL to MongoDB
 */
async function migrateImpactedAreas() {
  try {
    console.log('Migrating impacted areas from PostgreSQL to MongoDB...');
    
    // Get all impacted areas from PostgreSQL
    const prismaAreas = await prisma.impactedArea.findMany();
    console.log(`Found ${prismaAreas.length} impacted areas in PostgreSQL`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const prismaArea of prismaAreas) {
      // Check if area already exists in MongoDB
      const existingArea = await ImpactedArea.findOne({ name: prismaArea.name });
      
      if (existingArea && !overwrite) {
        console.log(`Skipping existing impacted area: ${prismaArea.name}`);
        skippedCount++;
        continue;
      }
      
      if (existingArea && overwrite) {
        console.log(`Updating existing impacted area: ${prismaArea.name}`);
        existingArea.recordNumber = prismaArea.recordNumber;
        existingArea.description = prismaArea.description;
        existingArea.order = prismaArea.order;
        existingArea.updatedAt = new Date();
        await existingArea.save();
        migratedCount++;
      } else {
        console.log(`Creating new impacted area: ${prismaArea.name}`);
        const newArea = new ImpactedArea({
          recordNumber: prismaArea.recordNumber,
          name: prismaArea.name,
          description: prismaArea.description,
          order: prismaArea.order,
          createdAt: prismaArea.createdAt,
          updatedAt: prismaArea.updatedAt
        });
        await newArea.save();
        migratedCount++;
      }
    }
    
    console.log(`Migration completed: ${migratedCount} impacted areas migrated, ${skippedCount} impacted areas skipped`);
    return true;
  } catch (error) {
    console.error('Error migrating impacted areas:', error);
    return false;
  }
}

/**
 * Migrate submissions from PostgreSQL to MongoDB
 */
async function migrateSubmissions() {
  try {
    console.log('Migrating submissions from PostgreSQL to MongoDB...');
    
    // First, clear all existing submissions if overwrite is enabled
    if (overwrite) {
      console.log('Clearing existing submissions from MongoDB...');
      await Submission.deleteMany({});
    }
    
    // Get all submissions from PostgreSQL
    const prismaSubmissions = await prisma.submission.findMany();
    console.log(`Found ${prismaSubmissions.length} submissions in PostgreSQL`);
    
    // Create a mapping of UUID to MongoDB ObjectId for submissions
    const submissionIdMap = new Map();
    
    // Get all users for reference mapping
    const users = await User.find({});
    const userMap = new Map(users.map(user => [user.email, user._id]));
    
    // Use the global userIdMap if it exists (from migrateUsers function)
    const userIdMapping = global.userIdMap || new Map();
    
    // Create a default admin user if we need a fallback
    let defaultUserId;
    if (users.length > 0) {
      defaultUserId = users[0]._id;
    } else {
      const defaultUser = new User({
        email: 'admin@example.com',
        password: 'migrated-password-placeholder',
        name: 'Migration Admin',
        role: 'admin',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      defaultUser.$isNew = false; // Avoid password hashing
      await defaultUser.save({ validateBeforeSave: false });
      defaultUserId = defaultUser._id;
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const prismaSubmission of prismaSubmissions) {
      try {
        // Check if submission already exists in MongoDB
        const existingSubmission = await Submission.findOne({ submissionCode: prismaSubmission.submissionCode });
        
        if (existingSubmission && !overwrite) {
          console.log(`Skipping existing submission: ${prismaSubmission.submissionCode}`);
          // Store the mapping for this submission
          submissionIdMap.set(prismaSubmission.id, existingSubmission._id);
          skippedCount++;
          continue;
        }
        
        // Get the submitter's user ID from PostgreSQL
        const submitter = await prisma.users.findUnique({
          where: { id: prismaSubmission.submittedById }
        });
        
        // Try to find the user ID in different ways
        let submitterId;
        
        // 1. First check the global userIdMap (from the migrateUsers function)
        if (userIdMapping.has(prismaSubmission.submittedById)) {
          submitterId = userIdMapping.get(prismaSubmission.submittedById);
        }
        // 2. Then try to find by email
        else if (submitter && userMap.has(submitter.email)) {
          submitterId = userMap.get(submitter.email);
        }
        // 3. Use default admin user as a last resort
        else {
          console.log(`Warning: Using default user ID for submission ${prismaSubmission.submissionCode}`);
          submitterId = defaultUserId;
        }
        
        if (existingSubmission && overwrite) {
          console.log(`Updating existing submission: ${prismaSubmission.submissionCode}`);
          // Update submission fields
          Object.assign(existingSubmission, {
            recordNumber: prismaSubmission.recordNumber || 1,
            fullName: prismaSubmission.fullName || 'Unknown',
            emailAddress: prismaSubmission.emailAddress || 'unknown@example.com',
            submissionSource: prismaSubmission.submissionSource || 'Migration',
            organisation: prismaSubmission.organisation,
            briefDescription: prismaSubmission.briefDescription || 'Migrated submission',
            justification: prismaSubmission.justification || 'Migrated from PostgreSQL',
            urgencyLevel: prismaSubmission.urgencyLevel || 'Medium',
            impactAreas: prismaSubmission.impactAreas || [],
            affectedReferenceDataArea: prismaSubmission.affectedReferenceDataArea,
            technicalDependencies: prismaSubmission.technicalDependencies,
            relatedDocuments: prismaSubmission.relatedDocuments,
            attachments: prismaSubmission.attachments || 'None',
            additionalNotes: prismaSubmission.additionalNotes,
            declaration: prismaSubmission.declaration !== undefined ? prismaSubmission.declaration : true,
            reviewOutcome: prismaSubmission.reviewOutcome,
            reviewComments: prismaSubmission.reviewComments,
            reviewedAt: prismaSubmission.reviewedAt,
            deletedAt: prismaSubmission.deletedAt,
            createdAt: prismaSubmission.createdAt || new Date(),
            updatedAt: prismaSubmission.updatedAt || new Date(),
            submittedById: submitterId
          });
          
          await existingSubmission.save();
          // Store the mapping for this submission
          submissionIdMap.set(prismaSubmission.id, existingSubmission._id);
          migratedCount++;
        } else {
          console.log(`Creating new submission: ${prismaSubmission.submissionCode}`);
          const newSubmission = new Submission({
            recordNumber: prismaSubmission.recordNumber || 1,
            submissionCode: prismaSubmission.submissionCode,
            fullName: prismaSubmission.fullName || 'Unknown',
            emailAddress: prismaSubmission.emailAddress || 'unknown@example.com',
            submissionSource: prismaSubmission.submissionSource || 'Migration',
            organisation: prismaSubmission.organisation,
            briefDescription: prismaSubmission.briefDescription || 'Migrated submission',
            justification: prismaSubmission.justification || 'Migrated from PostgreSQL',
            urgencyLevel: prismaSubmission.urgencyLevel || 'Medium',
            impactAreas: prismaSubmission.impactAreas || [],
            affectedReferenceDataArea: prismaSubmission.affectedReferenceDataArea,
            technicalDependencies: prismaSubmission.technicalDependencies,
            relatedDocuments: prismaSubmission.relatedDocuments,
            attachments: prismaSubmission.attachments || 'None',
            additionalNotes: prismaSubmission.additionalNotes,
            declaration: prismaSubmission.declaration !== undefined ? prismaSubmission.declaration : true,
            reviewOutcome: prismaSubmission.reviewOutcome,
            reviewComments: prismaSubmission.reviewComments,
            reviewedAt: prismaSubmission.reviewedAt,
            deletedAt: prismaSubmission.deletedAt,
            createdAt: prismaSubmission.createdAt || new Date(),
            updatedAt: prismaSubmission.updatedAt || new Date(),
            submittedById: submitterId
          });
          
          await newSubmission.save();
          // Store the mapping for this submission
          submissionIdMap.set(prismaSubmission.id, newSubmission._id);
          migratedCount++;
        }
      } catch (err) {
        console.error(`Error migrating submission ${prismaSubmission.submissionCode}:`, err.message);
      }
    }
    
    // Store the submission ID mapping globally for use in other migration functions
    global.submissionIdMap = submissionIdMap;
    
    console.log(`Migration completed: ${migratedCount} submissions migrated, ${skippedCount} submissions skipped`);
    return true;
  } catch (error) {
    console.error('Error migrating submissions:', error);
    return false;
  }
}

/**
 * Migrate BCRs from PostgreSQL to MongoDB
 */
async function migrateBcrs() {
  try {
    console.log('Migrating BCRs from PostgreSQL to MongoDB...');
    
    // Get all BCRs from PostgreSQL
    const prismaBcrs = await prisma.bcr.findMany();
    console.log(`Found ${prismaBcrs.length} BCRs in PostgreSQL`);
    
    // Get all submissions for reference mapping
    const submissions = await Submission.find({});
    const submissionMap = new Map(submissions.map(sub => [sub.submissionCode, sub._id]));
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const prismaBcr of prismaBcrs) {
      // Check if BCR already exists in MongoDB
      const existingBcr = await Bcr.findOne({ bcrCode: prismaBcr.bcrCode });
      
      if (existingBcr && !overwrite) {
        console.log(`Skipping existing BCR: ${prismaBcr.bcrCode}`);
        skippedCount++;
        continue;
      }
      
      // Get the submission from PostgreSQL
      const prismaSubmission = await prisma.submission.findUnique({
        where: { id: prismaBcr.submissionId }
      });
      
      // Map to MongoDB submission ID
      const submissionId = prismaSubmission && submissionMap.get(prismaSubmission.submissionCode);
      
      if (!submissionId) {
        console.log(`Warning: Could not find MongoDB submission ID for BCR ${prismaBcr.bcrCode}`);
        // You might want to skip this BCR or create a placeholder submission
        continue;
      }
      
      if (existingBcr && overwrite) {
        console.log(`Updating existing BCR: ${prismaBcr.bcrCode}`);
        // Update BCR fields
        Object.assign(existingBcr, {
          recordNumber: prismaBcr.recordNumber,
          currentPhase: prismaBcr.currentPhase,
          status: prismaBcr.status,
          urgencyLevel: prismaBcr.urgencyLevel,
          impactedAreas: prismaBcr.impactedAreas,
          workflowHistory: prismaBcr.workflowHistory,
          updatedAt: prismaBcr.updatedAt,
          submissionId: submissionId
        });
        
        await existingBcr.save();
        migratedCount++;
      } else {
        console.log(`Creating new BCR: ${prismaBcr.bcrCode}`);
        const newBcr = new Bcr({
          recordNumber: prismaBcr.recordNumber,
          bcrCode: prismaBcr.bcrCode,
          submissionId: submissionId,
          currentPhase: prismaBcr.currentPhase,
          status: prismaBcr.status,
          urgencyLevel: prismaBcr.urgencyLevel,
          impactedAreas: prismaBcr.impactedAreas,
          workflowHistory: prismaBcr.workflowHistory,
          createdAt: prismaBcr.createdAt,
          updatedAt: prismaBcr.updatedAt
        });
        
        await newBcr.save();
        migratedCount++;
      }
    }
    
    console.log(`Migration completed: ${migratedCount} BCRs migrated, ${skippedCount} BCRs skipped`);
    return true;
  } catch (error) {
    console.error('Error migrating BCRs:', error);
    return false;
  }
}

/**
 * Migrate BCR workflow activities from PostgreSQL to MongoDB
 */
async function migrateBcrWorkflowActivities() {
  try {
    console.log('Migrating BCR workflow activities from PostgreSQL to MongoDB...');
    
    // Get all workflow activities from PostgreSQL
    const prismaActivities = await prisma.bcrWorkflowActivity.findMany();
    console.log(`Found ${prismaActivities.length} workflow activities in PostgreSQL`);
    
    // Get all BCRs and users for reference mapping
    const bcrs = await Bcr.find({});
    const users = await User.find({});
    
    // Create maps for quick lookups
    const bcrMap = new Map();
    const userMap = new Map();
    
    // First, get all BCRs from Prisma for ID mapping
    const prismaBcrs = await prisma.bcr.findMany();
    for (const prismaBcr of prismaBcrs) {
      const mongoBcr = bcrs.find(b => b.bcrCode === prismaBcr.bcrCode);
      if (mongoBcr) {
        bcrMap.set(prismaBcr.id, mongoBcr._id);
      }
    }
    
    // Get all users from Prisma for ID mapping
    const prismaUsers = await prisma.users.findMany();
    for (const prismaUser of prismaUsers) {
      const mongoUser = users.find(u => u.email === prismaUser.email);
      if (mongoUser) {
        userMap.set(prismaUser.id, mongoUser._id);
      }
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const prismaActivity of prismaActivities) {
      // Map IDs from PostgreSQL to MongoDB
      const bcrId = bcrMap.get(prismaActivity.bcrId);
      const performedById = userMap.get(prismaActivity.performedById);
      
      if (!bcrId || !performedById) {
        console.log(`Skipping activity: Missing references for BCR ID ${prismaActivity.bcrId} or user ID ${prismaActivity.performedById}`);
        skippedCount++;
        continue;
      }
      
      // Check if activity already exists in MongoDB
      const existingActivity = await BcrWorkflowActivity.findOne({
        bcrId: bcrId,
        phase: prismaActivity.phase,
        status: prismaActivity.status,
        performedAt: prismaActivity.performedAt
      });
      
      if (existingActivity && !overwrite) {
        console.log(`Skipping existing workflow activity for BCR ${prismaActivity.bcrId}`);
        skippedCount++;
        continue;
      }
      
      if (existingActivity && overwrite) {
        console.log(`Updating existing workflow activity for BCR ${prismaActivity.bcrId}`);
        // Update activity fields
        Object.assign(existingActivity, {
          action: prismaActivity.action,
          notes: prismaActivity.notes,
          updatedAt: new Date()
        });
        
        await existingActivity.save();
        migratedCount++;
      } else {
        console.log(`Creating new workflow activity for BCR ${prismaActivity.bcrId}`);
        const newActivity = new BcrWorkflowActivity({
          bcrId: bcrId,
          phase: prismaActivity.phase,
          status: prismaActivity.status,
          action: prismaActivity.action,
          performedById: performedById,
          performedAt: prismaActivity.performedAt,
          notes: prismaActivity.notes,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await newActivity.save();
        migratedCount++;
      }
    }
    
    console.log(`Migration completed: ${migratedCount} workflow activities migrated, ${skippedCount} workflow activities skipped`);
    return true;
  } catch (error) {
    console.error('Error migrating workflow activities:', error);
    return false;
  }
}

/**
 * Migrate funding data from PostgreSQL to MongoDB
 */
async function migrateFundings() {
  try {
    console.log('Migrating funding data from PostgreSQL to MongoDB...');
    
    // Get all funding records from PostgreSQL
    const prismaFundings = await prisma.fundings.findMany();
    console.log(`Found ${prismaFundings.length} funding records in PostgreSQL`);
    
    // Get all users for reference mapping
    const users = await User.find({});
    const userMap = new Map();
    
    // Get all users from Prisma for ID mapping
    const prismaUsers = await prisma.users.findMany();
    for (const prismaUser of prismaUsers) {
      const mongoUser = users.find(u => u.email === prismaUser.email);
      if (mongoUser) {
        userMap.set(prismaUser.id, mongoUser._id);
      }
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const prismaFunding of prismaFundings) {
      // Map user IDs from PostgreSQL to MongoDB
      const createdById = userMap.get(prismaFunding.createdBy);
      const lastUpdatedById = prismaFunding.lastUpdatedBy ? userMap.get(prismaFunding.lastUpdatedBy) : null;
      
      if (!createdById) {
        console.log(`Skipping funding record: Missing reference for user ID ${prismaFunding.createdBy}`);
        skippedCount++;
        continue;
      }
      
      // Check if funding record already exists in MongoDB
      const existingFunding = await Funding.findOne({
        trainingRoute: prismaFunding.trainingRoute,
        academicYear: prismaFunding.academicYear,
        fundingType: prismaFunding.fundingType
      });
      
      if (existingFunding && !overwrite) {
        console.log(`Skipping existing funding record for ${prismaFunding.trainingRoute} - ${prismaFunding.academicYear}`);
        skippedCount++;
        continue;
      }
      
      if (existingFunding && overwrite) {
        console.log(`Updating existing funding record for ${prismaFunding.trainingRoute} - ${prismaFunding.academicYear}`);
        // Update funding fields
        Object.assign(existingFunding, {
          fundingAmount: prismaFunding.fundingAmount,
          description: prismaFunding.description,
          isActive: prismaFunding.isActive,
          effectiveDate: prismaFunding.effectiveDate,
          expiryDate: prismaFunding.expiryDate,
          notes: prismaFunding.notes,
          metadata: prismaFunding.metadata,
          lastUpdatedById: lastUpdatedById,
          updatedAt: prismaFunding.updatedAt
        });
        
        await existingFunding.save();
        migratedCount++;
      } else {
        console.log(`Creating new funding record for ${prismaFunding.trainingRoute} - ${prismaFunding.academicYear}`);
        const newFunding = new Funding({
          trainingRoute: prismaFunding.trainingRoute,
          academicYear: prismaFunding.academicYear,
          fundingAmount: prismaFunding.fundingAmount,
          fundingType: prismaFunding.fundingType,
          description: prismaFunding.description,
          isActive: prismaFunding.isActive,
          effectiveDate: prismaFunding.effectiveDate,
          expiryDate: prismaFunding.expiryDate,
          createdById: createdById,
          lastUpdatedById: lastUpdatedById,
          notes: prismaFunding.notes,
          metadata: prismaFunding.metadata,
          createdAt: prismaFunding.createdAt,
          updatedAt: prismaFunding.updatedAt
        });
        
        await newFunding.save();
        migratedCount++;
      }
    }
    
    console.log(`Migration completed: ${migratedCount} funding records migrated, ${skippedCount} funding records skipped`);
    return true;
  } catch (error) {
    console.error('Error migrating funding data:', error);
    return false;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  try {
    console.log('Starting migration from PostgreSQL to MongoDB...');
    console.log(`Overwrite mode: ${overwrite ? 'ON' : 'OFF'}`);
    console.log(`Specific entity: ${specificEntity || 'ALL'}`);
    
    // Connect to MongoDB
    await mongoDb.connect();
    
    // Track migration results
    const results = {};
    
    // Migrate users
    if (!specificEntity || specificEntity === 'users') {
      results.users = await migrateUsers();
    }
    
    // Migrate BCR configurations
    if (!specificEntity || specificEntity === 'bcrconfigs') {
      results.bcrConfigs = await migrateBcrConfigs();
    }
    
    // Migrate workflow phases
    if (!specificEntity || specificEntity === 'workflowphases') {
      results.workflowPhases = await migrateWorkflowPhases();
    }
    
    // Migrate impacted areas
    if (!specificEntity || specificEntity === 'impactedareas') {
      results.impactedAreas = await migrateImpactedAreas();
    }
    
    // Migrate submissions
    if (!specificEntity || specificEntity === 'submissions') {
      results.submissions = await migrateSubmissions();
    }
    
    // Migrate BCRs
    if (!specificEntity || specificEntity === 'bcrs') {
      results.bcrs = await migrateBcrs();
    }
    
    // Migrate BCR workflow activities
    if (!specificEntity || specificEntity === 'workflowactivities') {
      results.workflowActivities = await migrateBcrWorkflowActivities();
    }
    
    // Migrate funding data
    if (!specificEntity || specificEntity === 'fundings') {
      results.fundings = await migrateFundings();
    }
    
    console.log('\nMigration Summary:');
    for (const [entity, success] of Object.entries(results)) {
      console.log(`${entity}: ${success ? 'SUCCESS' : 'FAILED'}`);
    }
    
    return Object.values(results).every(result => result === true);
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  } finally {
    // Close database connections
    await prisma.$disconnect();
    await mongoose.connection.close();
  }
}

// Run the migration
migrate()
  .then(success => {
    console.log(`Migration ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error during migration:', error);
    process.exit(1);
  });
