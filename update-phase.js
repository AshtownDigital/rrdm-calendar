const fs = require('fs');
const path = require('path');

// Read the submissions data
const submissionsPath = path.join(__dirname, 'data/bcr/submissions.json');
const submissionsData = JSON.parse(fs.readFileSync(submissionsPath, 'utf8'));

// Find the BCR-2025-0001 submission
const submissionIndex = submissionsData.submissions.findIndex(s => s.id === 'BCR-2025-0001');

if (submissionIndex !== -1) {
  // Update the current phase to Phase 3
  submissionsData.submissions[submissionIndex].currentPhase = 'Technical and Business Impact Analysis - Impact Assessed';
  submissionsData.submissions[submissionIndex].currentPhaseId = 3;
  submissionsData.submissions[submissionIndex].status = 'Technical and Business Impact Review';
  
  // Add a history entry for this change
  if (!submissionsData.submissions[submissionIndex].history) {
    submissionsData.submissions[submissionIndex].history = [];
  }
  
  submissionsData.submissions[submissionIndex].history.push({
    date: new Date().toISOString(),
    action: 'Phase Updated',
    user: 'System',
    notes: 'Updated to Phase 3: Technical and Business Impact Analysis - Impact Assessed'
  });
  
  // Write the updated data back to the file
  fs.writeFileSync(submissionsPath, JSON.stringify(submissionsData, null, 2));
  console.log('Successfully updated BCR-2025-0001 to Phase 3');
} else {
  console.log('BCR-2025-0001 not found in submissions data');
}
