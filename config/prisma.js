/**
 * Prisma compatibility layer for MongoDB migration
 * This file provides a compatibility layer for code that still references Prisma
 * while we transition to MongoDB
 * Updated for Vercel serverless environment compatibility
 */
const mongoose = require('mongoose');
const { db, connect } = require('./database.mongo');

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL === '1';

// Log database connection attempt
console.log(`Database connection attempt in ${isServerless ? 'serverless' : 'standard'} mode`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}, DATABASE_URL set: ${!!process.env.DATABASE_URL}`);

// Create a mock Prisma client that redirects to MongoDB
const prisma = {
  // Mock connection methods
  $connect: async () => {
    try {
      // In serverless environments, we don't need to connect every time
      if (isServerless) {
        console.log('Serverless environment detected, skipping Prisma connection');
        return true;
      }
      
      await connect();
      console.log('Prisma client created successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect to database:', error.message);
      if (isServerless) {
        console.log('Continuing in serverless mode despite connection error');
        return true;
      }
      throw error;
    }
  },
  
  $disconnect: async () => {
    try {
      await mongoose.disconnect();
      console.log('Prisma disconnected successfully');
      return true;
    } catch (error) {
      console.error('Error disconnecting from Prisma:', error);
      throw error;
    }
  },
  
  // Mock models with common methods
  // These will be expanded as needed during migration
  
  // BCR model
  Bcr: {
    findUnique: async ({ where }) => {
      const Bcr = mongoose.model('Bcr');
      return await Bcr.findById(where.id);
    },
    findFirst: async ({ where }) => {
      const Bcr = mongoose.model('Bcr');
      return await Bcr.findOne(where);
    },
    findMany: async ({ where, orderBy, include, take } = {}) => {
      const Bcr = mongoose.model('Bcr');
      let query = Bcr.find(where || {});
      
      if (orderBy) {
        const sortField = Object.keys(orderBy)[0];
        const sortOrder = orderBy[sortField] === 'asc' ? 1 : -1;
        query = query.sort({ [sortField]: sortOrder });
      }
      
      if (include) {
        Object.keys(include).forEach(relation => {
          query = query.populate(relation);
        });
      }
      
      if (take) {
        query = query.limit(take);
      }
      
      return await query.exec();
    },
    count: async ({ where } = {}) => {
      const Bcr = mongoose.model('Bcr');
      return await Bcr.countDocuments(where || {});
    },
    create: async ({ data }) => {
      const Bcr = mongoose.model('Bcr');
      const bcr = new Bcr(data);
      return await bcr.save();
    },
    update: async ({ where, data }) => {
      const Bcr = mongoose.model('Bcr');
      return await Bcr.findByIdAndUpdate(where.id, data, { new: true });
    },
    delete: async ({ where }) => {
      const Bcr = mongoose.model('Bcr');
      return await Bcr.findByIdAndDelete(where.id);
    }
  },
  
  // Submission model
  Submission: {
    findUnique: async ({ where }) => {
      const Submission = mongoose.model('Submission');
      return await Submission.findById(where.id);
    },
    findFirst: async ({ where }) => {
      const Submission = mongoose.model('Submission');
      return await Submission.findOne(where);
    },
    findMany: async ({ where, orderBy, include, take } = {}) => {
      const Submission = mongoose.model('Submission');
      let query = Submission.find(where || {});
      
      if (orderBy) {
        const sortField = Object.keys(orderBy)[0];
        const sortOrder = orderBy[sortField] === 'asc' ? 1 : -1;
        query = query.sort({ [sortField]: sortOrder });
      }
      
      if (include) {
        Object.keys(include).forEach(relation => {
          query = query.populate(relation);
        });
      }
      
      if (take) {
        query = query.limit(take);
      }
      
      return await query.exec();
    },
    count: async ({ where } = {}) => {
      const Submission = mongoose.model('Submission');
      return await Submission.countDocuments(where || {});
    },
    create: async ({ data }) => {
      const Submission = mongoose.model('Submission');
      const submission = new Submission(data);
      return await submission.save();
    },
    update: async ({ where, data }) => {
      const Submission = mongoose.model('Submission');
      return await Submission.findByIdAndUpdate(where.id, data, { new: true });
    },
    delete: async ({ where }) => {
      const Submission = mongoose.model('Submission');
      return await Submission.findByIdAndDelete(where.id);
    }
  },
  
  // BcrConfigs model
  bcrConfigs: {
    findUnique: async ({ where }) => {
      const BcrConfig = mongoose.model('BcrConfig');
      return await BcrConfig.findById(where.id);
    },
    findFirst: async ({ where }) => {
      const BcrConfig = mongoose.model('BcrConfig');
      return await BcrConfig.findOne(where);
    },
    findMany: async ({ where, orderBy } = {}) => {
      const BcrConfig = mongoose.model('BcrConfig');
      let query = BcrConfig.find(where || {});
      
      if (orderBy) {
        const sortField = Object.keys(orderBy)[0];
        const sortOrder = orderBy[sortField] === 'asc' ? 1 : -1;
        query = query.sort({ [sortField]: sortOrder });
      }
      
      return await query.exec();
    },
    create: async ({ data }) => {
      const BcrConfig = mongoose.model('BcrConfig');
      const config = new BcrConfig(data);
      return await config.save();
    },
    updateMany: async ({ where, data }) => {
      const BcrConfig = mongoose.model('BcrConfig');
      return await BcrConfig.updateMany(where, { $set: data });
    },
    deleteMany: async ({ where }) => {
      const BcrConfig = mongoose.model('BcrConfig');
      return await BcrConfig.deleteMany(where);
    }
  },
  
  // Users model
  users: {
    findUnique: async ({ where }) => {
      const User = mongoose.model('User');
      return await User.findById(where.id);
    },
    findFirst: async ({ where }) => {
      const User = mongoose.model('User');
      return await User.findOne(where);
    },
    findMany: async ({ where } = {}) => {
      const User = mongoose.model('User');
      return await User.find(where || {});
    },
    count: async () => {
      const User = mongoose.model('User');
      return await User.countDocuments();
    }
  },
  
  // ImpactedArea model
  impactedArea: {
    findUnique: async ({ where }) => {
      const ImpactedArea = mongoose.model('ImpactedArea');
      return await ImpactedArea.findById(where.id);
    },
    findFirst: async ({ where }) => {
      const ImpactedArea = mongoose.model('ImpactedArea');
      return await ImpactedArea.findOne(where);
    },
    findMany: async ({ where, orderBy } = {}) => {
      const ImpactedArea = mongoose.model('ImpactedArea');
      let query = ImpactedArea.find(where || {});
      
      if (orderBy) {
        const sortField = Object.keys(orderBy)[0];
        const sortOrder = orderBy[sortField] === 'asc' ? 1 : -1;
        query = query.sort({ [sortField]: sortOrder });
      }
      
      return await query.exec();
    },
    create: async ({ data }) => {
      const ImpactedArea = mongoose.model('ImpactedArea');
      const area = new ImpactedArea(data);
      return await area.save();
    },
    update: async ({ where, data }) => {
      const ImpactedArea = mongoose.model('ImpactedArea');
      return await ImpactedArea.findByIdAndUpdate(where.id, data, { new: true });
    },
    delete: async ({ where }) => {
      const ImpactedArea = mongoose.model('ImpactedArea');
      return await ImpactedArea.findByIdAndDelete(where.id);
    }
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing MongoDB connection');
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
  process.exit(0);
});

module.exports = { prisma };
