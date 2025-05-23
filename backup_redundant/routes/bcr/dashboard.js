/**
 * BCR Dashboard Route
 */
const express = require('express');
const router = express.Router();
const BCR = require('../../models/Bcr');
const { ensureAuthenticated } = require('../../middleware/auth');

/**
 * GET /bcr
 * Render the BCR dashboard page
 */
const renderDashboard = async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();
  
  console.log(`[${requestId}] [${new Date().toISOString()}] Starting BCR dashboard render`);
  
  // Set response timeout
  res.setTimeout(15000, () => {
    console.error(`[${requestId}] Request timeout after 15s`);
    if (!res.headersSent) {
      res.status(504).render('error', {
        title: 'Gateway Timeout',
        message: 'The server took too long to respond. Please try again later.'
      });
    }
  });

  try {
    // Log request details
    console.log(`[${requestId}] Request from ${req.ip} for ${req.originalUrl}`);
    console.log(`[${requestId}] User: ${req.user ? req.user.id : 'unauthenticated'}`);
    
    // Define tag colors based on GOV.UK Design System
    const statusColors = {
      'draft': 'govuk-tag govuk-tag--grey',
      'submitted': 'govuk-tag govuk-tag--blue',
      'in-progress': 'govuk-tag govuk-tag--light-blue',
      'approved': 'govuk-tag govuk-tag--green',
      'rejected': 'govuk-tag govuk-tag--red',
      'completed': 'govuk-tag govuk-tag--purple'
    };
    
    const priorityColors = {
      'low': 'govuk-tag govuk-tag--grey',
      'medium': 'govuk-tag govuk-tag--blue',
      'high': 'govuk-tag govuk-tag--red',
      'critical': 'govuk-tag govuk-tag--red govuk-!-font-weight-bold'
    };
    
    // Get minimal BCR data for initial render
    console.log(`[${requestId}] Fetching recent BCRs...`);
    const dbStart = Date.now();
    
    const recentBcrs = await BCR.find({}, {
      bcrCode: 1,
      title: 1,
      status: 1,
      priority: 1,
      createdAt: 1,
      updatedAt: 1,
      _id: 0
    })
    .sort({ createdAt: -1 })
    .limit(10) // Only get 10 most recent for initial load
    .lean()
    .maxTimeMS(5000) // 5 second timeout
    .read('secondaryPreferred');
    
    const dbTime = Date.now() - dbStart;
    console.log(`[${requestId}] Fetched ${recentBcrs.length} recent BCRs in ${dbTime}ms`);
    
    // Render template with minimal data
    console.log(`[${requestId}] Rendering template...`);
    const renderStart = Date.now();
    
    const html = await new Promise((resolve, reject) => {
      res.render('modules/bcr/dashboard', {
        title: 'Business Change Requests',
        bcrs: recentBcrs,
        statusColors,
        priorityColors,
        user: req.user || {},
        requestId,
        timings: {
          db: dbTime,
          total: Date.now() - startTime
        },
        // Flags for client-side
        features: {
          asyncCounters: true,
          asyncBcrs: true
        }
      }, (err, html) => {
        if (err) {
          console.error(`[${requestId}] Template rendering error:`, err);
          return reject(err);
        }
        resolve(html);
      });
    });
    
    const renderTime = Date.now() - renderStart;
    const totalTime = Date.now() - startTime;
    
    console.log(`[${requestId}] Template rendered in ${renderTime}ms`);
    console.log(`[${requestId}] Total request time: ${totalTime}ms`);
    
    // Set cache headers
    res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('X-Request-ID', requestId);
    res.set('X-Response-Time', `${totalTime}ms`);
    
    res.send(html);
    
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`[${requestId}] Error after ${errorTime}ms:`, error);
    
    // Log specific MongoDB errors
    if (error.name === 'MongoNetworkError') {
      console.error(`[${requestId}] MongoDB Network Error:`, error.message);
    } else if (error.name === 'MongoServerSelectionError') {
      console.error(`[${requestId}] MongoDB Server Selection Error:`, error.message);
    } else if (error.name === 'MongoError') {
      console.error(`[${requestId}] MongoDB Error [${error.code}]:`, error.message);
    }
    
    // Don't send response if already sent
    if (res.headersSent) {
      console.error(`[${requestId}] Headers already sent, cannot send error response`);
      return;
    }
    
    // Handle different error types
    if (req.xhr || req.accepts('json')) {
      res.status(500).json({
        error: 'Failed to load BCR dashboard',
        requestId,
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load BCR dashboard',
        error: process.env.NODE_ENV === 'development' ? error : {},
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Apply authentication middleware
router.use(ensureAuthenticated);

// Define routes
router.get('/', renderDashboard);

module.exports = {
  router,
  renderDashboard
};
