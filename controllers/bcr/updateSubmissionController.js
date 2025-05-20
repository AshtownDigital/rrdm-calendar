/**
 * Controller for updating BCR submission status
 * Handles updating the status and phase of a BCR submission
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Submit BCR update - Updates the BCR phase and status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function submitBCRUpdate(req, res) {
  try {
    console.log('Update BCR submission status controller called for ID:', req.params.id);
    console.log('Request body:', req.body);
    
    const submissionId = req.params.id;
    const { phaseId, comment, user, phaseCompleted } = req.body;
    
    // Validate required fields
    if (!comment || !user) {
      return res.status(400).render('error', {
        title: 'Error',
        message: 'Comment and user name are required fields.',
        error: {},
        user: req.user
      });
    }
    
    // Get the BCR to check if it exists
    let bcr = null;
    try {
      bcr = await prisma.Bcrs.findUnique({
        where: { id: submissionId }
      });
    } catch (error) {
      console.log('Error retrieving BCR:', error.message);
    }
    
    if (!bcr) {
      console.log(`BCR with ID ${submissionId} not found`);
      return res.status(404).render('error', {
        title: 'Not Found',
        message: `BCR with ID ${submissionId} not found. The BCR may have been deleted or the ID is incorrect.`,
        error: {},
        user: req.user
      });
    }
    
    // Handle special actions
    if (phaseId === 'reject') {
      // Create a rejection history entry
      const rejectionEntry = {
        action: 'Status Updated',
        date: new Date().toISOString(),
        user: user,
        notes: `BCR Rejected: ${comment}`,
        status: 'Rejected',
        completed: true
      };
      
      // Format the rejection entry as text
      const rejectionText = `\n\n--- WORKFLOW HISTORY ENTRY ---\nAction: ${rejectionEntry.action}\nDate: ${rejectionEntry.date}\nUser: ${rejectionEntry.user}\nStatus: ${rejectionEntry.status}\nNotes: ${rejectionEntry.notes}\nCompleted: Yes`;
      
      // Create notes for rejection
      const rejectionNotes = `${bcr.notes || ''}\n\nRejected by ${user} on ${new Date().toISOString()}: ${comment}${rejectionText}`;
      
      // Update BCR status to Rejected
      await prisma.Bcrs.update({
        where: { id: submissionId },
        data: {
          status: 'Rejected',
          notes: rejectionNotes,
          updatedAt: new Date()
        }
      });
      
      return res.redirect(`/direct/bcr-submissions/${submissionId}`);
    } else if (phaseId === 'complete') {
      // Create a completion history entry
      const completionEntry = {
        action: 'Status Updated',
        date: new Date().toISOString(),
        user: user,
        notes: `BCR Completed: ${comment}`,
        status: 'Completed',
        completed: true
      };
      
      // Format the completion entry as text
      const completionText = `\n\n--- WORKFLOW HISTORY ENTRY ---\nAction: ${completionEntry.action}\nDate: ${completionEntry.date}\nUser: ${completionEntry.user}\nStatus: ${completionEntry.status}\nNotes: ${completionEntry.notes}\nCompleted: Yes`;
      
      // Create notes for completion
      const completionNotes = `${bcr.notes || ''}\n\nCompleted by ${user} on ${new Date().toISOString()}: ${comment}${completionText}`;
      
      // Update BCR status to Completed
      await prisma.Bcrs.update({
        where: { id: submissionId },
        data: {
          status: 'Completed',
          notes: completionNotes,
          updatedAt: new Date()
        }
      });
      
      return res.redirect(`/direct/bcr-submissions/${submissionId}`);
    }
    
    // Get the phase details
    let phase = null;
    try {
      phase = await prisma.BcrConfigs.findFirst({
        where: { 
          type: 'phase',
          value: phaseId
        }
      });
    } catch (error) {
      console.log('Error retrieving phase:', error.message);
    }
    
    if (!phase) {
      return res.status(400).render('error', {
        title: 'Error',
        message: `Phase with ID ${phaseId} not found.`,
        error: {},
        user: req.user
      });
    }
    
    // Always find the correct status for the selected phase
    // Each phase has exactly one In Progress status and one Completed status
    let status = null;
    let phaseConfig = null;
    
    try {
      // First get the phase configuration
      phaseConfig = await prisma.BcrConfigs.findFirst({
        where: {
          type: 'phase',
          value: phaseId.toString()
        }
      });
      
      // Then find the appropriate status based on whether the phase is completed
      const statusType = phaseCompleted === 'true' ? `phase_${phaseId}_completed` : `phase_${phaseId}_in_progress`;
      status = await prisma.BcrConfigs.findFirst({
        where: {
          type: 'status',
          value: statusType
        }
      });
    } catch (error) {
      console.log('Error retrieving phase or status:', error.message);
    }
    
    // Ensure we have a valid status that aligns with the phase
    const statusValue = status ? status.value : `phase_${phaseId}_in_progress`;
    const statusName = status ? status.name : `Phase ${phaseId} ${phaseCompleted === 'true' ? 'Completed' : 'In Progress'}`;
    const phaseName = phaseConfig ? phaseConfig.name : `Phase ${phaseId}`;
    
    // Store the current phase ID in the notes since there's no dedicated field for it
    const phaseNote = `Current Phase: ${phaseId}`;
    const updatedNotes = `${bcr.notes || ''}\n\nUpdated by ${user} on ${new Date().toISOString()}: ${comment}\n${phaseNote}`;
    
    // Create a workflow history entry that reflects the aligned phase and status
    const historyEntry = {
      action: phaseCompleted === 'true' ? 'Phase Completed' : 'Phase Updated',
      date: new Date().toISOString(),
      user: user,
      notes: `Phase ${phaseId}: ${phaseName} - ${comment}`,
      status: statusName,
      completed: phaseCompleted === 'true'
    };
    
    // Format the history entry as text and add it to the notes
    const historyText = `\n\n--- WORKFLOW HISTORY ENTRY ---\nAction: ${historyEntry.action}\nDate: ${historyEntry.date}\nUser: ${historyEntry.user}\nStatus: ${historyEntry.status}\nNotes: ${historyEntry.notes}\nCompleted: ${historyEntry.completed ? 'Yes' : 'No'}`;
    
    // Combine the updated notes with the history entry
    const combinedNotes = updatedNotes + historyText;
    
    // Update the BCR with the new status and combined notes
    await prisma.Bcrs.update({
      where: { id: submissionId },
      data: {
        status: statusValue,
        notes: combinedNotes,
        updatedAt: new Date()
      }
    });
    
    // If phase is marked as completed, update the phase completion status
    if (phaseCompleted === 'true') {
      // First, find the completed status for the current phase
      let completedStatus = null;
      try {
        completedStatus = await prisma.BcrConfigs.findFirst({
          where: {
            type: 'status',
            value: `phase_${phaseId}_completed`
          }
        });
      } catch (error) {
        console.log('Error retrieving completed status:', error.message);
      }
      
      // Get the next phase
      const nextPhaseId = parseInt(phaseId) + 1;
      let nextPhase = null;
      let nextPhaseInProgressStatus = null;
      
      try {
        // Get the next phase
        nextPhase = await prisma.BcrConfigs.findFirst({
          where: { 
            type: 'phase',
            value: nextPhaseId.toString()
          }
        });
        
        // Get the in-progress status for the next phase
        if (nextPhase) {
          nextPhaseInProgressStatus = await prisma.BcrConfigs.findFirst({
            where: {
              type: 'status',
              value: `phase_${nextPhaseId}_in_progress`
            }
          });
        }
      } catch (error) {
        console.log('Error retrieving next phase or status:', error.message);
      }
      
      // First update with the completed status for the current phase
      const completedStatusValue = completedStatus ? completedStatus.value : `phase_${phaseId}_completed`;
      const completedStatusName = completedStatus ? completedStatus.name : `Phase ${phaseId} Completed`;
      
      // Create a phase completion history entry
      const completionEntry = {
        action: 'Phase Completed',
        date: new Date().toISOString(),
        user: user,
        notes: `Phase ${phaseId} completed with status: ${completedStatusName}`,
        status: completedStatusName,
        completed: true
      };
      
      // Format the completion entry as text
      const completionText = `\n\n--- WORKFLOW HISTORY ENTRY ---\nAction: ${completionEntry.action}\nDate: ${completionEntry.date}\nUser: ${completionEntry.user}\nStatus: ${completionEntry.status}\nNotes: ${completionEntry.notes}\nCompleted: Yes`;
      
      // Create notes for phase completion
      const completionNotes = `${bcr.notes || ''}\n\nPhase ${phaseId} completed by ${user} on ${new Date().toISOString()} with status: ${completedStatusName}${completionText}`;
      
      // Update with completed status
      await prisma.Bcrs.update({
        where: { id: submissionId },
        data: {
          status: completedStatusValue,
          notes: completionNotes,
          updatedAt: new Date()
        }
      });
      
      // If there's a next phase, move to it
      if (nextPhase && nextPhaseInProgressStatus) {
        // Create a phase transition history entry
        const transitionEntry = {
          action: 'Phase Transition',
          date: new Date().toISOString(),
          user: user,
          notes: `Moving to Phase ${nextPhaseId}: ${nextPhase.name}`,
          status: nextPhaseInProgressStatus.name,
          completed: false
        };
        
        // Format the transition entry as text
        const transitionText = `\n\n--- WORKFLOW HISTORY ENTRY ---\nAction: ${transitionEntry.action}\nDate: ${transitionEntry.date}\nUser: ${transitionEntry.user}\nStatus: ${transitionEntry.status}\nNotes: ${transitionEntry.notes}\nCompleted: No`;
        
        // Update notes to reflect the next phase
        const nextPhaseNote = `Current Phase: ${nextPhaseId}`;
        const transitionNotes = `${bcr.notes || ''}\n\nMoving to Phase ${nextPhaseId}: ${nextPhase.name} on ${new Date().toISOString()}\n${nextPhaseNote}${transitionText}`;
        
        // Update the BCR with the next phase information
        await prisma.Bcrs.update({
          where: { id: submissionId },
          data: {
            status: nextPhaseInProgressStatus.value,
            notes: transitionNotes,
            updatedAt: new Date()
          }
        });
      } else if (parseInt(phaseId) === 14) {
        // If this is the last phase, mark the BCR as completed
        // Add completion to workflow history
        workflowHistory.push({
          action: 'BCR Completed',
          date: new Date().toISOString(),
          user: user,
          notes: `All phases completed. BCR is now complete.`,
          status: 'Completed',
          completed: true
        });
        
        // Update the BCR with completion status and updated workflow history
        await prisma.Bcrs.update({
          where: { id: submissionId },
          data: {
            status: 'Completed',
            notes: `${bcr.notes || ''}\n\nAll phases completed. BCR marked as complete by ${user} on ${new Date().toISOString()}`,
            workflowHistory: workflowHistory,
            updatedAt: new Date()
          }
        });
      }
    }
    
    return res.redirect(`/direct/bcr-submissions/${submissionId}`);
  } catch (error) {
    console.error('Error in update BCR submission status controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An unexpected error occurred while trying to update the BCR submission status.',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
}

module.exports = {
  submitBCRUpdate,
  // Keep the old method name for backward compatibility
  updateSubmissionStatus: submitBCRUpdate
};
