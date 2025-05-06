/**
 * Funding Service
 * Handles all database operations for funding requirements and history using Prisma
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

/**
 * Get all funding requirements with optional filtering
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - Array of funding requirements
 */
const getAllFundingRequirements = async (filters = {}) => {
  const whereConditions = {};
  
  if (filters.route && filters.route !== 'all') {
    whereConditions.route = filters.route;
  }
  
  if (filters.year && filters.year !== 'all') {
    whereConditions.year = parseInt(filters.year, 10);
  }
  
  const requirements = await prisma.fundingRequirements.findMany({
    where: whereConditions,
    include: {
      creator: true,
      updater: true
    },
    orderBy: [
      { year: 'desc' },
      { route: 'asc' }
    ]
  });
  
  return requirements;
};

/**
 * Get a funding requirement by ID
 * @param {string} id - Funding requirement ID
 * @returns {Promise<Object>} - Funding requirement object
 */
const getFundingRequirementById = async (id) => {
  const requirement = await prisma.fundingRequirements.findUnique({
    where: { id },
    include: {
      creator: true,
      updater: true
    }
  });
  
  return requirement;
};

/**
 * Create a new funding requirement
 * @param {Object} requirementData - Funding requirement data
 * @returns {Promise<Object>} - Created funding requirement
 */
const createFundingRequirement = async (requirementData) => {
  const newRequirement = await prisma.fundingRequirements.create({
    data: {
      id: uuidv4(),
      route: requirementData.route,
      year: parseInt(requirementData.year, 10),
      amount: parseFloat(requirementData.amount),
      description: requirementData.description,
      createdBy: requirementData.createdBy,
      lastUpdatedBy: requirementData.createdBy
    }
  });
  
  return newRequirement;
};

/**
 * Update a funding requirement
 * @param {string} id - Funding requirement ID
 * @param {Object} requirementData - Updated funding requirement data
 * @returns {Promise<Object>} - Updated funding requirement
 */
const updateFundingRequirement = async (id, requirementData) => {
  const updatedRequirement = await prisma.fundingRequirements.update({
    where: { id },
    data: {
      route: requirementData.route,
      year: parseInt(requirementData.year, 10),
      amount: parseFloat(requirementData.amount),
      description: requirementData.description,
      lastUpdatedBy: requirementData.updatedBy
    }
  });
  
  return updatedRequirement;
};

/**
 * Delete a funding requirement
 * @param {string} id - Funding requirement ID
 * @returns {Promise<Object>} - Deleted funding requirement
 */
const deleteFundingRequirement = async (id) => {
  const deletedRequirement = await prisma.fundingRequirements.delete({
    where: { id }
  });
  
  return deletedRequirement;
};

/**
 * Get all funding history entries with optional filtering
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - Array of funding history entries
 */
const getAllFundingHistory = async (filters = {}) => {
  const whereConditions = {};
  
  if (filters.route && filters.route !== 'all') {
    whereConditions.route = filters.route;
  }
  
  if (filters.year && filters.year !== 'all') {
    whereConditions.year = parseInt(filters.year, 10);
  }
  
  const historyEntries = await prisma.fundingHistories.findMany({
    where: whereConditions,
    include: {
      creator: true
    },
    orderBy: [
      { createdAt: 'desc' }
    ]
  });
  
  return historyEntries;
};

/**
 * Get a funding history entry by ID
 * @param {string} id - Funding history entry ID
 * @returns {Promise<Object>} - Funding history entry object
 */
const getFundingHistoryById = async (id) => {
  const historyEntry = await prisma.fundingHistories.findUnique({
    where: { id },
    include: {
      creator: true
    }
  });
  
  return historyEntry;
};

/**
 * Create a new funding history entry
 * @param {Object} historyData - Funding history entry data
 * @returns {Promise<Object>} - Created funding history entry
 */
const createFundingHistory = async (historyData) => {
  const newHistoryEntry = await prisma.fundingHistories.create({
    data: {
      id: uuidv4(),
      year: parseInt(historyData.year, 10),
      route: historyData.route,
      change: historyData.change,
      amount: parseFloat(historyData.amount),
      reason: historyData.reason,
      createdBy: historyData.createdBy
    }
  });
  
  return newHistoryEntry;
};

/**
 * Delete a funding history entry
 * @param {string} id - Funding history entry ID
 * @returns {Promise<Object>} - Deleted funding history entry
 */
const deleteFundingHistory = async (id) => {
  const deletedHistoryEntry = await prisma.fundingHistories.delete({
    where: { id }
  });
  
  return deletedHistoryEntry;
};

module.exports = {
  getAllFundingRequirements,
  getFundingRequirementById,
  createFundingRequirement,
  updateFundingRequirement,
  deleteFundingRequirement,
  getAllFundingHistory,
  getFundingHistoryById,
  createFundingHistory,
  deleteFundingHistory
};
