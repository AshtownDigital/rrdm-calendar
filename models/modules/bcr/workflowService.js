/**
 * BCR Workflow Service
 * Handles the workflow transitions for BCR submissions
 */
const mongoose = require('mongoose');

/**
 * Generate a unique BCR code
 */
const generateBcrCode = () => {
  const timestamp = new Date().getTime().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BCR-${timestamp}-${randomPart}`;
};

/**
 * Update a submission status
 * @param {string} submissionId - The ID of the submission to update
 * @param {string} newStatus - The new status to set
 * @param {object} reviewData - Additional review data
 * @returns {Promise<object>} The updated submission
 */
exports.updateSubmissionStatus = async (submissionId, newStatus, reviewData = {}) => {
  try {
    // Get model references safely
    const Submission = mongoose.model('Submission');
    const Bcr = mongoose.model('Bcr');
    
    // Validate the status
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Paused', 'Closed', 'More Info Required'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Find the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new Error(`Submission not found with ID: ${submissionId}`);
    }

    // Update the submission status
    submission.status = newStatus;
    
    // Add review comments if provided
    if (reviewData.comments) {
      submission.reviewComments = reviewData.comments;
    }
    
    // Set review timestamp
    submission.reviewedAt = new Date();
    
    // If approved, create a BCR record
    let bcr = null;
    if (newStatus === 'Approved') {
      // Create a new BCR record
      bcr = new Bcr({
        bcrCode: generateBcrCode(),
        submissionId: submission._id,
        currentPhase: 'Initial',
        status: 'Active',
        urgencyLevel: submission.urgencyLevel,
        impactedAreas: submission.impactAreas,
        workflowHistory: [{
          phase: 'Initial',
          status: 'Active',
          timestamp: new Date(),
          comments: 'BCR created from approved submission',
          userId: reviewData.reviewerId
        }]
      });
      
      // Save the BCR
      const savedBcr = await bcr.save();
      
      // Link the BCR to the submission
      submission.bcrId = savedBcr._id;
      
      console.log(`Created BCR #${savedBcr.recordNumber} (${savedBcr.bcrCode}) from submission ${submission.submissionCode}`);
    }
    
    // Save the updated submission
    const updatedSubmission = await submission.save();
    
    return {
      submission: updatedSubmission,
      bcr: bcr
    };
  } catch (error) {
    console.error('Error in updateSubmissionStatus:', error);
    throw error;
  }
};

/**
 * Move a BCR to a new phase or status
 * @param {string} bcrId - The ID of the BCR to update
 * @param {string} newPhase - The new phase to set
 * @param {string} newStatus - The new status to set
 * @param {object} updateData - Additional update data
 * @returns {Promise<object>} The updated BCR
 */
exports.updateBcrWorkflow = async (bcrId, newPhase, newStatus, updateData = {}) => {
  try {
    // Get model reference safely
    const Bcr = mongoose.model('Bcr');
    
    // Find the BCR
    const bcr = await Bcr.findById(bcrId);
    if (!bcr) {
      throw new Error(`BCR not found with ID: ${bcrId}`);
    }
    
    // Update the BCR phase and status
    bcr.currentPhase = newPhase;
    bcr.status = newStatus;
    
    // Add to workflow history
    bcr.workflowHistory.push({
      phase: newPhase,
      status: newStatus,
      timestamp: new Date(),
      comments: updateData.comments || '',
      userId: updateData.userId
    });
    
    // Save the updated BCR
    const updatedBcr = await bcr.save();
    
    return updatedBcr;
  } catch (error) {
    console.error('Error in updateBcrWorkflow:', error);
    throw error;
  }
};
