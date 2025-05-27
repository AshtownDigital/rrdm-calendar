/**
 * Counter Service
 * Handles global counters for BCR submissions and statuses
 * Updated to exclusively use the new Bcr model and provide more accurate counts
 */
const mongoose = require('mongoose');
const { Submission, Bcr, BcrConfig, ImpactedArea } = require('../models');
require('../config/database.mongo');
const workflowPhaseService = require('./workflowPhaseService');

// Default TTL for cache (5 minutes)
const DEFAULT_CACHE_TTL = 300000;

// Standalone function to check if cache is valid
const isCacheValid = (cache) => {
  return cache.lastUpdated && 
         (Date.now() - cache.lastUpdated.getTime() < (cache.ttl || DEFAULT_CACHE_TTL));
};

// In-memory cache for counters to avoid excessive database queries
let countersCache = {
  submissions: {
    total: null,
    pending: null,
    approved: null,
    rejected: null,
    moreInfo: null,
    paused: null,
    rejectedEdit: null
  },
  bcrs: {
    byPhase: {},
    byStatus: {},
    byUrgency: {},
    byImpactArea: {}
  },
  lastUpdated: null,
  refreshInProgress: false,
  ttl: DEFAULT_CACHE_TTL
};

/**
 * Initialize counters by loading current values from database using optimized queries
 * @returns {Promise<Object>} - Current counter values
 */
