/**
 * Audit Trail Service
 * 
 * This service provides comprehensive audit logging for tracking user actions.
 * It records who did what, when, and to which resource for compliance and security.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logger } = require('../logger');

/**
 * Create an audit log entry
 * @param {Object} auditData - Audit data object
 * @param {string} auditData.action - The action performed (e.g., 'create', 'update', 'delete')
 * @param {string} auditData.userId - The ID of the user who performed the action
 * @param {string} auditData.resourceType - The type of resource affected (e.g., 'user', 'bcr', 'funding')
 * @param {string} auditData.resourceId - The ID of the resource affected
 * @param {Object} auditData.details - Additional details about the action
 * @param {string} auditData.ipAddress - The IP address of the user
 * @returns {Promise<Object>} - The created audit log entry
 */
async function createAuditLog({
  action,
  userId,
  resourceType,
  resourceId,
  details = {},
  ipAddress
}) {
  try {
    // Create the audit log entry in the database
    const auditLog = await prisma.auditLog.create({
      data: {
        action,
        userId,
        resourceType,
        resourceId,
        details,
        ipAddress,
        timestamp: new Date()
      }
    });
    
    // Log the audit event
    logger.info('Audit event recorded', {
      auditId: auditLog.id,
      action,
      userId,
      resourceType,
      resourceId
    });
    
    return auditLog;
  } catch (error) {
    logger.error('Failed to create audit log', {
      error: error.message,
      action,
      userId,
      resourceType,
      resourceId
    });
    
    // Return null instead of throwing to prevent disrupting the main application flow
    return null;
  }
}

/**
 * Get audit logs for a specific resource
 * @param {string} resourceType - The type of resource
 * @param {string} resourceId - The ID of the resource
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of logs to return
 * @param {number} options.offset - Number of logs to skip
 * @returns {Promise<Array>} - Array of audit log entries
 */
async function getResourceAuditLogs(resourceType, resourceId, { limit = 50, offset = 0 } = {}) {
  try {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        resourceType,
        resourceId
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });
    
    return auditLogs;
  } catch (error) {
    logger.error('Failed to get resource audit logs', {
      error: error.message,
      resourceType,
      resourceId
    });
    
    throw error;
  }
}

/**
 * Get audit logs for a specific user
 * @param {string} userId - The ID of the user
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of logs to return
 * @param {number} options.offset - Number of logs to skip
 * @returns {Promise<Array>} - Array of audit log entries
 */
async function getUserAuditLogs(userId, { limit = 50, offset = 0 } = {}) {
  try {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });
    
    return auditLogs;
  } catch (error) {
    logger.error('Failed to get user audit logs', {
      error: error.message,
      userId
    });
    
    throw error;
  }
}

/**
 * Search audit logs with filters
 * @param {Object} filters - Search filters
 * @param {string} filters.action - Filter by action
 * @param {string} filters.userId - Filter by user ID
 * @param {string} filters.resourceType - Filter by resource type
 * @param {string} filters.resourceId - Filter by resource ID
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of logs to return
 * @param {number} options.offset - Number of logs to skip
 * @returns {Promise<Array>} - Array of audit log entries
 */
async function searchAuditLogs(filters = {}, { limit = 50, offset = 0 } = {}) {
  try {
    // Build the where clause based on filters
    const where = {};
    
    if (filters.action) {
      where.action = filters.action;
    }
    
    if (filters.userId) {
      where.userId = filters.userId;
    }
    
    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }
    
    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }
    
    // Add date range filter if provided
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      
      if (filters.startDate) {
        where.timestamp.gte = new Date(filters.startDate);
      }
      
      if (filters.endDate) {
        where.timestamp.lte = new Date(filters.endDate);
      }
    }
    
    // Query the database
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });
    
    return auditLogs;
  } catch (error) {
    logger.error('Failed to search audit logs', {
      error: error.message,
      filters
    });
    
    throw error;
  }
}

/**
 * Create an Express middleware for audit logging
 * @param {Object} options - Middleware options
 * @param {string} options.action - The action to log
 * @param {Function} options.getResourceType - Function to get resource type from request
 * @param {Function} options.getResourceId - Function to get resource ID from request
 * @param {Function} options.getDetails - Function to get additional details from request
 * @returns {Function} - Express middleware
 */
function auditMiddleware({ 
  action, 
  getResourceType, 
  getResourceId, 
  getDetails = () => ({}) 
}) {
  return async (req, res, next) => {
    // Store the original end method
    const originalEnd = res.end;
    
    // Override the end method
    res.end = async function(...args) {
      // Only audit successful requests
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await createAuditLog({
            action,
            userId: req.user ? req.user.id : 'anonymous',
            resourceType: typeof getResourceType === 'function' ? getResourceType(req) : getResourceType,
            resourceId: typeof getResourceId === 'function' ? getResourceId(req) : getResourceId,
            details: typeof getDetails === 'function' ? getDetails(req, res) : getDetails,
            ipAddress: req.ip || req.connection.remoteAddress
          });
        } catch (error) {
          // Log the error but don't disrupt the request flow
          logger.error('Audit middleware error', { error: error.message });
        }
      }
      
      // Call the original end method
      originalEnd.apply(res, args);
    };
    
    next();
  };
}

module.exports = {
  createAuditLog,
  getResourceAuditLogs,
  getUserAuditLogs,
  searchAuditLogs,
  auditMiddleware
};
