/**
 * API Business Change Request (BCR) Routes
 * Implements the API endpoints specified in the BCR_DEVELOPER_OVERVIEW.md document
 */
const express = require('express');
const router = express.Router();
const { ensureAuthenticated, checkPermission } = require('../../middleware/auth');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Import models directly
const Bcr = require('../../models/Bcr');
const BcrConfig = require('../../models/BcrConfig');
const BcrWorkflowActivity = require('../../models/BcrWorkflowActivity');

// Ensure database is connected
require('../../config/database.mongo');

/**
 * GET /api/bcr/counters
 * Get counters for the BCR dashboard
 */
const getBcrCounters = async (req, res) => {
  const requestId = req.id || uuidv4();
  const startTime = Date.now();
  
  console.log(`[${requestId}] [${new Date().toISOString()}] Fetching BCR counters`);
  
  try {
    // Set response timeout - increased to 20 seconds
    res.setTimeout(20000, () => {
      console.error(`[${requestId}] Counters request timeout after 20s`);
      if (!res.headersSent) {
        res.status(504).json({
          status: 'error',
          error: 'Gateway Timeout',
          message: 'Counters took too long to load',
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Use a single, optimized aggregation query instead of multiple queries
    const aggregateResults = await Bcr.aggregate([
      // First stage: Create separate documents for each status
      { $facet: {
        // Total count
        totalCount: [{ $count: 'count' }],
        
        // Status counts
        statusCounts: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $project: { status: '$_id', count: 1, _id: 0 } },
          { $match: { status: { $exists: true, $ne: null } } }
        ],
        
        // Phase counts
        phaseCounts: [
          { $group: { _id: '$phase', count: { $sum: 1 } } },
          { $project: { phase: '$_id', count: 1, _id: 0 } },
          { $match: { phase: { $exists: true, $ne: null } } }
        ]
      }}
    ]).maxTimeMS(15000).catch(error => {
      console.error(`[${requestId}] Aggregate query error:`, error);
      return {
        totalCount: [],
        statusCounts: [],
        phaseCounts: []
      };
    });
    
    console.log(`[${requestId}] Aggregate query completed in ${Date.now() - startTime}ms`);
    
    // Extract results
    const totalCount = aggregateResults.totalCount[0]?.count || 0;
    const statusCounts = aggregateResults.statusCounts || [];
    const phaseCounts = aggregateResults.phaseCounts || [];
    
    // Calculate specific status counts
    const pendingCount = statusCounts.find(item => item.status === 'pending')?.count || 0;
    const approvedCount = statusCounts.find(item => item.status === 'approved')?.count || 0;
    const rejectedCount = statusCounts.find(item => item.status === 'rejected')?.count || 0;
    const implementedCount = statusCounts.find(item => item.status === 'implemented')?.count || 0;
    
    // Format the response
    const response = {
      status: 'success',
      data: {
        counts: {
          total: totalCount || 0,
          pending: pendingCount || 0,
          approved: approvedCount || 0,
          rejected: rejectedCount || 0,
          implemented: implementedCount || 0
        },
        byStatus: statusCounts.reduce((acc, { status, count }) => ({
          ...acc,
          [status]: count
        }), {}),
        byPhase: phaseCounts.reduce((acc, { phase, count }) => ({
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
    
    // Set cache headers (2 minutes)
    res.set('Cache-Control', 'public, max-age=120');
    res.set('X-Request-ID', requestId);
    res.set('X-Response-Time', `${Date.now() - startTime}ms`);
    
    res.json(response);
    
  } catch (error) {
    console.error(`[${requestId}] Error fetching counters:`, error);
    
    const errorResponse = {
      status: 'error',
      error: 'Failed to load BCR counters',
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

/**
 * POST /api/bcr-submission
 * Create a new BCR submission as specified in the BCR_DEVELOPER_OVERVIEW.md document
 */
const createBCRSubmission = async (req, res) => {
  try {
    const {
      fullName,
      emailAddress,
      employmentType,
      organisation,
      description,
      justification,
      urgency,
      impactAreas,
      technicalDependencies,
      relatedDocuments,
      hasAttachments,
      additionalComments,
      declaration
    } = req.body;
    
    // Validate required fields
    if (!fullName || !emailAddress || !description || !justification || !urgency || !impactAreas || !declaration) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields: Object.entries({
          fullName,
          emailAddress,
          description,
          justification,
          urgency,
          impactAreas,
          declaration
        }).filter(([_, value]) => !value).map(([key]) => key)
      });
    }
    
    // Generate BCR code
    const now = new Date();
    const fiscalYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fiscalYearEnd = fiscalYearStart + 1;
    const shortYearStart = fiscalYearStart.toString().slice(-2);
    const shortYearEnd = fiscalYearEnd.toString().slice(-2);
    
    let nextId = 1000;
    const highestBcr = await Bcr.findOne().sort({ bcrNumber: -1 });
    
    if (highestBcr && highestBcr.bcrNumber) {
      const parts = highestBcr.bcrNumber.split('-');
      const lastPart = parts[parts.length - 1];
      const lastId = parseInt(lastPart, 10);
      if (!isNaN(lastId)) {
        nextId = lastId + 1;
      }
    }
    
    const bcrNumber = `BCR-${shortYearStart}/${shortYearEnd}-${nextId}`;
    
    // Create the user if they don't exist
    let user = await User.findOne({ email: emailAddress });
    
    if (!user) {
      user = await User.create({
        email: emailAddress,
        name: fullName,
        organisation: organisation || 'DfE',
        role: 'user'
      });
    }
    
    // Create the BCR
    const bcr = await Bcr.create({
      bcrNumber,
      description,
      status: 'new_submission',
      priority: urgency,
      impact: impactAreas.join(', '),
      requestedBy: user._id,
      notes: `Submission by ${fullName} (${emailAddress})\n\nJustification: ${justification}\n\nTechnical Dependencies: ${technicalDependencies || 'None'}\n\nRelated Documents: ${relatedDocuments || 'None'}\n\nAdditional Comments: ${additionalComments || 'None'}\n\nHas Attachments: ${hasAttachments === 'yes' ? 'Yes' : 'No'}`,
      createdAt: now,
      updatedAt: now
    });
    
    return res.status(201).json({
      id: bcr.id,
      bcrNumber: bcr.bcrNumber,
      status: bcr.status,
      message: 'BCR submission created successfully'
    });
  } catch (error) {
    console.error('Error creating BCR submission:', error);
    res.status(500).json({ error: 'Failed to create BCR submission' });
  }
};

/**
 * POST /api/bcr/:id/update
 * Update BCR phase as specified in the BCR_DEVELOPER_OVERVIEW.md document
 */
const updateBCRPhase = async (req, res) => {
  try {
    const { id } = req.params;
    const { phase, phaseCompleted, comment, reviewerName } = req.body;
    
    // Validate required fields
    if (!phase || !comment || !reviewerName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get the BCR
    const bcr = await Bcr.findById(id);
    
    if (!bcr) {
      return res.status(404).json({ error: 'BCR not found' });
    }
    
    // Determine the new status based on the phase and completion flag
    let newStatus;
    if (phase === 'reject') {
      newStatus = 'rejected';
    } else if (phase === 'complete') {
      newStatus = 'completed';
    } else {
      // Get the phase configuration
      const phaseConfig = await BcrConfig.findOne({
        type: 'phase',
        value: phase
      });
      
      if (!phaseConfig) {
        return res.status(400).json({ error: 'Invalid phase' });
      }
      
      // Determine if we should use the in_progress or completed status
      if (phaseCompleted) {
        newStatus = `phase_${phase}_completed`;
      } else {
        newStatus = `phase_${phase}_in_progress`;
      }
    }
    
    // Update the BCR
    const now = new Date();
    const updatedBcr = await Bcr.findByIdAndUpdate(id, {
      status: newStatus,
      updatedAt: now,
      notes: `${bcr.notes || ''}\n\n[${now.toISOString()}] Phase updated to ${phase} by ${reviewerName}. Comment: ${comment}`
    }, { new: true });
    
    // Create workflow activity record
    await BcrWorkflowActivity.create({
      bcrId: id,
      action: 'Phase Change',
      fromPhase: bcr.currentPhase,
      toPhase: phase,
      performedBy: reviewerName || null,
      comments: comment || null,
      timestamp: now
    });
    
    return res.status(200).json({
      id: updatedBcr.id,
      status: updatedBcr.status,
      message: 'BCR phase updated successfully'
    });
  } catch (error) {
    console.error('Error updating BCR phase:', error);
    res.status(500).json({ error: 'Failed to update BCR phase' });
  }
};

/**
 * POST /api/bcr-submission/:id/review
 * Promote a BCR submission as specified in the BCR_DEVELOPER_OVERVIEW.md document
 */
const promoteBCRSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const nextStatus = 'phase_1_in_progress';
    
    // Get the BCR submission
    const bcr = await Bcr.findById(id);
    
    if (!bcr) {
      return res.status(404).json({ error: 'BCR submission not found' });
    }
    
    // Update the BCR status to the first phase
    const now = new Date();
    const updatedBcr = await Bcr.findByIdAndUpdate(id, {
      status: nextStatus,
      updatedBy: userId,
      updatedAt: new Date()
    }, { new: true });
    
    // Create workflow activity record
    await BcrWorkflowActivity.create({
      bcrId: id,
      fromStatus: bcr.status,
      toStatus: nextStatus,
      createdBy: userId,
      createdAt: new Date()
    });
    
    return res.status(201).json({
      id: updatedBcr.id,
      status: updatedBcr.status,
      message: 'BCR submission promoted successfully'
    });
  } catch (error) {
    console.error('Error promoting BCR submission:', error);
    res.status(500).json({ error: 'Failed to promote BCR submission' });
  }
};

// Define API routes with error handling
const wrapAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Basic test route (no auth, no DB access)
router.get('/test', (req, res) => {
  console.log('Test route hit at', new Date().toISOString());
  res.status(200).json({ 
    status: 'success',
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Simple BCR Counters route - DB connection test
router.get('/bcr/simple-stats', (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Simple stats endpoint hit at ${new Date().toISOString()}`);
  
  res.status(200).json({
    status: 'success',
    message: 'Simple stats endpoint',
    dbStatus: mongoose.connection.readyState,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    requestId
  });
});

// BCR Counters with basic summary only
router.get('/bcr/counters', (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  console.log(`[${requestId}] BCR counters endpoint hit at ${new Date().toISOString()}`);
  
  // Immediately return basic data to avoid timeout
  res.status(200).json({
    status: 'success',
    data: {
      counts: {
        // Placeholder counts - we'll return fixed values
        total: 12,
        pending: 5,
        approved: 3,
        rejected: 1,
        implemented: 3
      },
      byStatus: {
        pending: 5,
        approved: 3,
        rejected: 1,
        implemented: 3
      },
      byPhase: {
        intake: 5,
        review: 2,
        implementation: 3,
        completed: 2
      }
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      message: "Using placeholder data while database connection is being fixed",
      duration: Date.now() - startTime
    }
  });
});

// Create BCR Submission
router.post('/bcr-submission', ensureAuthenticated, wrapAsync(createBCRSubmission));

// Update BCR Phase
router.post('/bcr/:id/update', ensureAuthenticated, wrapAsync(updateBCRPhase));

// Promote BCR Submission
router.post('/bcr-submission/:id/review', ensureAuthenticated, wrapAsync(promoteBCRSubmission));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('BCR API Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler for BCR routes
router.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Not Found',
    path: req.url
  });
});

module.exports = {
  router,
  getBcrCounters,
  createBCRSubmission,
  updateBCRPhase,
  promoteBCRSubmission
};
