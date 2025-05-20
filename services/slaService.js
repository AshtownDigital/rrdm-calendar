/**
 * SLA Service
 * Handles Service Level Agreement tracking for BCRs
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logger } = require('../utils/logger');

// Define SLA thresholds in milliseconds
const SLA_THRESHOLDS = {
  // Time from submission to assignment
  ASSIGNMENT: {
    GREEN: 2 * 24 * 60 * 60 * 1000, // 2 days
    AMBER: 3 * 24 * 60 * 60 * 1000  // 3 days
  },
  // Time from assignment to decision
  DECISION: {
    GREEN: 5 * 24 * 60 * 60 * 1000, // 5 days
    AMBER: 7 * 24 * 60 * 60 * 1000  // 7 days
  },
  // Time from approval to implementation
  IMPLEMENTATION: {
    GREEN: 14 * 24 * 60 * 60 * 1000, // 14 days
    AMBER: 21 * 24 * 60 * 60 * 1000  // 21 days
  }
};

/**
 * Calculate SLA status for a BCR
 * @param {Object} bcr - BCR object
 * @returns {Object} - SLA status information
 */
const calculateSlaStatus = (bcr) => {
  const now = new Date();
  const createdAt = new Date(bcr.createdAt);
  const result = {
    assignment: { status: 'green', elapsed: 0, threshold: SLA_THRESHOLDS.ASSIGNMENT.GREEN },
    decision: { status: 'not_started', elapsed: 0, threshold: SLA_THRESHOLDS.DECISION.GREEN },
    implementation: { status: 'not_started', elapsed: 0, threshold: SLA_THRESHOLDS.IMPLEMENTATION.GREEN }
  };

  // Calculate assignment SLA
  if (!bcr.assignedTo) {
    // Not yet assigned
    const elapsed = now - createdAt;
    result.assignment.elapsed = elapsed;
    
    if (elapsed > SLA_THRESHOLDS.ASSIGNMENT.AMBER) {
      result.assignment.status = 'red';
    } else if (elapsed > SLA_THRESHOLDS.ASSIGNMENT.GREEN) {
      result.assignment.status = 'amber';
    }
  } else {
    // Already assigned - check history to find assignment date
    // For now, we'll use a placeholder implementation
    result.assignment.status = 'complete';
    
    // Calculate decision SLA if the BCR is under review but not yet approved/rejected
    if (bcr.status === 'under_review') {
      // For now, we'll use a placeholder implementation
      const elapsed = now - createdAt; // This should be assignment date in a real implementation
      result.decision.elapsed = elapsed;
      result.decision.status = 'green';
      
      if (elapsed > SLA_THRESHOLDS.DECISION.AMBER) {
        result.decision.status = 'red';
      } else if (elapsed > SLA_THRESHOLDS.DECISION.GREEN) {
        result.decision.status = 'amber';
      }
    } else if (bcr.status === 'approved' || bcr.status === 'rejected') {
      result.decision.status = 'complete';
      
      // Calculate implementation SLA if the BCR is approved but not yet implemented
      if (bcr.status === 'approved' && !bcr.implementationDate) {
        const elapsed = now - createdAt; // This should be approval date in a real implementation
        result.implementation.elapsed = elapsed;
        result.implementation.status = 'green';
        
        if (elapsed > SLA_THRESHOLDS.IMPLEMENTATION.AMBER) {
          result.implementation.status = 'red';
        } else if (elapsed > SLA_THRESHOLDS.IMPLEMENTATION.GREEN) {
          result.implementation.status = 'amber';
        }
      } else if (bcr.implementationDate) {
        result.implementation.status = 'complete';
      }
    }
  }

  return result;
};

/**
 * Get SLA status for a BCR
 * @param {string} bcrId - BCR ID
 * @returns {Promise<Object>} - SLA status information
 */
const getSlaStatus = async (bcrId) => {
  try {
    const bcr = await prisma.bcrs.findUnique({
      where: { id: bcrId },
      include: {
        Users_Bcrs_assignedToToUsers: true
      }
    });
    
    if (!bcr) {
      logger.warn(`BCR not found for SLA calculation: ${bcrId}`);
      return null;
    }
    
    return calculateSlaStatus(bcr);
  } catch (error) {
    logger.error('Error calculating SLA status:', error);
    return null;
  }
};

/**
 * Get SLA status for all BCRs
 * @returns {Promise<Object>} - SLA status information for all BCRs
 */
const getAllSlaStatuses = async () => {
  try {
    const bcrs = await prisma.bcrs.findMany({
      include: {
        Users_Bcrs_assignedToToUsers: true
      }
    });
    
    const result = {};
    
    for (const bcr of bcrs) {
      result[bcr.id] = calculateSlaStatus(bcr);
    }
    
    return result;
  } catch (error) {
    logger.error('Error calculating SLA statuses:', error);
    return {};
  }
};

/**
 * Get overdue BCRs
 * @returns {Promise<Array>} - Array of overdue BCRs with their SLA status
 */
const getOverdueBcrs = async () => {
  try {
    const allBcrs = await prisma.bcrs.findMany({
      include: {
        Users_Bcrs_assignedToToUsers: true,
        Users_Bcrs_requestedByToUsers: true
      }
    });
    
    const overdueBcrs = [];
    
    for (const bcr of allBcrs) {
      const slaStatus = calculateSlaStatus(bcr);
      
      // Check if any SLA is red
      if (
        slaStatus.assignment.status === 'red' ||
        slaStatus.decision.status === 'red' ||
        slaStatus.implementation.status === 'red'
      ) {
        overdueBcrs.push({
          bcr,
          slaStatus
        });
      }
    }
    
    return overdueBcrs;
  } catch (error) {
    logger.error('Error getting overdue BCRs:', error);
    return [];
  }
};

module.exports = {
  calculateSlaStatus,
  getSlaStatus,
  getAllSlaStatuses,
  getOverdueBcrs,
  SLA_THRESHOLDS
};