const initializeCounters = async () => {
  // Prevent multiple concurrent refreshes
  if (countersCache.refreshInProgress) {
    console.log('Counter refresh already in progress, waiting...');
    // Wait for the current refresh to complete with timeout
    const waitStart = Date.now();
    while (countersCache.refreshInProgress) {
      if (Date.now() - waitStart > 5000) { // 5 second timeout
        console.log('Timed out waiting for counter refresh, using existing cache');
        return countersCache;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return countersCache;
  }
  
  // If we have valid cache and not forcing refresh, return cached data
  if (isCacheValid(countersCache)) {
    console.log('Using cached counter data from', countersCache.lastUpdated);
    return countersCache;
  }
  
  const startTime = Date.now();
  countersCache.refreshInProgress = true;
  
  try {
    console.log('Initializing counters from database using optimized queries...');
    
    // Set a timeout to prevent long-running queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Counter initialization timed out')), 10000);
    });
    
    // Get submission counts with optimized aggregation pipeline
    let submissionCounts = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      moreInfo: 0,
      paused: 0,
      rejectedEdit: 0
    };
    
    try {
      // Use a single aggregation pipeline to get all submission counts
      const submissionAggResult = await Promise.race([
        Submission.aggregate([
          // Only include non-deleted submissions
          { $match: { deletedAt: null } },
          // Group by status and count
          { $group: {
            _id: '$status',
            count: { $sum: 1 },
            // Track BCR IDs separately
            withBcr: { 
              $sum: { 
                $cond: [{ $ne: ['$bcrId', null] }, 1, 0] 
              }
            },
            withoutBcr: { 
              $sum: { 
                $cond: [{ $eq: ['$bcrId', null] }, 1, 0] 
              }
            }
          }},
          // Add a total count across all statuses
          { $group: {
            _id: null,
            statuses: { $push: { status: '$_id', count: '$count', withBcr: '$withBcr', withoutBcr: '$withoutBcr' } },
            total: { $sum: '$count' }
          }}
        ]),
        timeoutPromise
      ]);
      
      if (submissionAggResult && submissionAggResult.length > 0) {
        // Set the total count
        submissionCounts.total = submissionAggResult[0].total || 0;
        
        // Process individual status counts
        const statusMap = submissionAggResult[0].statuses || [];
        for (const statusData of statusMap) {
          if (!statusData.status) continue;
          
          // Map statuses to our counter object
          switch(statusData.status) {
            case 'Rejected':
              submissionCounts.rejected = statusData.count || 0;
              break;
            case 'More Info Required':
              submissionCounts.moreInfo = statusData.count || 0;
              break;
            case 'Paused':
              submissionCounts.paused = statusData.count || 0;
              break;
            case 'Rejected & Edit':
              submissionCounts.rejectedEdit = statusData.count || 0;
              break;
          }
        }
        
        // Calculate approved submissions first - those with BCR IDs
        submissionCounts.approved = submissionAggResult[0].statuses.reduce((sum, s) => sum + (s.withBcr || 0), 0);
        
        // Count pending directly from statuses - matching the BCR submission page definition
        // Pending = submissions without BCR IDs and not in Rejected status
        submissionCounts.pending = submissionAggResult[0].statuses.reduce((sum, s) => {
          // Only count those without BCR IDs and not in 'Rejected' status
          if (s.status !== 'Rejected' && s.withoutBcr > 0) {
            return sum + s.withoutBcr;
          }
          return sum;
        }, 0);
      }
      
      console.log(`Submission counts - Total: ${submissionCounts.total}, Pending: ${submissionCounts.pending}, Approved: ${submissionCounts.approved}, Rejected: ${submissionCounts.rejected}`);
    } catch (error) {
      console.error('Error getting submission counts:', error);
      // Continue with default values
    }
    
    // Get BCR counts by phase, status, urgency, and impact area using aggregation pipelines
    const bcrsByPhase = {};
    const bcrsByStatus = {};
    const bcrsByUrgency = {};
    const bcrsByImpactArea = {};
    
    try {
      // Load all required configuration data in parallel
      const [phases, statuses, urgencyLevels, impactAreas] = await Promise.all([
        workflowPhaseService.getAllPhases(),
        workflowPhaseService.getAllStatuses(),
        BcrConfig.find({ type: 'urgencyLevel' }).sort({ displayOrder: 1 }), // Sort by display order
        Promise.race([
          ImpactedArea.find({ active: true }),
          // Fallback to BcrConfigs if ImpactedArea is empty or has an error
          new Promise(async resolve => {
            try {
              const areas = await ImpactedArea.find({ active: true });
              if (areas && areas.length > 0) {
                resolve(areas);
              } else {
                const configs = await BcrConfig.find({ type: 'impactArea' });
                resolve(configs);
              }
            } catch (error) {
              console.error('Error fetching impact areas, falling back:', error);
              const configs = await BcrConfig.find({ type: 'impactArea' });
              resolve(configs);
            }
          })
        ])
      ]);
      
      console.log(`Loaded ${phases.length} phases, ${statuses.length} statuses, ${urgencyLevels.length} urgency levels, ${impactAreas.length} impact areas`);
      
      // Use aggregation pipelines to get counts more efficiently
      // Run both pipelines in parallel with timeout protection
      const [bcrPhaseStatusResults, bcrUrgencyImpactResults] = await Promise.all([
        // Pipeline 1: Group by phase and status
        Promise.race([
          Bcr.aggregate([
            // Group by phase
            { $group: { 
              _id: '$currentPhase', 
              count: { $sum: 1 },
              // Track statuses within each phase
              statuses: { $push: '$status' }
            }}
          ]),
          timeoutPromise
        ]),
        
        // Pipeline 2: Group by urgency level and track impact areas
        Promise.race([
          Bcr.aggregate([
            // Unwind impact areas so we can count them
            { $unwind: { path: '$impactedAreas', preserveNullAndEmptyArrays: true } },
            // Group by both urgency and impact area
            { $group: { 
              _id: { 
                urgency: '$urgencyLevel', 
                impact: '$impactedAreas' 
              },
              count: { $sum: 1 }
            }}
          ]),
          timeoutPromise
        ])
      ]);
      
      // Process phase and status results
      if (bcrPhaseStatusResults && bcrPhaseStatusResults.length > 0) {
        // Initialize phase counts
        for (const phase of phases) {
          bcrsByPhase[phase.name] = 0; // Default to 0
        }
        
        // Fill in actual phase counts
        for (const result of bcrPhaseStatusResults) {
          if (result._id) {
            bcrsByPhase[result._id] = result.count || 0;
            console.log(`Phase ${result._id}: ${result.count || 0} BCRs`);
          }
        }
        
        // Initialize and populate status counts
        for (const status of statuses) {
          bcrsByStatus[status.status] = 0; // Default to 0
        }
        
        // Create status counts from aggregated data
        // For each phase result, process its status array
        for (const result of bcrPhaseStatusResults) {
          if (result.statuses && Array.isArray(result.statuses)) {
            // Count occurrences of each status
            for (const status of result.statuses) {
              if (!status) continue;
              bcrsByStatus[status] = (bcrsByStatus[status] || 0) + 1;
            }
          }
        }
        
        // Log status counts
        for (const status in bcrsByStatus) {
          console.log(`Status ${status}: ${bcrsByStatus[status]} BCRs`);
        }
      }
      
      // Process urgency and impact area results
      if (bcrUrgencyImpactResults && bcrUrgencyImpactResults.length > 0) {
        // Initialize urgency level counts
        for (const level of urgencyLevels) {
          bcrsByUrgency[level.value] = 0; // Default to 0
        }
        
        // Initialize impact area counts
        for (const area of impactAreas) {
          const areaId = area.id || area.value;
          if (areaId) {
            bcrsByImpactArea[areaId] = 0; // Default to 0
          }
        }
        
        // Fill in the actual counts from aggregation results
        for (const result of bcrUrgencyImpactResults) {
          if (!result._id) continue;
          
          // Process urgency counts
          if (result._id.urgency) {
            bcrsByUrgency[result._id.urgency] = (bcrsByUrgency[result._id.urgency] || 0) + result.count;
          }
          
          // Process impact area counts
          if (result._id.impact) {
            bcrsByImpactArea[result._id.impact] = (bcrsByImpactArea[result._id.impact] || 0) + result.count;
          }
        }
        
        // Log urgency counts
        for (const level of urgencyLevels) {
          console.log(`Urgency ${level.value}: ${bcrsByUrgency[level.value] || 0} BCRs`);
        }
        
        // Log impact area counts
        for (const area of impactAreas) {
          const areaId = area.id || area.value;
          const areaName = area.name || area.value;
          if (areaId) {
            console.log(`Impact area ${areaName}: ${bcrsByImpactArea[areaId] || 0} BCRs`);
          }
        }
      }
    } catch (error) {
      console.error('Error getting BCR counts:', error);
    }
    
    // Update cache with all the new values
    countersCache = {
      submissions: submissionCounts,
      bcrs: {
        byPhase: bcrsByPhase,
        byStatus: bcrsByStatus,
        byUrgency: bcrsByUrgency,
        byImpactArea: bcrsByImpactArea
      },
      lastUpdated: new Date(),
      refreshInProgress: false,
      ttl: countersCache.ttl // Preserve the TTL setting
    };
    
    const elapsedTime = Date.now() - startTime;
    console.log(`Counters initialized successfully in ${elapsedTime}ms`);
    return countersCache;
  } catch (error) {
    console.error('Error initializing counters:', error);
    countersCache.refreshInProgress = false;
    // Return a partially initialized cache with error flag
    countersCache.lastUpdated = new Date();
    countersCache.error = true;
    countersCache.errorMessage = error.message;
    return countersCache;
  }
};

