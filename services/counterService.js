/**
 * Counter Service
 * Handles global counters for BCR submissions and statuses
 * Updated to exclusively use the new Bcr model and provide more accurate counts
 */
// Using centralized Prisma client
const { prisma } = require('../config/prisma');
// Prisma client is imported from centralized config
const workflowPhaseService = require('./workflowPhaseService');

// In-memory cache for counters to avoid excessive database queries
let countersCache = {
  submissions: {
    total: null,
    pending: null,
    approved: null,
    rejected: null
  },
  bcrs: {
    byPhase: {},
    byStatus: {},
    byUrgency: {},
    byImpactArea: {}
  },
  lastUpdated: null,
  refreshInProgress: false
};

/**
 * Initialize counters by loading current values from database
 * @returns {Promise<Object>} - Current counter values
 */
const initializeCounters = async () => {
  // Prevent multiple concurrent refreshes
  if (countersCache.refreshInProgress) {
    console.log('Counter refresh already in progress, waiting...');
    // Wait for the current refresh to complete
    while (countersCache.refreshInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return countersCache;
  }
  
  countersCache.refreshInProgress = true;
  
  try {
    console.log('Initializing counters from database...');
    
    // Get submission counts with proper error handling
    let totalCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let moreInfoCount = 0;
    let pausedCount = 0;
    let rejectedEditCount = 0;
    
    try {
      // Total submissions (not deleted)
      totalCount = await prisma.Submission.count({ 
        where: { deletedAt: null } 
      });
      
      // Count submissions by review outcome
      // Pending Review submissions - only count those explicitly marked as 'Pending Review'
      // Note: All submissions should have a reviewOutcome value now
      pendingCount = await prisma.Submission.count({ 
        where: { 
          deletedAt: null,
          reviewOutcome: 'Pending Review'
        } 
      });
      
      console.log(`Pending Review count: ${pendingCount} submissions`);
      
      // Approved submissions
      approvedCount = await prisma.Submission.count({
        where: {
          deletedAt: null,
          reviewOutcome: 'Approved'
        }
      });
      
      // Rejected submissions
      rejectedCount = await prisma.Submission.count({
        where: {
          deletedAt: null,
          reviewOutcome: 'Rejected'
        }
      });
      
      console.log(`Approved count: ${approvedCount} submissions`);
      console.log(`Rejected count: ${rejectedCount} submissions`);
      
      // More Info requested submissions
      moreInfoCount = await prisma.Submission.count({
        where: {
          deletedAt: null,
          reviewOutcome: 'More Info'
        }
      });
      
      // Paused submissions
      pausedCount = await prisma.Submission.count({
        where: {
          deletedAt: null,
          reviewOutcome: 'Paused'
        }
      });
      
      // Rejected & Edit submissions
      rejectedEditCount = await prisma.Submission.count({
        where: {
          deletedAt: null,
          reviewOutcome: 'Rejected & Edit'
        }
      });
      
      console.log(`Submission counts - Total: ${totalCount}, Pending: ${pendingCount}, Approved: ${approvedCount}, Rejected: ${rejectedCount}, More Info: ${moreInfoCount}, Paused: ${pausedCount}, Rejected & Edit: ${rejectedEditCount}`);
    } catch (error) {
      console.error('Error getting submission counts:', error);
    }
    
    // Get BCR counts by phase and status
    const bcrsByPhase = {};
    const bcrsByStatus = {};
    const bcrsByUrgency = {};
    const bcrsByImpactArea = {};
    
    try {
      // Get all phases and statuses
      const phases = await workflowPhaseService.getAllPhases();
      const statuses = await workflowPhaseService.getAllStatuses();
      
      // Get all urgency levels
      const urgencyLevels = await prisma.BcrConfigs.findMany({
        where: { type: 'urgencyLevel' },
        orderBy: { displayOrder: 'asc' }
      });
      
      // Get all impact areas
      let impactAreas = [];
      try {
        impactAreas = await prisma.ImpactedAreas.findMany({
          orderBy: { order: 'asc' }
        });
        console.log(`Retrieved ${impactAreas.length} impact areas`);
      } catch (error) {
        console.error('Error retrieving impact areas:', error);
        // Fallback to empty array if there's an error
        impactAreas = [];
      }
      
      // Initialize phase counts from the Bcr model only
      for (const phase of phases) {
        try {
          const count = await prisma.Bcr.count({
            where: {
              currentPhase: phase.name
            }
          });
          bcrsByPhase[phase.name] = count;
          console.log(`Phase ${phase.name}: ${count} BCRs`);
        } catch (error) {
          console.error(`Error counting BCRs for phase ${phase.name}:`, error);
          bcrsByPhase[phase.name] = 0;
        }
      }
      
      // Initialize status counts from the Bcr model only
      for (const status of statuses) {
        try {
          const count = await prisma.Bcr.count({
            where: {
              status: status.status
            }
          });
          bcrsByStatus[status.status] = count;
          console.log(`Status ${status.status}: ${count} BCRs`);
        } catch (error) {
          console.error(`Error counting BCRs for status ${status.status}:`, error);
          bcrsByStatus[status.status] = 0;
        }
      }
      
      // Initialize urgency level counts
      for (const level of urgencyLevels) {
        try {
          const count = await prisma.Bcr.count({
            where: {
              urgencyLevel: level.value
            }
          });
          bcrsByUrgency[level.value] = count;
          console.log(`Urgency ${level.value}: ${count} BCRs`);
        } catch (error) {
          console.error(`Error counting BCRs for urgency level ${level.value}:`, error);
          bcrsByUrgency[level.value] = 0;
        }
      }
      
      // Initialize impact area counts
      // First try to get impact areas from the impactedAreasModel if available
      try {
        // Get impact areas from BcrConfigs as a fallback
        if (impactAreas.length === 0) {
          const impactAreaConfigs = await prisma.BcrConfigs.findMany({
            where: { type: 'impactArea' },
            orderBy: { displayOrder: 'asc' }
          });
          
          if (impactAreaConfigs && impactAreaConfigs.length > 0) {
            impactAreas = impactAreaConfigs;
            console.log(`Using ${impactAreaConfigs.length} impact areas from BcrConfigs`);
          }
        }
        
        // Count BCRs by impact area
        for (const area of impactAreas) {
          try {
            // Use the appropriate ID field based on the source
            const areaId = area.id || area.value;
            
            if (!areaId) {
              console.warn(`Impact area missing ID or value:`, area);
              continue;
            }
            
            const count = await prisma.Bcr.count({
              where: {
                impactedAreas: {
                  has: areaId
                }
              }
            });
            
            bcrsByImpactArea[areaId] = count;
            console.log(`Impact area ${area.name || area.value}: ${count} BCRs`);
          } catch (error) {
            console.error(`Error counting BCRs for impact area:`, error);
            if (area.id) bcrsByImpactArea[area.id] = 0;
            if (area.value) bcrsByImpactArea[area.value] = 0;
          }
        }
      } catch (error) {
        console.error('Error processing impact areas:', error);
      }
    } catch (error) {
      console.error('Error getting BCR counts:', error);
    }
    
    // Update cache with all the new values
    countersCache = {
      submissions: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        moreInfo: moreInfoCount,
        paused: pausedCount,
        rejectedEdit: rejectedEditCount
      },
      bcrs: {
        byPhase: bcrsByPhase,
        byStatus: bcrsByStatus,
        byUrgency: bcrsByUrgency,
        byImpactArea: bcrsByImpactArea
      },
      lastUpdated: new Date(),
      refreshInProgress: false
    };
    
    console.log('Counters initialized successfully');
    return countersCache;
  } catch (error) {
    console.error('Error initializing counters:', error);
    countersCache.refreshInProgress = false;
    throw error;
  }
};

