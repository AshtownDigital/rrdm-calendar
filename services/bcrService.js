/**
 * BCR Service
 * Handles all database operations for BCRs using Prisma
 * Implements caching for frequently accessed data
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4, validate: isUuid } = require('uuid');
const { shortCache, mediumCache } = require('../utils/cache');


// Create a Prisma client instance
const prisma = new PrismaClient();

/**
 * Get all BCRs with optional filtering
 * @param {Object} filters - Optional filters for BCRs
 * @returns {Promise<Array>} - Array of BCRs
 */
const getAllBcrs = async (filters = {}) => {
  // Only cache when no filters are applied
  const noFilters = Object.keys(filters).length === 0;
  
  if (noFilters) {
    const cacheKey = 'all_bcrs';
    return mediumCache.getOrSet(cacheKey, async () => {
      try {
        return await prisma.Bcrs.findMany({
          include: {
            Users_Bcrs_requestedByToUsers: true,
            Users_Bcrs_assignedToToUsers: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } catch (error) {
        console.error('Error fetching BCRs:', error);
        // If there's an error with the enum, use a raw query instead
        if (error.message && error.message.includes("not found in enum")) {
          const bcrs = await prisma.$queryRaw`
            SELECT b.*, 
                  u1.id as "requestedBy_id", u1.name as "requestedBy_name", u1.email as "requestedBy_email", u1.role as "requestedBy_role",
                  u2.id as "assignedTo_id", u2.name as "assignedTo_name", u2.email as "assignedTo_email", u2.role as "assignedTo_role"
            FROM "Bcrs" b
            LEFT JOIN "Users" u1 ON b."requestedBy" = u1.id
            LEFT JOIN "Users" u2 ON b."assignedTo" = u2.id
            ORDER BY b."createdAt" DESC
          `;
          
          // Transform the raw results to match the expected format
          return bcrs.map(bcr => ({
            ...bcr,
            Users_Bcrs_requestedByToUsers: bcr.requestedBy_id ? {
              id: bcr.requestedBy_id,
              name: bcr.requestedBy_name,
              email: bcr.requestedBy_email,
              role: bcr.requestedBy_role
            } : null,
            Users_Bcrs_assignedToToUsers: bcr.assignedTo_id ? {
              id: bcr.assignedTo_id,
              name: bcr.assignedTo_name,
              email: bcr.assignedTo_email,
              role: bcr.assignedTo_role
            } : null
          }));
        }
        throw error;
      }
    });
  }
  
  // If filters are applied, perform the query without caching
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
  let bcrs;
  try {
    bcrs = await prisma.Bcrs.findMany({
      where: whereConditions,
      include: {
        Users_Bcrs_requestedByToUsers: true,
        Users_Bcrs_assignedToToUsers: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Error fetching filtered BCRs:', error);
    // If there's an error with the enum, use a raw query instead
    if (error.message && error.message.includes("not found in enum")) {
      // Build WHERE clause for the raw query
      let whereClause = '';
      const params = [];
      
      if (whereConditions.status) {
        whereClause += ' AND b."status" = $1';
        params.push(whereConditions.status);
      }
      
      if (whereConditions.impact && whereConditions.impact.contains) {
        whereClause += ` AND b."impact" LIKE $${params.length + 1}`;
        params.push(`%${whereConditions.impact.contains}%`);
      }
      
      if (whereConditions.createdAt) {
        if (whereConditions.createdAt.gte) {
          whereClause += ` AND b."createdAt" >= $${params.length + 1}`;
          params.push(whereConditions.createdAt.gte);
        }
        
        if (whereConditions.createdAt.lte) {
          whereClause += ` AND b."createdAt" <= $${params.length + 1}`;
          params.push(whereConditions.createdAt.lte);
        }
      }
      
      // Remove the leading ' AND ' if there are conditions
      if (whereClause) {
        whereClause = 'WHERE ' + whereClause.substring(5);
      }
      
      // Execute the raw query
      const rawQuery = `
        SELECT b.*, 
              u1.id as "requestedBy_id", u1.name as "requestedBy_name", u1.email as "requestedBy_email", u1.role as "requestedBy_role",
              u2.id as "assignedTo_id", u2.name as "assignedTo_name", u2.email as "assignedTo_email", u2.role as "assignedTo_role"
        FROM "Bcrs" b
        LEFT JOIN "Users" u1 ON b."requestedBy" = u1.id
        LEFT JOIN "Users" u2 ON b."assignedTo" = u2.id
        ${whereClause}
        ORDER BY b."createdAt" DESC
      `;
      
      bcrs = await prisma.$queryRawUnsafe(rawQuery, ...params);
      
      // Transform the raw results to match the expected format
      bcrs = bcrs.map(bcr => ({
        ...bcr,
        Users_Bcrs_requestedByToUsers: bcr.requestedBy_id ? {
          id: bcr.requestedBy_id,
          name: bcr.requestedBy_name,
          email: bcr.requestedBy_email,
          role: bcr.requestedBy_role
        } : null,
        Users_Bcrs_assignedToToUsers: bcr.assignedTo_id ? {
          id: bcr.assignedTo_id,
          name: bcr.assignedTo_name,
          email: bcr.assignedTo_email,
          role: bcr.assignedTo_role
        } : null
      }));
    } else {
      throw error;
    }
  }
  
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
  // Check if it's a BCR number (format: BCR-YYYY-NNNN)
  const isBcrNumber = /^BCR-\d{4}-\d{4}$/.test(idOrNumber);
  
  // Use different cache keys for ID and BCR number
  const cacheKey = isBcrNumber 
    ? `bcr_number_${idOrNumber}` 
    : `bcr_id_${idOrNumber}`;
  
  return shortCache.getOrSet(cacheKey, async () => {
    try {
      // First try to find by bcrNumber
      let bcr = null;
      
      if (isBcrNumber) {
        bcr = await prisma.Bcrs.findFirst({
          where: { 
            bcrNumber: idOrNumber 
          },
          include: {
            Users_Bcrs_requestedByToUsers: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            Users_Bcrs_assignedToToUsers: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        });
      }
      
      // If not found or not a BCR number, try by id
      if (!bcr) {
        // Validate if the ID is a valid UUID before querying
        if (!isUuid(idOrNumber)) {
          console.warn(`Invalid UUID format in getBcrById: ${idOrNumber}`);
          return null;
        }
        
        bcr = await prisma.Bcrs.findUnique({
          where: { 
            id: idOrNumber 
          },
          include: {
            Users_Bcrs_requestedByToUsers: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            Users_Bcrs_assignedToToUsers: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        });
      }
      
      // For backward compatibility with templates expecting the old relation names
      if (bcr) {
        // Ensure we have the relation properties to avoid errors
        if (!bcr.Users_Bcrs_requestedByToUsers && bcr.requestedByUser) {
          bcr.Users_Bcrs_requestedByToUsers = bcr.requestedByUser;
        }
        if (!bcr.Users_Bcrs_assignedToToUsers && bcr.assignedToUser) {
          bcr.Users_Bcrs_assignedToToUsers = bcr.assignedToUser;
        }
        
        // Ensure we have at least empty objects for these relations
        if (!bcr.Users_Bcrs_requestedByToUsers) {
          bcr.Users_Bcrs_requestedByToUsers = { name: 'Unknown', email: '', role: '' };
        }
        if (!bcr.Users_Bcrs_assignedToToUsers) {
          bcr.Users_Bcrs_assignedToToUsers = { name: 'Unassigned', email: '', role: '' };
        }
        
        // Ensure the BCR has expected properties after migration from Sequelize to Prisma
        // These fields might not exist in the Prisma schema but are expected by templates
        bcr.history = [];
        bcr.workflowHistory = [];
        bcr.currentPhaseId = bcr.currentPhaseId || 1;
        
        // Add default values for other potentially missing fields
        bcr.dateSubmitted = bcr.createdAt || new Date();
        bcr.lastUpdated = bcr.updatedAt || new Date();
        bcr.trelloId = bcr.trelloId || null;
        
        // Convert any stringified JSON fields back to objects
        if (typeof bcr.history === 'string') {
          try {
            bcr.history = JSON.parse(bcr.history);
          } catch (e) {
            bcr.history = [];
          }
        }
        
        if (typeof bcr.workflowHistory === 'string') {
          try {
            bcr.workflowHistory = JSON.parse(bcr.workflowHistory);
          } catch (e) {
            bcr.workflowHistory = [];
          }
        }
      }
      
      return bcr;
    } catch (error) {
      console.error('Error in getBcrById:', error);
      return null;
    }
  });
};

/**
 * Create a new BCR
 * @param {Object} bcrData - BCR data
 * @returns {Promise<Object>} - Created BCR
 */
const createBcr = async (bcrData) => {
  const bcrNumber = await generateBcrNumber();
  
  // Ensure title is always provided
  if (!bcrData.title) {
    // Use description as title if available, or create a default title
    bcrData.title = bcrData.description ? 
      (bcrData.description.length > 50 ? bcrData.description.substring(0, 50) + '...' : bcrData.description) : 
      `BCR ${bcrNumber}`;
  }
  
  // Always set the initial phase to Submission
  // Get the current status for the Submission phase
  const { WORKFLOW_PHASES } = require('../utils/workflowUtils');
  const submissionPhaseId = WORKFLOW_PHASES.SUBMISSION;
  
  // Set the initial status for all new BCRs
  // BUSINESS RULE: All BCRs must use 'new_submission' status, 'draft' status is not allowed
  
  try {
    const newBcr = await prisma.Bcrs.create({
      data: {
        id: uuidv4(),
        bcrNumber,
        description: bcrData.description || '',
        // BUSINESS RULE: All BCRs must use 'new_submission' status
        status: 'new_submission',
        priority: bcrData.priority || 'medium',
        impact: bcrData.impact || '',
        notes: bcrData.notes || '',
        targetDate: bcrData.targetDate,
        implementationDate: bcrData.implementationDate,
        createdAt: new Date(), // Add current date for createdAt
        updatedAt: new Date(), // Add current date for updatedAt
        // Set the requestedBy field directly
        requestedBy: bcrData.requestedBy || bcrData.submitterId || '00000000-0000-0000-0000-000000000001',
        // Connect to the assigned user if provided
        ...(bcrData.assignedTo ? {
          Users_Bcrs_assignedToToUsers: {
            connect: {
              id: bcrData.assignedTo
            }
          }
        } : {})
      }
    });
    // Invalidate caches
    mediumCache.delete('all_bcrs');
    
    return newBcr;
  } catch (error) {
    console.error('Error creating BCR:', error);
    // If there's an error with the enum, use a raw query instead
    if (error.message && error.message.includes("not found in enum")) {
      const bcrId = uuidv4();
      const now = new Date();
      
      // Execute raw SQL to insert the BCR
      await prisma.$executeRaw`
        INSERT INTO "Bcrs" (
          "id", "bcrNumber", "title", "description", "status", "priority", "impact",
          "notes", "targetDate", "implementationDate", "createdAt", "updatedAt", "requestedBy"
        ) VALUES (
          ${bcrId}::uuid, ${bcrNumber}, ${bcrData.title || ''}, ${bcrData.description || ''},
          'new_submission', ${bcrData.priority || 'medium'}, ${bcrData.impact || ''},
          ${bcrData.notes || ''}, ${bcrData.targetDate}, ${bcrData.implementationDate},
          ${now}, ${now}, ${bcrData.submitterId || bcrData.requestedBy}::uuid
        )
      `;
      
      // If there's an assigned user, update the record
      if (bcrData.assignedTo) {
        await prisma.$executeRaw`
          UPDATE "Bcrs" SET "assignedTo" = ${bcrData.assignedTo}::uuid
          WHERE "id" = ${bcrId}::uuid
        `;
      }
      
      // Return the created BCR
      return {
        id: bcrId,
        bcrNumber,
        description: bcrData.description || '',
        status: 'new_submission',
        priority: bcrData.priority || 'medium',
        impact: bcrData.impact || '',
        notes: bcrData.notes || '',
        targetDate: bcrData.targetDate,
        implementationDate: bcrData.implementationDate,
        createdAt: now,
        updatedAt: now,
        requestedBy: bcrData.submitterId || bcrData.requestedBy,
        assignedTo: bcrData.assignedTo || null
      };
    }
    throw error;
  }
  
  // Cache invalidation is now handled inside the try-catch block
};

/**
 * Update a BCR
 * @param {string} id - BCR ID
 * @param {Object} bcrData - Updated BCR data
 * @returns {Promise<Object>} - Updated BCR
 */
const updateBcr = async (id, bcrData) => {
  // Get the current BCR to get the bcrNumber for cache invalidation
  const currentBcr = await prisma.Bcrs.findUnique({
    where: { id },
    select: { bcrNumber: true }
  });
  
  let updatedBcr;
  try {
    updatedBcr = await prisma.Bcrs.update({
      where: { id },
      data: {
        description: bcrData.description,
        // Ensure we're not using 'draft' status (business rule)
        status: bcrData.status === 'draft' ? 'new_submission' : bcrData.status,
        priority: bcrData.priority,
        impact: bcrData.impact,
        // Connect to the assigned user if provided
        ...(bcrData.assignedTo ? {
          Users_Bcrs_assignedToToUsers: {
            connect: {
              id: bcrData.assignedTo
            }
          }
        } : {}),
        notes: bcrData.notes,
        targetDate: bcrData.targetDate,
        implementationDate: bcrData.implementationDate,
        updatedAt: new Date() // Always update the updatedAt timestamp
      }
    });
  } catch (error) {
    console.error('Error updating BCR:', error);
    // If there's an error with the enum, use a raw query instead
    if (error.message && error.message.includes("not found in enum")) {
      // Prepare the status value (enforce business rule)
      const statusValue = bcrData.status === 'draft' ? 'new_submission' : bcrData.status;
      
      // Execute raw SQL to update the BCR
      await prisma.$executeRaw`
        UPDATE "Bcrs" SET
          "title" = ${bcrData.title},
          "description" = ${bcrData.description},
          "status" = ${statusValue},
          "priority" = ${bcrData.priority},
          "impact" = ${bcrData.impact},
          "assignedTo" = ${bcrData.assignedTo}::uuid,
          "notes" = ${bcrData.notes},
          "targetDate" = ${bcrData.targetDate},
          "implementationDate" = ${bcrData.implementationDate},
          "updatedAt" = ${new Date()}
        WHERE "id" = ${id}::uuid
      `;
      
      // Get the updated BCR
      const updatedBcrs = await prisma.$queryRaw`
        SELECT * FROM "Bcrs" WHERE "id" = ${id}::uuid
      `;
      
      if (updatedBcrs.length > 0) {
        updatedBcr = updatedBcrs[0];
      } else {
        throw new Error(`BCR with ID ${id} not found after update`);
      }
    } else {
      throw error;
    }
  }
  
  // Invalidate caches
  mediumCache.delete('all_bcrs');
  shortCache.delete(`bcr_id_${id}`);
  
  if (currentBcr && currentBcr.bcrNumber) {
    shortCache.delete(`bcr_number_${currentBcr.bcrNumber}`);
  }
  
  return updatedBcr;
};

/**
 * Delete a BCR
 * @param {string} id - BCR ID
 * @returns {Promise<Object>} - Deleted BCR
 */
const deleteBcr = async (id) => {
  // Get the current BCR to get the bcrNumber for cache invalidation
  const currentBcr = await prisma.Bcrs.findUnique({
    where: { id },
    select: { bcrNumber: true }
  });
  
  const deletedBcr = await prisma.Bcrs.delete({
    where: { id }
  });
  
  // Invalidate caches
  mediumCache.delete('all_bcrs');
  shortCache.delete(`bcr_id_${id}`);
  
  if (currentBcr && currentBcr.bcrNumber) {
    shortCache.delete(`bcr_number_${currentBcr.bcrNumber}`);
  }
  
  return deletedBcr;
};

/**
 * Generate a new BCR number
 * @returns {Promise<string>} - Generated BCR number
 */
const generateBcrNumber = async () => {
  const currentYear = new Date().getFullYear();
  
  // Find the latest BCR for this year
  const latestBcr = await prisma.Bcrs.findFirst({
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