/**
 * Force refresh of all counters from the database with error handling
 * @returns {Promise<Object>} - Updated counter values
 */
const refreshCounters = async () => {
  console.log('Forcing refresh of all counters...');
  try {
    // Clear any existing refresh flag to ensure we can start a new refresh
    countersCache.refreshInProgress = false;
    // Force a complete refresh of all counters with timeout protection
    const refreshPromise = initializeCounters();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Counter refresh timed out after 15 seconds')), 15000);
    });
    
    return await Promise.race([refreshPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error during counter refresh:', error);
    // Update the cache to indicate an error, but keep the previous data
    countersCache.error = true;
    countersCache.errorMessage = error.message;
    countersCache.refreshInProgress = false;
    return countersCache;
  }
};

/**
 * Get current counter values with intelligent caching
 * @param {boolean} refresh - Whether to force refresh counters from database
 * @param {number} maxAge - Maximum age of cache in milliseconds before refresh (default: use cache TTL)
 * @returns {Promise<Object>} - Current counter values
 */
const getCounters = async (refresh = false, maxAge = null) => {
  // Force refresh if requested or if cache is empty
  if (refresh || !countersCache.lastUpdated) {
    return await refreshCounters();
  }
  
  // Check if cache is still valid based on TTL or provided maxAge
  const effectiveMaxAge = maxAge || countersCache.ttl;
  const cacheAge = Date.now() - (countersCache.lastUpdated?.getTime() || 0);
  
  if (cacheAge > effectiveMaxAge) {
    console.log(`Cache expired (${cacheAge}ms old, max age: ${effectiveMaxAge}ms), refreshing...`);
    // Refresh in background but return current cache immediately for responsiveness
    setTimeout(() => refreshCounters(), 0);
  }
  
  return countersCache;
};

/**
 * Force refresh all counters from the database with timeout protection
 * @param {number} timeout - Timeout in milliseconds (default: 20000)
 * @returns {Promise<Object>} - Updated counter values
 */
