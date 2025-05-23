/**
 * Update BCR Submissions to Follow Workflow Order
 * 
 * This script updates all BCR submissions to follow the workflow order step by step,
 * starting from phase 1.
 * Run with: node scripts/update-bcr-workflow.js
 */
require('dotenv').config();
const { BcrConfig, Bcr } = require('../models');
require('../config/database.mongo');
const { v4: uuidv4 } = require('uuid');

/**
 * Update BCR submissions to follow workflow order
 */
async function updateBcrWorkflow() {
  try {
    console.log('Starting BCR workflow update...');
    
    // Get phases in order
    const phases = await BcrConfig.find({ type: 'phase' }).sort({ value: 1 });
    
    if (phases.length === 0) {
      console.error('No phases found in the database. Cannot update BCRs.');
      return;
    }
    
    console.log(`Found ${phases.length} phases in workflow order.`);
    
    // Get all statuses
    const allStatuses = await BcrConfig.find({ type: 'status' });
    
    // Create a mapping of phase IDs to their in-progress status
    const phaseToStatusMap = {};
    
    for (const phase of phases) {
      // Find in-progress status for this phase (not starting with 'completed:')
      const inProgressStatuses = allStatuses.filter(status => 
        status.value === phase.id && !status.name.startsWith('completed:')
      );
      
      if (inProgressStatuses.length > 0) {
        // Use the first in-progress status found
        phaseToStatusMap[phase.id] = inProgressStatuses[0].name;
      } else {
        console.warn(`No in-progress status found for phase ${phase.name} (${phase.id})`);
      }
    }
    
    console.log('Phase to Status mapping:');
    console.log(phaseToStatusMap);
    
    // Get all BCRs
    const bcrs = await Bcr.find();
    console.log(`Found ${bcrs.length} BCR submissions to update.`);
    
    // Distribute BCRs across phases
    for (let i = 0; i < bcrs.length; i++) {
      const bcr = bcrs[i];
      
      // Determine which phase this BCR should be in
      // Distribute evenly across phases, with more BCRs in earlier phases
      const phaseIndex = Math.min(i % phases.length, phases.length - 1);
      const phase = phases[phaseIndex];
      
      // Get the in-progress status for this phase
      const status = phaseToStatusMap[phase.id];
      
      if (!status) {
        console.warn(`Skipping BCR ${bcr.id} (${bcr.title}) - no status found for phase ${phase.name}`);
        continue;
      }
      
      // Update the BCR with the appropriate status and add phase info to notes
      const newStatus = mapPhaseToEnumStatus(phaseIndex, phases.length);
      await Bcr.findByIdAndUpdate(bcr._id, {
        status: newStatus,
        notes: `${bcr.notes || ''}\n\nCurrent Phase: ${phase.name}\nPhase Status: ${status}\nPhase Order: ${phase.value}`,
        updatedAt: new Date()
      }, { new: true });
      
      console.log(`Updated BCR ${bcr.bcrNumber} (${bcr.title}) to phase ${phase.name} with status info in notes`);
    }
    
    console.log('\nBCR workflow update completed!');
    
  } catch (error) {
    console.error('Error updating BCR workflow:', error);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Map phase index to enum_Bcrs_status values
 * @param {number} phaseIndex - Index of the phase in the workflow
 * @param {number} totalPhases - Total number of phases
 * @returns {string} - Status enum value
 */
function mapPhaseToEnumStatus(phaseIndex, totalPhases) {
  // Map phase index to one of the enum_Bcrs_status values
  // Early phases: draft, submitted
  // Middle phases: under_review
  // Later phases: approved, implemented
  
  const ratio = phaseIndex / (totalPhases - 1);
  
  if (ratio < 0.2) return 'draft';
  if (ratio < 0.4) return 'submitted';
  if (ratio < 0.7) return 'under_review';
  if (ratio < 0.9) return 'approved';
  return 'implemented';
}

// Run the update function
updateBcrWorkflow()
  .then(() => {
    console.log('Update script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Update script failed:', error);
    process.exit(1);
  });
