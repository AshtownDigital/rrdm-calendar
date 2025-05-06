/**
 * BCR Service
 * Handles all database operations for BCRs using Prisma
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

// Create a Prisma client instance
const prisma = new PrismaClient();

/**
 * Get all BCRs with optional filtering
 * @param {Object} filters - Optional filters for BCRs
 * @returns {Promise<Array>} - Array of BCRs
 */
const getAllBcrs = async (filters = {}) => {
  const whereConditions = {};
  
  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    whereConditions.status = filters.status;
  }
  
  // Apply impact area filter
  if (filters.impactArea && filters.impactArea !== 'all') {
    whereConditions.impact = {
      contains: filters.impactArea
    };
  }
  
  // Apply date filters
  if (filters.startDate) {
    whereConditions.createdAt = {
      ...whereConditions.createdAt,
      gte: new Date(filters.startDate)
    };
  }
  
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999); // End of day
    
    whereConditions.createdAt = {
      ...whereConditions.createdAt,
      lte: endDate
    };
  }
  
  // Get BCRs with user information
  const bcrs = await prisma.bcrs.findMany({
    where: whereConditions,
    include: {
      Users_Bcrs_requestedByToUsers: true,
      Users_Bcrs_assignedToToUsers: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  // Filter by submitter if specified
  if (filters.submitter && filters.submitter !== 'all') {
    return bcrs.filter(bcr => 
      bcr.Users_Bcrs_requestedByToUsers && 
      bcr.Users_Bcrs_requestedByToUsers.name === filters.submitter
    );
  }
  
  return bcrs;
};

/**
 * Get a BCR by ID or BCR number
 * @param {string} idOrNumber - BCR ID or BCR number
 * @returns {Promise<Object>} - BCR object
 */
const getBcrById = async (idOrNumber) => {
  // First try to find by bcrNumber
  let bcr = await prisma.bcrs.findFirst({
    where: { 
      bcrNumber: idOrNumber 
    },
    include: {
      Users_Bcrs_requestedByToUsers: true,
      Users_Bcrs_assignedToToUsers: true
    }
  });
  
  // If not found, try by id
  if (!bcr) {
    bcr = await prisma.bcrs.findUnique({
      where: { 
        id: idOrNumber 
      },
      include: {
        Users_Bcrs_requestedByToUsers: true,
        Users_Bcrs_assignedToToUsers: true
      }
    });
  }
  
  return bcr;
};

/**
 * Create a new BCR
 * @param {Object} bcrData - BCR data
 * @returns {Promise<Object>} - Created BCR
 */
const createBcr = async (bcrData) => {
  const bcrNumber = await generateBcrNumber();
  
  const newBcr = await prisma.bcrs.create({
    data: {
      id: uuidv4(),
      bcrNumber,
      title: bcrData.title,
      description: bcrData.description,
      status: bcrData.status || 'draft',
      priority: bcrData.priority || 'medium',
      impact: bcrData.impact,
      requestedBy: bcrData.requestedBy,
      assignedTo: bcrData.assignedTo,
      notes: bcrData.notes,
      targetDate: bcrData.targetDate,
      implementationDate: bcrData.implementationDate
    }
  });
  
  return newBcr;
};

/**
 * Update a BCR
 * @param {string} id - BCR ID
 * @param {Object} bcrData - Updated BCR data
 * @returns {Promise<Object>} - Updated BCR
 */
const updateBcr = async (id, bcrData) => {
  const updatedBcr = await prisma.bcrs.update({
    where: { id },
    data: {
      title: bcrData.title,
      description: bcrData.description,
      status: bcrData.status,
      priority: bcrData.priority,
      impact: bcrData.impact,
      assignedTo: bcrData.assignedTo,
      notes: bcrData.notes,
      targetDate: bcrData.targetDate,
      implementationDate: bcrData.implementationDate
    }
  });
  
  return updatedBcr;
};

/**
 * Delete a BCR
 * @param {string} id - BCR ID
 * @returns {Promise<Object>} - Deleted BCR
 */
const deleteBcr = async (id) => {
  const deletedBcr = await prisma.bcrs.delete({
    where: { id }
  });
  
  return deletedBcr;
};

/**
 * Generate a new BCR number
 * @returns {Promise<string>} - Generated BCR number
 */
const generateBcrNumber = async () => {
  const currentYear = new Date().getFullYear();
  
  // Find the latest BCR for this year
  const latestBcr = await prisma.bcrs.findFirst({
    where: {
      bcrNumber: {
        startsWith: `BCR-${currentYear}-`
      }
    },
    orderBy: {
      bcrNumber: 'desc'
    }
  });
  
  let nextNumber = 1;
  if (latestBcr && latestBcr.bcrNumber) {
    // Extract the numeric part of the last BCR number and increment
    const lastId = latestBcr.bcrNumber;
    const lastNumber = parseInt(lastId.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }
  
  // Format with leading zeros (4 digits)
  return `BCR-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
};

module.exports = {
  getAllBcrs,
  getBcrById,
  createBcr,
  updateBcr,
  deleteBcr,
  generateBcrNumber,
  // Export prisma for testing purposes
  _prisma: prisma
};