const refreshAllCounters = async (timeout = 20000) => {
  console.log(`Forcing refresh of all counters from database (timeout: ${timeout}ms)`);
  try {
    const refreshPromise = initializeCounters();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Counter refresh timed out after ${timeout}ms`)), timeout);
    });
    
    return await Promise.race([refreshPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error during counter refresh:', error);
    countersCache.error = true;
    countersCache.errorMessage = error.message;
    return countersCache;
  }
};

/**
 * Update counters when a submission is approved
 * @param {string} submissionId - ID of the approved submission
 * @param {string} bcrId - ID of the created BCR
 * @returns {Promise<Object>} - Updated counter values
 */
const updateCountersOnApproval = async (submissionId, bcrId) => {
  try {
    const startTime = Date.now();
    console.log(`Updating counters for approval of submission ${submissionId} with BCR ${bcrId}`);
    
    // Fetch both submission and BCR details in parallel with timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Counter update timed out after 5 seconds')), 5000);
    });
    
    const [submission, bcr] = await Promise.all([
      Promise.race([Submission.findById(submissionId).lean(), timeoutPromise]),
      Promise.race([Bcr.findById(bcrId).lean(), timeoutPromise])
    ]);
    
    if (!bcr) {
      console.error(`BCR ${bcrId} not found when updating counters for approval`);
      return countersCache;
    }
    
    if (!submission) {
      console.error(`Submission ${submissionId} not found when updating counters for approval`);
      return countersCache;
    }
    
    // Make a defensive copy of the cache
    const updatedCache = JSON.parse(JSON.stringify(countersCache));
    
    // Increment approved submissions
    if (updatedCache.submissions) {
      // Increment approved count
      updatedCache.submissions.approved = (updatedCache.submissions.approved || 0) + 1;
      
      // Only decrement pending count if the submission wasn't already rejected
      if (submission.status !== 'Rejected') {
        updatedCache.submissions.pending = Math.max(0, (updatedCache.submissions.pending || 0) - 1);
      }
    }
    
    // Update BCR counters
    if (bcr.currentPhase && updatedCache.bcrs?.byPhase) {
      updatedCache.bcrs.byPhase[bcr.currentPhase] = (updatedCache.bcrs.byPhase[bcr.currentPhase] || 0) + 1;
    }
    
    if (bcr.status && updatedCache.bcrs?.byStatus) {
      updatedCache.bcrs.byStatus[bcr.status] = (updatedCache.bcrs.byStatus[bcr.status] || 0) + 1;
    }
    
    // Update urgency counters
    if (bcr.urgencyLevel && updatedCache.bcrs?.byUrgency) {
      updatedCache.bcrs.byUrgency[bcr.urgencyLevel] = (updatedCache.bcrs.byUrgency[bcr.urgencyLevel] || 0) + 1;
    }
    
    // Update impact area counters
    if (bcr.impactAreas && Array.isArray(bcr.impactAreas) && updatedCache.bcrs?.byImpactArea) {
      for (const areaId of bcr.impactAreas) {
        if (!areaId) continue;
        updatedCache.bcrs.byImpactArea[areaId] = (updatedCache.bcrs.byImpactArea[areaId] || 0) + 1;
      }
    }
    
    // Update last updated timestamp
    updatedCache.lastUpdated = new Date();
    
    // Preserve TTL setting
    updatedCache.ttl = countersCache.ttl;
    
    // Update the global cache
    countersCache = updatedCache;
    
    const elapsed = Date.now() - startTime;
    console.log(`Counters updated successfully for approval in ${elapsed}ms`);
    return countersCache;
  } catch (error) {
    console.error('Error updating counters for approval:', error);
    // Mark cache for refresh but don't lose current data
    countersCache.lastUpdated = new Date();
    countersCache.needsRefresh = true;
    return countersCache;
  }
};

/**
 * Update counters when a submission is rejected
 * @param {string} submissionId - ID of the rejected submission
 * @returns {Promise<Object>} - Updated counter values
 */
const updateCountersOnRejection = async (submissionId) => {
  try {
    const startTime = Date.now();
    console.log(`Updating counters for rejection of submission ${submissionId}`);
    
    // Fetch submission with timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Counter update timed out after 3 seconds')), 3000);
    });
    
    const submission = await Promise.race([
      Submission.findById(submissionId).lean(),
      timeoutPromise
    ]);
    
    if (!submission) {
      console.error(`Submission ${submissionId} not found when updating counters for rejection`);
      return countersCache;
    }
    // Make a defensive copy of the cache
    const updatedCache = JSON.parse(JSON.stringify(countersCache));
    
    // Update submission counters
    if (updatedCache.submissions) {
      // Increment rejected count
      updatedCache.submissions.rejected = (updatedCache.submissions.rejected || 0) + 1;
      
      // Decrement pending count
      if (submission.status !== 'Rejected') { // Only if not already rejected
        updatedCache.submissions.pending = Math.max(0, (updatedCache.submissions.pending || 0) - 1);
      }
    }
    
    // Update last updated timestamp
    updatedCache.lastUpdated = new Date();
    
    // Preserve TTL setting
    updatedCache.ttl = countersCache.ttl;
    
    // Update the global cache
    countersCache = updatedCache;
    
    const elapsed = Date.now() - startTime;
    console.log(`Counters updated successfully for rejection in ${elapsed}ms`);
    return countersCache;
  } catch (error) {
    console.error('Error updating counters for rejection:', error);
    // Mark cache for refresh but don't lose current data
    countersCache.lastUpdated = new Date();
    countersCache.needsRefresh = true;
    return countersCache;
  }
};

// This was added automatically, but we already have this function defined above

module.exports = {
  getCounters,
  refreshCounters,
  refreshAllCounters,
  updateCountersOnApproval,
  updateCountersOnRejection,
  isCacheValid
};
