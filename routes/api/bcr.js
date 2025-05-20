/**
 * API Business Change Request (BCR) Routes
 * Implements the API endpoints specified in the BCR_DEVELOPER_OVERVIEW.md document
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ensureAuthenticated, checkPermission } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');

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
    const highestBcr = await prisma.Bcrs.findFirst({
      where: {
        bcrNumber: {
          startsWith: `BCR-${shortYearStart}/${shortYearEnd}-`
        }
      },
      orderBy: {
        bcrNumber: 'desc'
      }
    });
    
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
    let user = await prisma.Users.findFirst({
      where: {
        email: emailAddress
      }
    });
    
    if (!user) {
      user = await prisma.Users.create({
        data: {
          id: uuidv4(),
          name: fullName,
          email: emailAddress,
          organisation: organisation || 'DfE',
          role: 'user',
          createdAt: now,
          updatedAt: now
        }
      });
    }
    
    // Create the BCR
    const bcr = await prisma.Bcrs.create({
      data: {
        id: uuidv4(),
        bcrNumber,
        description,
        status: 'new_submission',
        priority: urgency,
        impact: impactAreas.join(', '),
        requestedBy: user.id,
        notes: `Submission by ${fullName} (${emailAddress})\n\nJustification: ${justification}\n\nTechnical Dependencies: ${technicalDependencies || 'None'}\n\nRelated Documents: ${relatedDocuments || 'None'}\n\nAdditional Comments: ${additionalComments || 'None'}\n\nHas Attachments: ${hasAttachments === 'yes' ? 'Yes' : 'No'}`,
        createdAt: now,
        updatedAt: now
      }
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
    const bcr = await prisma.Bcrs.findUnique({
      where: { id }
    });
    
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
      const phaseConfig = await prisma.BcrConfigs.findFirst({
        where: {
          type: 'phase',
          value: phase
        }
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
    const updatedBcr = await prisma.Bcrs.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: now,
        notes: `${bcr.notes || ''}\n\n[${now.toISOString()}] Phase updated to ${phase} by ${reviewerName}. Comment: ${comment}`
      }
    });
    
    // Create workflow activity record
    await prisma.BcrWorkflowActivity.create({
      data: {
        id: uuidv4(),
        bcrId: id,
        userId: req.user?.id || null,
        activityType: 'phase_update',
        fromStatus: bcr.status,
        toStatus: newStatus,
        comment,
        timestamp: now
      }
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
    
    // Get the BCR submission
    const bcr = await prisma.Bcrs.findUnique({
      where: { id }
    });
    
    if (!bcr) {
      return res.status(404).json({ error: 'BCR submission not found' });
    }
    
    // Update the BCR status to the first phase
    const now = new Date();
    const updatedBcr = await prisma.Bcrs.update({
      where: { id },
      data: {
        status: 'phase_1_in_progress',
        updatedAt: now,
        notes: `${bcr.notes || ''}\n\n[${now.toISOString()}] Submission promoted to Phase 1 by ${req.user?.name || 'System'}.`
      }
    });
    
    // Create workflow activity record
    await prisma.BcrWorkflowActivity.create({
      data: {
        id: uuidv4(),
        bcrId: id,
        userId: req.user?.id || null,
        activityType: 'promotion',
        fromStatus: bcr.status,
        toStatus: 'phase_1_in_progress',
        comment: 'BCR submission promoted to workflow',
        timestamp: now
      }
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

// Define API routes

// Create BCR Submission
router.post('/bcr-submission', ensureAuthenticated, createBCRSubmission);

// Update BCR Phase
router.post('/bcr/:id/update', ensureAuthenticated, updateBCRPhase);

// Promote BCR Submission
router.post('/bcr-submission/:id/review', ensureAuthenticated, promoteBCRSubmission);

module.exports = router;