/**
 * Force refresh of all counters from the database
 * @returns {Promise<Object>} - Updated counter values
 */
const refreshCounters = async () => {
  console.log('Forcing refresh of all counters...');
  // Clear any existing refresh flag to ensure we can start a new refresh
  countersCache.refreshInProgress = false;
  // Force a complete refresh of all counters
  return await initializeCounters();
};

/**
 * Get current counter values
 * @param {boolean} refresh - Whether to refresh counters from database
 * @returns {Promise<Object>} - Current counter values
 */
const getCounters = async (refresh = false) => {
  if (refresh || !countersCache.lastUpdated) {
    return await refreshCounters();
  }
  
  return countersCache;
};

/**
 * Force refresh all counters from the database
 * @returns {Promise<Object>} - Updated counter values
 */
const refreshAllCounters = async () => {
  console.log('Forcing refresh of all counters from database');
  return await initializeCounters();
};

/**
 * Update counters when a submission is approved
 * @param {string} submissionId - ID of the approved submission
 * @param {string} bcrId - ID of the created BCR
 * @returns {Promise<Object>} - Updated counter values
 */
const updateCountersOnApproval = async (submissionId, bcrId) => {
  try {
    console.log(`Updating counters for approval of submission ${submissionId} with BCR ${bcrId}`);
    
    // Get the submission and BCR details
    const submission = await prisma.Submission.findUnique({
      where: { id: submissionId }
    });
    
    const bcr = await prisma.Bcr.findUnique({
      where: { id: bcrId },
      include: {
        submission: true
      }
    });
    
    if (bcr) {
      console.log(`BCR details - Phase: ${bcr.currentPhase}, Status: ${bcr.status}, Urgency: ${bcr.urgencyLevel}`);
      console.log(`Impact Areas: ${JSON.stringify(bcr.impactedAreas)}`);
      
      // Update submission in database to link it to the BCR if not already linked
      if (submission && !submission.bcrId) {
        await prisma.Submission.update({
          where: { id: submissionId },
          data: { 
            bcrId: bcrId,
            updatedAt: new Date()
          }
        });
        console.log(`Updated submission ${submissionId} with BCR ID ${bcrId}`);
      }
      
      // Directly update the counters cache for immediate feedback
      // This will be overwritten by the full refresh, but provides immediate UI feedback
      if (countersCache.submissions.pending > 0) {
        countersCache.submissions.pending--;
      }
      countersCache.submissions.approved++;
      
      // Update phase and status counters
      if (bcr.currentPhase) {
        countersCache.bcrs.byPhase[bcr.currentPhase] = (countersCache.bcrs.byPhase[bcr.currentPhase] || 0) + 1;
      }
      
      if (bcr.status) {
        countersCache.bcrs.byStatus[bcr.status] = (countersCache.bcrs.byStatus[bcr.status] || 0) + 1;
      }
      
      // Update urgency level counters
      if (bcr.urgencyLevel) {
        countersCache.bcrs.byUrgency[bcr.urgencyLevel] = (countersCache.bcrs.byUrgency[bcr.urgencyLevel] || 0) + 1;
      }
      
      // Update impact area counters
      if (bcr.impactedAreas && Array.isArray(bcr.impactedAreas)) {
        for (const areaId of bcr.impactedAreas) {
          countersCache.bcrs.byImpactArea[areaId] = (countersCache.bcrs.byImpactArea[areaId] || 0) + 1;
        }
      }
    }
    
    // Force a complete refresh of counters from the database
    // This ensures we have the most accurate counts
    await refreshAllCounters();
    
    return countersCache;
  } catch (error) {
    console.error('Error updating counters on approval:', error);
    // Still try to refresh counters even if there was an error
    try {
      await refreshAllCounters();
    } catch (refreshError) {
      console.error('Error refreshing counters after approval error:', refreshError);
    }
    throw error;
  }
};

