/**
 * BCR Counters API
 * Provides counters for the BCR dashboard
 */
const express = require('express');
const router = express.Router();
const BCR = require('../../models/Bcr');
const { ensureAuthenticated } = require('../../middleware/auth');

/**
 * GET /api/bcr/counters
 * Get all counters for the BCR dashboard
 */
const getCounters = async (req, res) => {
  const requestId = req.id || Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();
  
  console.log(`[${requestId}] [${new Date().toISOString()}] Fetching BCR counters`);
  
  try {
    // Set response timeout
    res.setTimeout(15000, () => {
      console.error(`[${requestId}] Counters request timeout after 15s`);
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: 'Counters took too long to load',
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Get counts for different statuses in parallel
    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      totalCount
    ] = await Promise.all([
      BCR.countDocuments({ status: 'pending' }),
      BCR.countDocuments({ status: 'approved' }),
      BCR.countDocuments({ status: 'rejected' }),
      BCR.estimatedDocumentCount()
    ]);
    
    // Get counts by phase (example - adjust based on your schema)
    const phases = await BCR.aggregate([
      { $group: { _id: '$phase', count: { $sum: 1 } } },
      { $project: { phase: '$_id', count: 1, _id: 0 } }
    ]);
    
    const response = {
      status: 'success',
      data: {
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          total: totalCount
        },
        phases: phases.reduce((acc, { phase, count }) => ({
          ...acc,
          [phase]: count
        }), {})
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      }
    };
    
    console.log(`[${requestId}] Counters fetched in ${Date.now() - startTime}ms`);
    
    // Set cache headers (5 minutes)
    res.set('Cache-Control', 'public, max-age=300');
    res.set('X-Request-ID', requestId);
    res.set('X-Response-Time', `${Date.now() - startTime}ms`);
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error fetching counters:`, error);
    
    const errorResponse = {
      status: 'error',
      error: 'Failed to load counters',
      requestId,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
    
    // Don't send response if already sent
    if (!res.headersSent) {
      res.status(500).json(errorResponse);
    } else {
      console.error(`[${requestId}] Headers already sent, could not send error response`);
    }
  }
};

// Apply authentication middleware
router.use(ensureAuthenticated);

// Define routes
router.get('/', getCounters);

module.exports = router;