/**
 * Update counters when a submission is rejected
 * @param {string} submissionId - ID of the rejected submission
 * @returns {Promise<Object>} - Updated counter values
 */
const updateCountersOnRejection = async (submissionId) => {
  try {
    console.log(`Updating counters for rejection of submission ${submissionId}`);
    
    // Get the submission details
    const submission = await prisma.Submission.findUnique({
      where: { id: submissionId }
    });
    
    if (submission) {
      // Update submission in database to mark it as rejected if not already rejected
      if (!submission.rejectedAt) {
        await prisma.Submission.update({
          where: { id: submissionId },
          data: { 
            rejectedAt: new Date(),
            updatedAt: new Date()
          }
        });
        console.log(`Marked submission ${submissionId} as rejected`);
      }
      
      // Directly update the counters cache for immediate feedback
      if (countersCache.submissions.pending > 0) {
        countersCache.submissions.pending--;
      }
      countersCache.submissions.rejected++;
    }
    
    // Force a complete refresh of counters from the database
    // This ensures we have the most accurate counts
    await refreshAllCounters();
    
    return countersCache;
  } catch (error) {
    console.error('Error updating counters on rejection:', error);
    // Still try to refresh counters even if there was an error
    try {
      await refreshAllCounters();
    } catch (refreshError) {
      console.error('Error refreshing counters after rejection error:', refreshError);
    }
    throw error;
  }
};

module.exports = {
  getCounters,
  initializeCounters,
  refreshCounters,
  refreshAllCounters,
  updateCountersOnApproval,
  updateCountersOnRejection
};
